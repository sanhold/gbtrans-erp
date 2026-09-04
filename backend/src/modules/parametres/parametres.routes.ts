import { Router, Response } from 'express';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

// ---------- Société (infos, TVA, devise, SMTP, logo, signature) ----------

router.get('/societe', authorize('PARAMETRES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societe = await prisma.societe.findUnique({ where: { id: req.user!.societeId } });
    if (!societe) { ApiResponse.notFound(res, 'Société introuvable'); return; }
    ApiResponse.success(res, societe);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/societe', authorize('PARAMETRES:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      raisonSociale, formeJuridique, capital, rccm, ncc, regime, adresse, ville, pays,
      telephone, mobile, email, siteWeb, devise, tauxTVA, timbreFiscal,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
    } = req.body;

    const societe = await prisma.societe.update({
      where: { id: req.user!.societeId },
      data: {
        ...(raisonSociale !== undefined && { raisonSociale }),
        ...(formeJuridique !== undefined && { formeJuridique: formeJuridique || null }),
        ...(capital !== undefined && { capital: capital === '' || capital == null ? null : parseFloat(capital) }),
        ...(rccm !== undefined && { rccm: rccm || null }),
        ...(ncc !== undefined && { ncc: ncc || null }),
        ...(regime !== undefined && { regime: regime || null }),
        ...(adresse !== undefined && { adresse: adresse || null }),
        ...(ville !== undefined && { ville: ville || null }),
        ...(pays !== undefined && { pays }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(mobile !== undefined && { mobile: mobile || null }),
        ...(email !== undefined && { email: email || null }),
        ...(siteWeb !== undefined && { siteWeb: siteWeb || null }),
        ...(devise !== undefined && { devise }),
        ...(tauxTVA !== undefined && { tauxTVA: parseFloat(tauxTVA) || 0 }),
        ...(timbreFiscal !== undefined && { timbreFiscal: parseFloat(timbreFiscal) || 0 }),
        ...(smtpHost !== undefined && { smtpHost: smtpHost || null }),
        ...(smtpPort !== undefined && { smtpPort: smtpPort === '' || smtpPort == null ? null : parseInt(smtpPort) }),
        ...(smtpUser !== undefined && { smtpUser: smtpUser || null }),
        ...(smtpPass !== undefined && smtpPass !== '' && { smtpPass }),
        ...(smtpSecure !== undefined && { smtpSecure: !!smtpSecure }),
      },
    });
    ApiResponse.success(res, societe, 'Informations société mises à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/societe/logo', authorize('PARAMETRES:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { logo } = req.body;
    if (logo && typeof logo === 'string' && logo.length > 3_000_000) { ApiResponse.badRequest(res, 'Image trop volumineuse (2 Mo max)'); return; }
    const societe = await prisma.societe.update({ where: { id: req.user!.societeId }, data: { logo: logo || null } });
    ApiResponse.success(res, societe, logo ? 'Logo mis à jour' : 'Logo supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/societe/signature', authorize('PARAMETRES:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { signature } = req.body;
    if (signature && typeof signature === 'string' && signature.length > 3_000_000) { ApiResponse.badRequest(res, 'Image trop volumineuse (2 Mo max)'); return; }
    const societe = await prisma.societe.update({ where: { id: req.user!.societeId }, data: { signature: signature || null } });
    ApiResponse.success(res, societe, signature ? 'Signature mise à jour' : 'Signature supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ---------- Numérotation ----------

const MODULES_NUMEROTATION = [
  { module: 'DOSSIER', label: 'Dossier', prefixeDefaut: 'DOS' },
  { module: 'FACTURE', label: 'Facture', prefixeDefaut: 'FAC' },
  { module: 'PROFORMA', label: 'Proforma', prefixeDefaut: 'PRO' },
  { module: 'AVOIR', label: 'Avoir', prefixeDefaut: 'AVR' },
  { module: 'OFFRE', label: 'Offre', prefixeDefaut: 'OFF' },
  { module: 'PAIEMENT', label: 'Paiement', prefixeDefaut: 'PAI' },
  { module: 'COURRIER_ENTRANT', label: 'Courrier Entrant', prefixeDefaut: 'CE' },
  { module: 'COURRIER_SORTANT', label: 'Courrier Sortant', prefixeDefaut: 'CS' },
  { module: 'AT', label: 'Admission Temporaire', prefixeDefaut: 'AT' },
  { module: 'CAUTION', label: 'Caution', prefixeDefaut: 'CAU' },
  { module: 'DEPENSE', label: 'Dépense', prefixeDefaut: 'DEP' },
  { module: 'DOTATION', label: 'Dotation', prefixeDefaut: 'DOT' },
  { module: 'BULLETIN_PAIE', label: 'Bulletin de paie', prefixeDefaut: 'BUL' },
];

router.get('/numerotations', authorize('PARAMETRES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const annee = new Date().getFullYear();
    const existantes = await prisma.numerotation.findMany({ where: { societeId: req.user!.societeId, annee } });
    const parModule = new Map(existantes.map(n => [n.module, n]));

    const result = MODULES_NUMEROTATION.map(m => {
      const n = parModule.get(m.module);
      return {
        id: n?.id || null,
        module: m.module,
        label: m.label,
        prefixe: n?.prefixe ?? m.prefixeDefaut,
        longueur: n?.longueur ?? 6,
        compteur: n?.compteur ?? 0,
        annee,
        enUsage: !!n,
      };
    });
    ApiResponse.success(res, result);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/numerotations/:module', authorize('PARAMETRES:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { prefixe, longueur } = req.body;
    if (!prefixe) { ApiResponse.badRequest(res, 'Préfixe requis'); return; }
    const annee = new Date().getFullYear();

    const numerotation = await prisma.numerotation.upsert({
      where: { societeId_module_annee: { societeId: req.user!.societeId, module: req.params.module, annee } },
      update: { prefixe, longueur: parseInt(longueur) || 6 },
      create: {
        societeId: req.user!.societeId, module: req.params.module, annee,
        prefixe, longueur: parseInt(longueur) || 6, compteur: 0, annuel: true,
        format: '{PREFIX}/{ANNEE}/{COMPTEUR}',
      },
    });
    ApiResponse.success(res, numerotation, 'Numérotation mise à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Ce préfixe est déjà utilisé' : e.message); }
});

export default router;
