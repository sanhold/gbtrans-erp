/**
 * Espace super-admin de la plateforme (vous) : vue d'ensemble des societes clientes et
 * de leur abonnement. Volontairement minimal pour cette premiere version — pas encore
 * d'interface dediee cote frontend, a construire dans une prochaine etape.
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { creerComptesTest } from '../../utils/comptesTest';
import { AuthService } from '../auth/auth.service';
import { config } from '../../config';
import { ApiResponse } from '../../utils/apiResponse';
import { invaliderSociete } from '../../utils/cacheMemoire';
import { MODULES, chiffrerChamps, dechiffrerChamps, champsConfigures } from './fournisseurs/registry';
import { estimerTailleParTable } from '../../utils/tablesSocietes';
import { envoyerEmail, emailPlateformeConfigure } from '../../utils/email';
import { logger } from '../../utils/logger';

const router = Router();

interface PlatformRequest extends Request {
  platformAdminId?: string;
  platformAdminEmail?: string;
  platformSuperAdmin?: boolean;
}

async function authenticatePlatform(req: PlatformRequest, res: Response, next: () => void) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) { ApiResponse.unauthorized(res, 'Token manquant'); return; }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret) as any;
    if (payload.type !== 'platform') { ApiResponse.unauthorized(res, 'Token invalide'); return; }
    const admin = await prisma.platformAdmin.findUnique({ where: { id: payload.id } });
    if (!admin || !admin.actif) { ApiResponse.unauthorized(res, 'Accès refusé'); return; }
    req.platformAdminId = admin.id;
    req.platformAdminEmail = admin.email;
    req.platformSuperAdmin = admin.superAdmin;
    next();
  } catch {
    ApiResponse.unauthorized(res, 'Token invalide ou expiré');
  }
}

/** Les comptes non super-admin (ex: compte de demonstration) ne peuvent que consulter. */
function requireSuperAdmin(req: PlatformRequest, res: Response, next: () => void) {
  if (!req.platformSuperAdmin) { ApiResponse.unauthorized(res, "Ce compte est en lecture seule : action reservee a l'administrateur principal"); return; }
  next();
}

/** Trace une action sensible dans le journal d'activite de la plateforme (best-effort). */
async function tracerActivite(req: PlatformRequest, action: string, cibleType?: string, cibleId?: string, details?: any) {
  try {
    await prisma.platformAuditLog.create({
      data: {
        platformAdminId: req.platformAdminId || null,
        adminEmail: req.platformAdminEmail || 'inconnu',
        action, cibleType, cibleId,
        details: details ?? undefined,
      },
    });
  } catch {
    // Le journal ne doit jamais faire echouer l'action elle-meme.
  }
}

// ===== MOT DE PASSE OUBLIÉ (administrateurs de la plateforme) =====

const DUREE_JETON_RESET_MS = 60 * 60 * 1000; // 1 heure
const MESSAGE_RESET = "Si cette adresse correspond à un compte de la plateforme, un e-mail contenant un lien de réinitialisation (valable 1 heure) vient d'être envoyé.";
const empreinte = (jeton: string) => crypto.createHash('sha256').update(jeton).digest('hex');
/** Même politique que les comptes des sociétés : 8 caractères minimum, majuscule, minuscule, chiffre, caractère spécial. */
const motDePasseValide = (m: string) => m.length >= 8 && /[A-Z]/.test(m) && /[a-z]/.test(m) && /[0-9]/.test(m) && /[^A-Za-z0-9]/.test(m);
/** L'adresse du lien vient de la configuration serveur, jamais d'un en-tête de la requête (anti-détournement du lien). */
const urlFrontend = () => (process.env.FRONTEND_URL || config.cors.origin[0] || '').replace(/\/$/, '');

