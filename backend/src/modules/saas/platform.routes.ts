/**
 * Espace super-admin de la plateforme (vous) : vue d'ensemble des societes clientes et
 * de leur abonnement. Volontairement minimal pour cette premiere version — pas encore
 * d'interface dediee cote frontend, a construire dans une prochaine etape.
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { config } from '../../config';
import { ApiResponse } from '../../utils/apiResponse';
import { PAWAPAY_CONFIGURE, CORRESPONDANTS_CIV } from './pawapay.service';

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
    await tracerActivite(req, 'ESSAI_PROLONGE', 'Societe', req.params.id, { jours, nouvelleDate });
    ApiResponse.success(res, updated, `Essai prolongé de ${jours} jour(s)`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/societes/:id/relancer', authenticatePlatform, async (req: PlatformRequest, res: Response) => {
  try {
    const societe = await prisma.societe.findUnique({ where: { id: req.params.id }, select: { raisonSociale: true, email: true } });
    if (!societe) { ApiResponse.notFound(res); return; }
    if (!societe.email) { ApiResponse.badRequest(res, 'Cette société n\'a pas d\'email enregistré'); return; }
    await tracerActivite(req, 'RELANCE_ENVOYEE', 'Societe', req.params.id, { email: societe.email });
    ApiResponse.success(res, { email: societe.email, raisonSociale: societe.raisonSociale }, 'Relance enregistrée');
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
    const { nom, description, prixMensuel, prixAnnuel, maxUtilisateurs, maxDossiersParMois, fonctionnalites, essaiJours, misEnAvant, ordre, actif } = req.body;
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
      },
    });
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
        where, skip, take: parseInt(limit),
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

// ===== Statut PawaPay (lecture seule - aucun secret transmis) =====

router.get('/pawapay-status', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    ApiResponse.success(res, {
      configure: PAWAPAY_CONFIGURE,
      baseUrl: process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io (défaut, non configuré)',
      mode: (process.env.PAWAPAY_BASE_URL || '').includes('sandbox') || !process.env.PAWAPAY_BASE_URL ? 'TEST' : 'PRODUCTION',
      correspondants: CORRESPONDANTS_CIV,
    });
  } catch (e: any) { ApiResponse.error(res, e.message); }
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
    await tracerActivite(req, 'VITRINE_MODIFIEE', 'ContenuVitrine', contenu.id);
    ApiResponse.success(res, contenu, 'Contenu mis à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== Journal d'activite =====

router.get('/audit-log', authenticatePlatform, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '30' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.platformAuditLog.count(),
    ]);
    ApiResponse.success(res, { data, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;
