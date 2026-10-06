import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { ApiResponse } from '../../utils/apiResponse';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { initierDepot, statutDepot, nouvelIdentifiantDepot, CORRESPONDANTS_CIV, PAWAPAY_CONFIGURE } from './pawapay.service';
import { creerProfilsDefautPourSociete } from '../../utils/profilsDefaut';

const router = Router();

const SLUG_RE = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;
const SLUGS_RESERVES = ['www', 'api', 'app', 'admin', 'platform', 'mail', 'ftp', 'cdn', 'static', 'gbtrans'];

function slugify(v: string): string {
  return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

// ===== Formules (public) =====

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({ where: { actif: true }, orderBy: { ordre: 'asc' } });
    ApiResponse.success(res, plans);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/sous-domaine-disponible', async (req: Request, res: Response) => {
  try {
    const valeur = slugify(String(req.query.valeur || ''));
    if (!SLUG_RE.test(valeur)) { ApiResponse.success(res, { disponible: false, valeur, raison: 'Format invalide (lettres, chiffres, tirets, 3 à 32 caractères)' }); return; }
    if (SLUGS_RESERVES.includes(valeur)) { ApiResponse.success(res, { disponible: false, valeur, raison: 'Réservé' }); return; }
    const existe = await prisma.societe.findUnique({ where: { sousDomaine: valeur } });
    ApiResponse.success(res, { disponible: !existe, valeur });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== Inscription en libre-service (public) =====

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/inscription', async (req: Request, res: Response) => {
  try {
    const { raisonSociale, email, motDePasse, nom, prenom, telephone, sousDomaine, planCode, periodicite } = req.body;
    if (!raisonSociale || !email || !motDePasse || !nom || !prenom || !sousDomaine || !planCode) {
      ApiResponse.badRequest(res, 'Tous les champs sont requis'); return;
    }
    if (!EMAIL_RE.test(email)) { ApiResponse.badRequest(res, 'Adresse email invalide'); return; }
    if (motDePasse.length < 8 || !/[A-Za-z]/.test(motDePasse) || !/[0-9]/.test(motDePasse)) {
      ApiResponse.badRequest(res, 'Le mot de passe doit comporter au moins 8 caractères, avec au moins une lettre et un chiffre'); return;
    }
    const periodiciteValide = periodicite === 'ANNUEL' ? 'ANNUEL' : 'MENSUEL';

    const slug = slugify(sousDomaine);
    if (!SLUG_RE.test(slug) || SLUGS_RESERVES.includes(slug)) { ApiResponse.badRequest(res, 'Sous-domaine invalide ou réservé'); return; }

    const [sousDomaineExiste, emailExiste, plan] = await Promise.all([
      prisma.societe.findUnique({ where: { sousDomaine: slug } }),
      prisma.utilisateur.findUnique({ where: { email } }),
      prisma.plan.findFirst({ where: { code: planCode, actif: true } }),
    ]);
    if (sousDomaineExiste) { ApiResponse.badRequest(res, 'Ce sous-domaine est déjà pris'); return; }
    if (emailExiste) { ApiResponse.badRequest(res, 'Un compte existe déjà avec cet email'); return; }
    if (!plan) { ApiResponse.badRequest(res, 'Formule introuvable'); return; }

    let code = slug.toUpperCase().slice(0, 20);
    if (await prisma.societe.findUnique({ where: { code } })) code = `${code.slice(0, 16)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const motDePasseHash = await bcrypt.hash(motDePasse, 12);
    const maintenant = new Date();
    const finEssai = new Date(maintenant.getTime() + plan.essaiJours * 24 * 60 * 60 * 1000);

    const resultat = await prisma.$transaction(async (tx) => {
      const societe = await tx.societe.create({
        data: { code, raisonSociale, email, telephone, sousDomaine: slug },
      });
      // Chaque societe recoit son propre jeu de profils (Admin/Transitaire/Comptable/...),
      // independant des autres societes du SaaS : modifier un profil ici n'affecte plus
      // personne d'autre (cf. migration 037_profil_societe_id).
      const { profilAdmin } = await creerProfilsDefautPourSociete(tx, societe.id);
      const utilisateur = await tx.utilisateur.create({
        data: {
          societeId: societe.id, matricule: 'ADM001', nom, prenom, email, telephone,
          motDePasse: motDePasseHash, profilId: profilAdmin.id,
        },
      });
      const abonnement = await tx.abonnement.create({
        data: {
          societeId: societe.id, planId: plan.id, statut: 'ESSAI', periodicite: periodiciteValide,
          dateDebut: maintenant, dateFinEssai: finEssai, dateProchainPaiement: finEssai,
        },
      });
      return { societe, utilisateur, abonnement };
    });

    ApiResponse.created(res, {
      societe: { id: resultat.societe.id, raisonSociale: resultat.societe.raisonSociale, sousDomaine: resultat.societe.sousDomaine },
      essaiJusquau: finEssai,
    }, `Compte créé. Votre essai gratuit de ${plan.essaiJours} jours a commencé.`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== Abonnement de la societe courante (authentifie) =====

router.get('/abonnement', authenticate, requireSociete, async (req: AuthRequest, res: Response) => {
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { societeId: req.user!.societeId },
      include: { plan: true, paiements: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!abonnement) { ApiResponse.notFound(res, 'Aucun abonnement trouvé pour cette société'); return; }
    const nbUtilisateurs = await prisma.utilisateur.count({ where: { societeId: req.user!.societeId, actif: true } });
    ApiResponse.success(res, { ...abonnement, nbUtilisateursActifs: nbUtilisateurs });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/correspondants', (_req: Request, res: Response) => {
  ApiResponse.success(res, { configure: PAWAPAY_CONFIGURE, correspondants: CORRESPONDANTS_CIV });
});

router.post('/abonnement/paiement', authenticate, requireSociete, async (req: AuthRequest, res: Response) => {
  try {
    const { correspondant, telephone } = req.body as { correspondant?: string; telephone?: string };
    if (!correspondant || !telephone) { ApiResponse.badRequest(res, 'Opérateur et numéro de téléphone requis'); return; }

    const abonnement = await prisma.abonnement.findUnique({ where: { societeId: req.user!.societeId }, include: { plan: true } });
    if (!abonnement) { ApiResponse.notFound(res, 'Abonnement introuvable'); return; }

    const montant = abonnement.periodicite === 'ANNUEL' ? Number(abonnement.plan.prixAnnuel ?? abonnement.plan.prixMensuel) : Number(abonnement.plan.prixMensuel);
    const depositId = nouvelIdentifiantDepot();

    const paiement = await prisma.paiementAbonnement.create({
      data: {
        abonnementId: abonnement.id, societeId: req.user!.societeId, montant, devise: abonnement.plan.devise,
        statut: 'EN_ATTENTE', fournisseur: 'PAWAPAY', referenceExterne: depositId, moyenPaiement: correspondant, numeroTelephone: telephone,
      },
    });

    try {
      const reponse = await initierDepot({
        depositId, montant, devise: abonnement.plan.devise, correspondant, telephone,
        description: `Abonnement ${abonnement.plan.nom}`,
      });
      await prisma.paiementAbonnement.update({ where: { id: paiement.id }, data: { payloadBrut: reponse as any } });
      ApiResponse.created(res, { paiementId: paiement.id, depositId }, 'Paiement initié : validez la demande reçue sur votre téléphone.');
    } catch (err: any) {
      await prisma.paiementAbonnement.update({ where: { id: paiement.id }, data: { statut: 'ECHEC', payloadBrut: { erreur: err.message } } });
      ApiResponse.badRequest(res, `Impossible d'initier le paiement : ${err.message}`);
    }
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/paiements/:depositId/statut', authenticate, requireSociete, async (req: AuthRequest, res: Response) => {
  try {
    const paiement = await prisma.paiementAbonnement.findFirst({ where: { referenceExterne: req.params.depositId, societeId: req.user!.societeId } });
    if (!paiement) { ApiResponse.notFound(res, 'Paiement introuvable'); return; }
    if (paiement.statut === 'EN_ATTENTE' && PAWAPAY_CONFIGURE) {
      try {
        const distant: any = await statutDepot(req.params.depositId);
        const statutDistant = Array.isArray(distant) ? distant[0]?.status : distant?.status;
        if (statutDistant === 'COMPLETED') await activerApresPaiement(paiement.id);
        else if (statutDistant === 'FAILED' || statutDistant === 'REJECTED') await prisma.paiementAbonnement.update({ where: { id: paiement.id }, data: { statut: 'ECHEC', payloadBrut: distant } });
      } catch { /* on renvoie le statut local connu si l'appel distant echoue */ }
    }
    const actuel = await prisma.paiementAbonnement.findUnique({ where: { id: paiement.id } });
    ApiResponse.success(res, actuel);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

async function activerApresPaiement(paiementId: string) {
  const paiement = await prisma.paiementAbonnement.findUnique({ where: { id: paiementId }, include: { abonnement: { include: { plan: true } } } });
  if (!paiement || paiement.statut === 'REUSSI') return;
  const dureeJours = paiement.abonnement.periodicite === 'ANNUEL' ? 365 : 30;
  const base = paiement.abonnement.dateProchainPaiement && paiement.abonnement.dateProchainPaiement > new Date() ? paiement.abonnement.dateProchainPaiement : new Date();
  const prochain = new Date(base.getTime() + dureeJours * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.paiementAbonnement.update({ where: { id: paiementId }, data: { statut: 'REUSSI', datePaiement: new Date() } }),
    prisma.abonnement.update({ where: { id: paiement.abonnementId }, data: { statut: 'ACTIF', dateProchainPaiement: prochain } }),
  ]);
}

// ===== Webhook PawaPay (appele par les serveurs PawaPay, non authentifie par JWT) =====
// A configurer dans le tableau de bord PawaPay comme URL de callback des depots.

router.post('/paiements/pawapay/webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const depositId = payload?.depositId || payload?.[0]?.depositId;
    if (!depositId) { res.status(400).json({ ok: false }); return; }

    const paiement = await prisma.paiementAbonnement.findFirst({ where: { referenceExterne: depositId } });
    if (!paiement) { res.status(404).json({ ok: false }); return; }
    if (paiement.statut !== 'EN_ATTENTE') { res.json({ ok: true }); return; } // deja traite, rien a refaire

    // Le webhook ne fait jamais foi a lui seul (n'importe qui pourrait poster un faux "COMPLETED") :
    // on reverifie toujours le statut reel aupres de PawaPay avant d'activer quoi que ce soit.
    if (!PAWAPAY_CONFIGURE) { res.status(503).json({ ok: false, error: 'PawaPay non configure' }); return; }
    const verifie: any = await statutDepot(depositId);
    const statutReel = Array.isArray(verifie) ? verifie[0]?.status : verifie?.status;

    if (statutReel === 'COMPLETED') {
      await activerApresPaiement(paiement.id);
    } else if (statutReel === 'FAILED' || statutReel === 'REJECTED') {
      await prisma.paiementAbonnement.update({ where: { id: paiement.id }, data: { statut: 'ECHEC', payloadBrut: verifie } });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