router.post('/mot-de-passe-oublie', async (req: Request, res: Response) => {
  // Réglage global du serveur (ne révèle rien sur les comptes) : mieux vaut le dire clairement à l'opérateur.
  if (!emailPlateformeConfigure() || !urlFrontend()) {
    ApiResponse.error(res, "L'envoi d'e-mails n'est pas configuré sur le serveur. Contactez l'administrateur technique.", 503); return;
  }
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (email && email.length <= 200) {
      const admin = await prisma.platformAdmin.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, actif: true } });
      if (admin) {
        const jeton = crypto.randomBytes(32).toString('hex');
        await prisma.platformAdmin.update({
          where: { id: admin.id },
          data: { tokenResetHash: empreinte(jeton), tokenResetExpire: new Date(Date.now() + DUREE_JETON_RESET_MS) },
        });
        const lien = `${urlFrontend()}/admin/reinitialiser?token=${jeton}`;
        try {
          await envoyerEmail({
            destinataire: admin.email,
            sujet: 'GBTrans — Réinitialisation de votre mot de passe',
            texte: `Bonjour ${admin.prenom},\n\nUne réinitialisation du mot de passe de votre compte Administration GBTrans a été demandée.\n\nPour choisir un nouveau mot de passe (lien valable 1 heure, utilisable une seule fois) :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.\n`,
          });
        } catch (e: any) {
          logger.error(`Envoi du lien de réinitialisation impossible : ${e.message}`);
        }
      }
    }
    // Même réponse que le compte existe ou non (pas d'énumération des comptes).
    ApiResponse.success(res, null, MESSAGE_RESET);
  } catch (e: any) {
    logger.error(`Mot de passe oublié (plateforme) : ${e.message}`);
    ApiResponse.success(res, null, MESSAGE_RESET);
  }
});

router.post('/reinitialiser-mot-de-passe', async (req: Request, res: Response) => {
  try {
    const jeton = String(req.body?.token || '');
    const nouveau = String(req.body?.nouveauMotDePasse || '');
    if (!/^[0-9a-f]{64}$/.test(jeton)) { ApiResponse.badRequest(res, 'Lien invalide ou expiré'); return; }
    if (!motDePasseValide(nouveau)) {
      ApiResponse.badRequest(res, 'Le mot de passe doit contenir au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial'); return;
    }
    const admin = await prisma.platformAdmin.findFirst({
      where: { tokenResetHash: empreinte(jeton), tokenResetExpire: { gt: new Date() }, actif: true },
    });
    if (!admin) { ApiResponse.badRequest(res, 'Lien invalide ou expiré'); return; }
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      // Le jeton est à usage unique : effacé dès qu'il a servi.
      data: { motDePasse: await bcrypt.hash(nouveau, 12), tokenResetHash: null, tokenResetExpire: null },
    });
    await tracerActivite({ platformAdminId: admin.id, platformAdminEmail: admin.email } as PlatformRequest, 'MOT_DE_PASSE_REINITIALISE', 'PlatformAdmin', admin.id);
    ApiResponse.success(res, null, 'Mot de passe modifié. Vous pouvez vous connecter.');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, motDePasse } = req.body;
    const admin = await prisma.platformAdmin.findUnique({ where: { email } });
    if (!admin || !admin.actif || !(await bcrypt.compare(motDePasse || '', admin.motDePasse))) {
      ApiResponse.unauthorized(res, 'Identifiants incorrects'); return;
    }
    const token = jwt.sign({ id: admin.id, type: 'platform' }, config.jwt.secret, { expiresIn: '12h' });
    ApiResponse.success(res, { token, admin: { id: admin.id, nom: admin.nom, prenom: admin.prenom, email: admin.email, superAdmin: admin.superAdmin } });
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Champs volontairement exclus (jamais renvoyes a l'espace super-admin) : logo, signature,
// mentionLegale (lourds, inutiles ici) et surtout smtpHost/smtpUser/smtpPass (identifiants
// de messagerie du client, sensibles — ne doivent jamais transiter par cette liste).
const SOCIETE_CHAMPS_ADMIN = {
  id: true, code: true, raisonSociale: true, formeJuridique: true, rccm: true, ncc: true,
  ville: true, pays: true, telephone: true, email: true, siteWeb: true, devise: true,
  sousDomaine: true, actif: true, createdAt: true,
};

router.get('/societes', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const societes = await prisma.societe.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        ...SOCIETE_CHAMPS_ADMIN,
        abonnement: { include: { plan: { select: { nom: true, code: true } } } },
        _count: { select: { utilisateurs: true, dossiers: true } },
      },
    });
    ApiResponse.success(res, societes);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.patch('/societes/:id/abonnement', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const { statut, dateFin } = req.body as { statut?: string; dateFin?: string };
    const abonnement = await prisma.abonnement.findUnique({ where: { societeId: req.params.id } });
    if (!abonnement) { ApiResponse.notFound(res, 'Abonnement introuvable'); return; }
    const updated = await prisma.abonnement.update({
      where: { id: abonnement.id },
      data: { ...(statut && { statut: statut as any }), ...(dateFin && { dateFin: new Date(dateFin) }) },
    });
    invaliderSociete(req.params.id, 'abonnement:');
    await tracerActivite(req, 'ABONNEMENT_MODIFIE', 'Societe', req.params.id, { statut, dateFin, ancienStatut: abonnement.statut });
    ApiResponse.success(res, updated, 'Abonnement mis à jour manuellement');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/societes/:id/prolonger-essai', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const jours = parseInt(req.body?.jours) || 7;
    const abonnement = await prisma.abonnement.findUnique({ where: { societeId: req.params.id } });
    if (!abonnement) { ApiResponse.notFound(res, 'Abonnement introuvable'); return; }
    const base = abonnement.dateFinEssai && abonnement.dateFinEssai > new Date() ? abonnement.dateFinEssai : new Date();
    const nouvelleDate = new Date(base.getTime() + jours * 24 * 60 * 60 * 1000);
    const updated = await prisma.abonnement.update({
      where: { id: abonnement.id },
      data: { dateFinEssai: nouvelleDate, dateProchainPaiement: nouvelleDate, ...(abonnement.statut === 'EXPIRE' && { statut: 'ESSAI' }) },
    });
    invaliderSociete(req.params.id, 'abonnement:');
    await tracerActivite(req, 'ESSAI_PROLONGE', 'Societe', req.params.id, { jours, nouvelleDate });
    ApiResponse.success(res, updated, `Essai prolongé de ${jours} jour(s)`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/societes/:id/relancer', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const societe = await prisma.societe.findUnique({ where: { id: req.params.id }, select: { raisonSociale: true, email: true } });
    if (!societe) { ApiResponse.notFound(res); return; }
    if (!societe.email) { ApiResponse.badRequest(res, 'Cette société n\'a pas d\'email enregistré'); return; }
    await tracerActivite(req, 'RELANCE_ENVOYEE', 'Societe', req.params.id, { email: societe.email });
    ApiResponse.success(res, { email: societe.email, raisonSociale: societe.raisonSociale }, 'Relance enregistrée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

/**
 * Crée / met à jour les 5 comptes de test (un par profil) d'une société. Réservé au super-admin ;
 * le mot de passe est envoyé dans le corps de la requête et n'est ni journalisé ni renvoyé.
 */
router.post('/societes/:id/comptes-test', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const motDePasse = typeof req.body?.motDePasse === 'string' ? req.body.motDePasse : '';
    if (motDePasse.length < 8) { ApiResponse.badRequest(res, 'Le mot de passe doit comporter au moins 8 caractères'); return; }
    const societe = await prisma.societe.findUnique({ where: { id: req.params.id }, select: { id: true, code: true } });
    if (!societe) { ApiResponse.notFound(res, 'Société introuvable'); return; }
    const resultat = await creerComptesTest(prisma, societe, motDePasse);
    await tracerActivite(req, 'COMPTES_TEST_CREES', 'Societe', societe.id, { prets: resultat.prets.map(c => c.email), ignores: resultat.ignores });
    ApiResponse.success(res, resultat, `${resultat.prets.length} compte(s) de test prêt(s)`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

/**
 * « Se connecter en tant que » : le super-admin ouvre une session applicative pour un utilisateur d'une
 * société, sans connaître son mot de passe (support, tests). Action tracée dans le journal d'audit.
 */
router.post('/societes/:id/utilisateurs/:userId/connexion', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const utilisateur = await prisma.utilisateur.findFirst({
      where: { id: req.params.userId, societeId: req.params.id },
      select: { id: true, email: true, actif: true },
    });
    if (!utilisateur) { ApiResponse.notFound(res, 'Utilisateur introuvable dans cette société'); return; }
    if (!utilisateur.actif) { ApiResponse.badRequest(res, 'Ce compte est désactivé'); return; }
    const session = await new AuthService().ouvrirSessionPour(
      utilisateur.id,
      req.ip,
      `[super-admin ${req.platformAdminEmail || 'inconnu'}] ${req.headers['user-agent'] || ''}`.slice(0, 250)
    );
    await tracerActivite(req, 'CONNEXION_EN_TANT_QUE', 'Utilisateur', utilisateur.id, { email: utilisateur.email, societeId: req.params.id });
    ApiResponse.success(res, session, `Session ouverte pour ${utilisateur.email}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.get('/societes/:id', authenticatePlatform, async (req: Request, res: Response) => {
  try {
    const societe = await prisma.societe.findUnique({
      where: { id: req.params.id },
      select: {
        ...SOCIETE_CHAMPS_ADMIN,
        abonnement: { include: { plan: true } },
        utilisateurs: { select: { id: true, nom: true, prenom: true, email: true, actif: true, derniereConnexion: true, profil: { select: { nom: true } } }, orderBy: { createdAt: 'asc' } },
        _count: { select: { utilisateurs: true, dossiers: true } },
      },
    });
    if (!societe) { ApiResponse.notFound(res); return; }
    const paiements = await prisma.paiementAbonnement.findMany({
      where: { societeId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    ApiResponse.success(res, { ...societe, paiements });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/plans', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { ordre: 'asc' } });
    ApiResponse.success(res, plans);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/plans/:id', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const { nom, description, prixMensuel, prixAnnuel, maxUtilisateurs, maxDossiersParMois, fonctionnalites, essaiJours, misEnAvant, ordre, actif, backupFrequenceMinJours } = req.body;
    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(description !== undefined && { description }),
        ...(prixMensuel !== undefined && { prixMensuel }),
        ...(prixAnnuel !== undefined && { prixAnnuel }),
        ...(maxUtilisateurs !== undefined && { maxUtilisateurs }),
        ...(maxDossiersParMois !== undefined && { maxDossiersParMois }),
        ...(fonctionnalites !== undefined && { fonctionnalites }),
        ...(essaiJours !== undefined && { essaiJours }),
        ...(misEnAvant !== undefined && { misEnAvant }),
        ...(ordre !== undefined && { ordre }),
        ...(actif !== undefined && { actif }),
        ...(backupFrequenceMinJours !== undefined && { backupFrequenceMinJours: parseInt(backupFrequenceMinJours) }),
      },
    });
    invaliderSociete('_global', 'vitrine');
    await tracerActivite(req, 'FORMULE_MODIFIEE', 'Plan', req.params.id, { nom });
    ApiResponse.success(res, plan, 'Formule modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== Paiements d'abonnement (toutes societes) =====

router.get('/paiements', authenticatePlatform, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', statut, societeId } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      ...(statut && { statut: statut as any }),
      ...(societeId && { societeId }),
    };
    const [data, total] = await Promise.all([
      prisma.paiementAbonnement.findMany({
        where, skip, take: Math.min(parseInt(limit) || 20, 100),
        orderBy: { createdAt: 'desc' },
        include: {
          societe: { select: { id: true, raisonSociale: true } },
          abonnement: { select: { plan: { select: { nom: true, code: true } } } },
        },
      }),
      prisma.paiementAbonnement.count({ where }),
    ]);
    ApiResponse.success(res, { data, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== Tresorerie / revenus SaaS =====

router.get('/tresorerie', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const [caTotalAgg, abonnementsActifs, parPlan, paiementsRecents] = await Promise.all([
      prisma.paiementAbonnement.aggregate({ where: { statut: 'REUSSI' }, _sum: { montant: true }, _count: true }),
      prisma.abonnement.findMany({
        where: { statut: { in: ['ACTIF', 'ESSAI', 'IMPAYE'] } },
        select: { statut: true, periodicite: true, plan: { select: { nom: true, prixMensuel: true, prixAnnuel: true } } },
      }),
      prisma.abonnement.groupBy({ by: ['planId'], _count: true }),
      prisma.paiementAbonnement.findMany({
        where: { statut: 'REUSSI' },
        orderBy: { datePaiement: 'desc' },
        take: 10,
        include: { societe: { select: { raisonSociale: true } }, abonnement: { select: { plan: { select: { nom: true } } } } },
      }),
    ]);

    // MRR : on ramene chaque abonnement actif/essai/impaye a son equivalent mensuel.
    const mrr = abonnementsActifs.reduce((s, a) => {
      if (a.statut === 'ESSAI') return s; // pas encore facture
      const mensuel = a.periodicite === 'ANNUEL' ? Number(a.plan.prixAnnuel ?? a.plan.prixMensuel) / 12 : Number(a.plan.prixMensuel);
      return s + mensuel;
    }, 0);

    const plans = await prisma.plan.findMany({ select: { id: true, nom: true } });
    const nomPlan = new Map(plans.map(p => [p.id, p.nom]));
    const repartitionParPlan = parPlan.map(p => ({ plan: nomPlan.get(p.planId) || 'Inconnu', nbAbonnements: p._count }));

    ApiResponse.success(res, {
      caTotalEncaisse: Number(caTotalAgg._sum.montant || 0),
      nbPaiementsReussis: caTotalAgg._count,
      mrr: Math.round(mrr),
      nbAbonnementsActifs: abonnementsActifs.filter(a => a.statut === 'ACTIF').length,
      nbEnEssai: abonnementsActifs.filter(a => a.statut === 'ESSAI').length,
      nbImpayes: abonnementsActifs.filter(a => a.statut === 'IMPAYE').length,
      repartitionParPlan,
      paiementsRecents,
    });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== Comptes administrateurs de la plateforme =====

router.get('/admins', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.platformAdmin.findMany({
      select: { id: true, email: true, nom: true, prenom: true, superAdmin: true, actif: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    ApiResponse.success(res, admins);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/admins', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const { email, motDePasse, nom, prenom, superAdmin } = req.body;
    if (!email || !motDePasse || !nom || !prenom) { ApiResponse.badRequest(res, 'Tous les champs sont requis'); return; }
    if (motDePasse.length < 8) { ApiResponse.badRequest(res, 'Le mot de passe doit comporter au moins 8 caractères'); return; }
    const existe = await prisma.platformAdmin.findUnique({ where: { email } });
    if (existe) { ApiResponse.badRequest(res, 'Un compte existe déjà avec cet email'); return; }
    const motDePasseHash = await bcrypt.hash(motDePasse, 12);
    const admin = await prisma.platformAdmin.create({
      data: { email, motDePasse: motDePasseHash, nom, prenom, superAdmin: superAdmin !== false },
      select: { id: true, email: true, nom: true, prenom: true, superAdmin: true, actif: true, createdAt: true },
    });
    await tracerActivite(req, 'COMPTE_ADMIN_CREE', 'PlatformAdmin', admin.id, { email, superAdmin: admin.superAdmin });
    ApiResponse.created(res, admin, 'Compte créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/admins/:id/statut', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const existing = await prisma.platformAdmin.findUnique({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.id === req.platformAdminId) { ApiResponse.badRequest(res, 'Vous ne pouvez pas désactiver votre propre compte'); return; }
    const admin = await prisma.platformAdmin.update({
      where: { id: req.params.id },
      data: { actif: !existing.actif },
      select: { id: true, email: true, nom: true, prenom: true, superAdmin: true, actif: true, createdAt: true },
    });
    await tracerActivite(req, admin.actif ? 'COMPTE_ADMIN_ACTIVE' : 'COMPTE_ADMIN_DESACTIVE', 'PlatformAdmin', admin.id, { email: admin.email });
    ApiResponse.success(res, admin, admin.actif ? 'Compte activé' : 'Compte désactivé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/admins/:id', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const existing = await prisma.platformAdmin.findUnique({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.id === req.platformAdminId) { ApiResponse.badRequest(res, 'Vous ne pouvez pas supprimer votre propre compte'); return; }
    const nbSuperAdmins = await prisma.platformAdmin.count({ where: { superAdmin: true, actif: true } });
    if (existing.superAdmin && nbSuperAdmins <= 1) { ApiResponse.badRequest(res, 'Impossible de supprimer le dernier compte super-admin actif'); return; }
    await prisma.platformAdmin.delete({ where: { id: req.params.id } });
    await tracerActivite(req, 'COMPTE_ADMIN_SUPPRIME', 'PlatformAdmin', req.params.id, { email: existing.email });
    ApiResponse.success(res, null, 'Compte supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== Fournisseurs de paiement (plusieurs possibles, un seul actif a la fois) =====
// Les cles API sont chiffrees en base (AES-256-GCM, cf. utils/secretCrypto.ts) et ne sont
// JAMAIS renvoyees en clair par l'API : seul un booleen "configure" par champ est expose.

router.get('/fournisseurs-paiement', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.fournisseurPaiement.findMany({ orderBy: { ordre: 'asc' } });
    const resultat = rows.map(row => {
      const module = MODULES[row.code];
      const champsDechiffres = dechiffrerChamps(row.champs);
      return {
        code: row.code,
        nom: row.nom,
        actif: row.actif,
        champs: module?.CHAMPS.map(c => ({ cle: c.cle, label: c.label, obligatoire: c.obligatoire, secret: c.secret, renseigne: !!champsDechiffres[c.cle] })) || [],
        correspondants: module?.CORRESPONDANTS || [],
        configure: module ? champsConfigures(module.CHAMPS, champsDechiffres) : false,
      };
    });
    ApiResponse.success(res, resultat);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/fournisseurs-paiement/:code', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const code = req.params.code.toUpperCase();
    const module = MODULES[code];
    if (!module) { ApiResponse.badRequest(res, 'Fournisseur inconnu'); return; }
    const row = await prisma.fournisseurPaiement.findUnique({ where: { code } });
    if (!row) { ApiResponse.notFound(res, 'Fournisseur introuvable'); return; }

    const { champs, actif } = req.body as { champs?: Record<string, string>; actif?: boolean };

    const champsExistants = dechiffrerChamps(row.champs);
    const champsFusionnes = { ...champsExistants, ...(champs || {}) };
    // Un champ envoye vide efface la valeur existante (permet de "vider" une cle sans la remplacer).
    for (const [cle, valeur] of Object.entries(champs || {})) if (valeur === '') delete champsFusionnes[cle];

    await prisma.$transaction(async (tx) => {
      await tx.fournisseurPaiement.update({
        where: { code },
        data: { champs: chiffrerChamps(champsFusionnes) as any },
      });
      if (actif === true) {
        // Un seul fournisseur actif a la fois : on desactive tous les autres.
        await tx.fournisseurPaiement.updateMany({ where: { code: { not: code } }, data: { actif: false } });
        await tx.fournisseurPaiement.update({ where: { code }, data: { actif: true } });
      } else if (actif === false) {
        await tx.fournisseurPaiement.update({ where: { code }, data: { actif: false } });
      }
    });

    await tracerActivite(req, 'FOURNISSEUR_PAIEMENT_MODIFIE', 'FournisseurPaiement', code, { actif, champsModifies: Object.keys(champs || {}) });
    const updated = await prisma.fournisseurPaiement.findUnique({ where: { code } });
    ApiResponse.success(res, { code: updated!.code, nom: updated!.nom, actif: updated!.actif }, 'Fournisseur mis à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== Contenu de la vitrine publique =====

router.get('/contenu-vitrine', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const contenu = await prisma.contenuVitrine.findFirst();
    ApiResponse.success(res, contenu);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/contenu-vitrine', authenticatePlatform, requireSuperAdmin, async (req: PlatformRequest, res: Response) => {
  try {
    const { heroBadge, heroTitre, heroSousTitre, tarifsTitre, tarifsSousTitre, faq } = req.body;
    const existant = await prisma.contenuVitrine.findFirst();
    const data = {
      ...(heroBadge !== undefined && { heroBadge }),
      ...(heroTitre !== undefined && { heroTitre }),
      ...(heroSousTitre !== undefined && { heroSousTitre }),
      ...(tarifsTitre !== undefined && { tarifsTitre }),
      ...(tarifsSousTitre !== undefined && { tarifsSousTitre }),
      ...(faq !== undefined && { faq }),
    };
    const contenu = existant
      ? await prisma.contenuVitrine.update({ where: { id: existant.id }, data })
      : await prisma.contenuVitrine.create({ data });
    invaliderSociete('_global', 'vitrine');
    await tracerActivite(req, 'VITRINE_MODIFIEE', 'ContenuVitrine', contenu.id);
    ApiResponse.success(res, contenu, 'Contenu mis à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== Taille de la base de donnees =====
// Base unique partagee par toutes les societes (isolation par donnees, pas par base physique) :
// la taille totale est exacte (Postgres), la repartition par societe est une estimation
// (poids des lignes des principales tables, hors index — cf. utils/tablesSocietes.ts).

router.get('/db-taille', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const totalRow: any[] = await prisma.$queryRawUnsafe(`SELECT pg_database_size(current_database())::bigint AS octets`);
    const totalOctets = Number(totalRow?.[0]?.octets || 0);

    const societes = await prisma.societe.findMany({ where: { actif: true }, select: { id: true, raisonSociale: true } });
    const parSociete = [];
    for (const s of societes) {
      const parTable = await estimerTailleParTable(s.id);
      const octets = parTable.reduce((sum, t) => sum + t.octets, 0);
      parSociete.push({ societeId: s.id, raisonSociale: s.raisonSociale, octetsEstimes: octets });
    }
    parSociete.sort((a, b) => b.octetsEstimes - a.octetsEstimes);

    ApiResponse.success(res, { totalOctets, parSociete });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== Journal d'activite =====

router.get('/audit-log', authenticatePlatform, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '30' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: Math.min(parseInt(limit) || 20, 100) }),
      prisma.platformAuditLog.count(),
    ]);
    ApiResponse.success(res, { data, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;
