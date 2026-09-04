import { Router, Response } from 'express';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { calculerBulletin } from '../../utils/payrollRules';

const router = Router();
router.use(authenticate, requireSociete);

// ---------- Employés ----------

router.get('/employes', authorize('RH:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, actif } = req.query;
    const where: any = {
      societeId: req.user!.societeId,
      ...(actif !== undefined && { actif: actif === 'true' }),
      ...(search && {
        OR: [
          { nom: { contains: search as string, mode: 'insensitive' } },
          { prenom: { contains: search as string, mode: 'insensitive' } },
          { matricule: { contains: search as string, mode: 'insensitive' } },
          { poste: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    };
    const employes = await prisma.employe.findMany({
      where,
      orderBy: { nom: 'asc' },
      include: { _count: { select: { bulletins: true } } },
    });
    ApiResponse.success(res, employes);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/employes', authorize('RH:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { matricule, nom, prenom, dateNaissance, sexe, situationFamiliale, nombreEnfants,
      telephone, email, adresse, poste, departement, typeContrat, dateEmbauche, dateFinContrat,
      salaireBase, numeroCNPS, compteBancaire, utilisateurId, observations } = req.body;

    if (!matricule || !nom || !prenom || !poste || !dateEmbauche || salaireBase == null) {
      ApiResponse.badRequest(res, 'Matricule, nom, prénom, poste, date d\'embauche et salaire de base sont requis');
      return;
    }
    const existing = await prisma.employe.findFirst({ where: { societeId: req.user!.societeId, matricule } });
    if (existing) { ApiResponse.badRequest(res, 'Un employé avec ce matricule existe déjà'); return; }

    const employe = await prisma.employe.create({
      data: {
        societeId: req.user!.societeId,
        matricule, nom, prenom,
        dateNaissance: dateNaissance ? new Date(dateNaissance) : null,
        sexe: sexe || null,
        situationFamiliale: situationFamiliale || 'CELIBATAIRE',
        nombreEnfants: parseInt(nombreEnfants) || 0,
        telephone: telephone || null,
        email: email || null,
        adresse: adresse || null,
        poste, departement: departement || null,
        typeContrat: typeContrat || 'CDI',
        dateEmbauche: new Date(dateEmbauche),
        dateFinContrat: dateFinContrat ? new Date(dateFinContrat) : null,
        salaireBase: parseFloat(salaireBase),
        numeroCNPS: numeroCNPS || null,
        compteBancaire: compteBancaire || null,
        utilisateurId: utilisateurId || null,
        observations: observations || null,
      },
    });
    ApiResponse.created(res, employe, 'Employé créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.get('/employes/:id', authorize('RH:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const employe = await prisma.employe.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: { bulletins: { orderBy: [{ periodeAnnee: 'desc' }, { periodeMois: 'desc' }], take: 12 } },
    });
    if (!employe) { ApiResponse.notFound(res, 'Employé introuvable'); return; }
    ApiResponse.success(res, employe);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/employes/:id', authorize('RH:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.employe.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Employé introuvable'); return; }

    const { nom, prenom, dateNaissance, sexe, situationFamiliale, nombreEnfants, telephone, email,
      adresse, poste, departement, typeContrat, dateEmbauche, dateFinContrat, salaireBase,
      numeroCNPS, compteBancaire, utilisateurId, observations } = req.body;

    const employe = await prisma.employe.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(prenom !== undefined && { prenom }),
        ...(dateNaissance !== undefined && { dateNaissance: dateNaissance ? new Date(dateNaissance) : null }),
        ...(sexe !== undefined && { sexe: sexe || null }),
        ...(situationFamiliale !== undefined && { situationFamiliale }),
        ...(nombreEnfants !== undefined && { nombreEnfants: parseInt(nombreEnfants) || 0 }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(adresse !== undefined && { adresse: adresse || null }),
        ...(poste !== undefined && { poste }),
        ...(departement !== undefined && { departement: departement || null }),
        ...(typeContrat !== undefined && { typeContrat }),
        ...(dateEmbauche !== undefined && { dateEmbauche: new Date(dateEmbauche) }),
        ...(dateFinContrat !== undefined && { dateFinContrat: dateFinContrat ? new Date(dateFinContrat) : null }),
        ...(salaireBase !== undefined && { salaireBase: parseFloat(salaireBase) }),
        ...(numeroCNPS !== undefined && { numeroCNPS: numeroCNPS || null }),
        ...(compteBancaire !== undefined && { compteBancaire: compteBancaire || null }),
        ...(utilisateurId !== undefined && { utilisateurId: utilisateurId || null }),
        ...(observations !== undefined && { observations: observations || null }),
      },
    });
    ApiResponse.success(res, employe, 'Employé modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/employes/:id/statut', authorize('RH:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.employe.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Employé introuvable'); return; }
    const employe = await prisma.employe.update({ where: { id: req.params.id }, data: { actif: !existing.actif } });
    ApiResponse.success(res, employe, employe.actif ? 'Employé réactivé' : 'Employé désactivé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ---------- Bulletins de paie ----------

router.get('/bulletins', authorize('RH:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { periodeMois, periodeAnnee, employeId } = req.query;
    const bulletins = await prisma.bulletinPaie.findMany({
      where: {
        societeId: req.user!.societeId,
        ...(periodeMois && { periodeMois: parseInt(periodeMois as string) }),
        ...(periodeAnnee && { periodeAnnee: parseInt(periodeAnnee as string) }),
        ...(employeId && { employeId: employeId as string }),
      },
      include: { employe: { select: { id: true, matricule: true, nom: true, prenom: true, poste: true } } },
      orderBy: [{ periodeAnnee: 'desc' }, { periodeMois: 'desc' }, { employe: { nom: 'asc' } }],
    });
    ApiResponse.success(res, bulletins);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/bulletins/generer', authorize('RH:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { periodeMois, periodeAnnee, employeIds } = req.body;
    if (!periodeMois || !periodeAnnee) { ApiResponse.badRequest(res, 'Mois et année de période requis'); return; }

    const employes = await prisma.employe.findMany({
      where: {
        societeId: req.user!.societeId,
        actif: true,
        ...(Array.isArray(employeIds) && employeIds.length > 0 && { id: { in: employeIds } }),
      },
    });

    let created = 0;
    let skipped = 0;
    const bulletins = [];
    for (const employe of employes) {
      const existing = await prisma.bulletinPaie.findUnique({
        where: { employeId_periodeMois_periodeAnnee: { employeId: employe.id, periodeMois, periodeAnnee } },
      });
      if (existing) { skipped++; continue; }

      const calcul = calculerBulletin({
        salaireBase: Number(employe.salaireBase),
        situationFamiliale: employe.situationFamiliale,
        nombreEnfants: employe.nombreEnfants,
      });
      const numero = await genererNumero(req.user!.societeId, 'BULLETIN_PAIE');
      const bulletin = await prisma.bulletinPaie.create({
        data: {
          societeId: req.user!.societeId,
          employeId: employe.id,
          numero,
          periodeMois, periodeAnnee,
          salaireBase: employe.salaireBase,
          salaireBrut: calcul.salaireBrut,
          cnpsSalarie: calcul.cnpsSalarie,
          cnpsPatronal: calcul.cnpsPatronal,
          itsSalarie: calcul.itsSalarie,
          salaireNet: calcul.salaireNet,
          coutTotalEmployeur: calcul.coutTotalEmployeur,
        },
        include: { employe: { select: { id: true, matricule: true, nom: true, prenom: true, poste: true } } },
      });
      bulletins.push(bulletin);
      created++;
    }
    ApiResponse.created(res, bulletins, `${created} bulletin(s) généré(s), ${skipped} déjà existant(s)`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.get('/bulletins/:id', authorize('RH:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const bulletin = await prisma.bulletinPaie.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: { employe: true },
    });
    if (!bulletin) { ApiResponse.notFound(res, 'Bulletin introuvable'); return; }
    ApiResponse.success(res, bulletin);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/bulletins/:id', authorize('RH:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.bulletinPaie.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId }, include: { employe: true } });
    if (!existing) { ApiResponse.notFound(res, 'Bulletin introuvable'); return; }
    if (existing.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seul un bulletin en brouillon peut être modifié'); return; }

    const { primes, indemnites, autresRetenues, avance, observations } = req.body;
    const calcul = calculerBulletin({
      salaireBase: Number(existing.salaireBase),
      primes: primes !== undefined ? parseFloat(primes) : Number(existing.primes),
      indemnites: indemnites !== undefined ? parseFloat(indemnites) : Number(existing.indemnites),
      autresRetenues: autresRetenues !== undefined ? parseFloat(autresRetenues) : Number(existing.autresRetenues),
      avance: avance !== undefined ? parseFloat(avance) : Number(existing.avance),
      situationFamiliale: existing.employe.situationFamiliale,
      nombreEnfants: existing.employe.nombreEnfants,
    });

    const bulletin = await prisma.bulletinPaie.update({
      where: { id: req.params.id },
      data: {
        primes: primes !== undefined ? parseFloat(primes) : undefined,
        indemnites: indemnites !== undefined ? parseFloat(indemnites) : undefined,
        autresRetenues: autresRetenues !== undefined ? parseFloat(autresRetenues) : undefined,
        avance: avance !== undefined ? parseFloat(avance) : undefined,
        observations: observations !== undefined ? observations : undefined,
        salaireBrut: calcul.salaireBrut,
        cnpsSalarie: calcul.cnpsSalarie,
        cnpsPatronal: calcul.cnpsPatronal,
        itsSalarie: calcul.itsSalarie,
        salaireNet: calcul.salaireNet,
        coutTotalEmployeur: calcul.coutTotalEmployeur,
      },
      include: { employe: { select: { id: true, matricule: true, nom: true, prenom: true, poste: true } } },
    });
    ApiResponse.success(res, bulletin, 'Bulletin recalculé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/bulletins/:id/valider', authorize('RH:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.bulletinPaie.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Bulletin introuvable'); return; }
    if (existing.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Ce bulletin a déjà été validé'); return; }
    const bulletin = await prisma.bulletinPaie.update({ where: { id: req.params.id }, data: { statut: 'VALIDE' } });
    ApiResponse.success(res, bulletin, 'Bulletin validé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/bulletins/:id/payer', authorize('RH:PAYER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.bulletinPaie.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Bulletin introuvable'); return; }
    if (existing.statut === 'BROUILLON') { ApiResponse.badRequest(res, 'Validez d\'abord le bulletin avant de le marquer payé'); return; }
    const { modePaiement, datePaiement } = req.body;
    const bulletin = await prisma.bulletinPaie.update({
      where: { id: req.params.id },
      data: { statut: 'PAYE', modePaiement: modePaiement || null, datePaiement: datePaiement ? new Date(datePaiement) : new Date() },
    });
    ApiResponse.success(res, bulletin, 'Bulletin marqué payé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/bulletins/:id', authorize('RH:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.bulletinPaie.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Bulletin introuvable'); return; }
    if (existing.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seul un bulletin en brouillon peut être supprimé'); return; }
    await prisma.bulletinPaie.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Bulletin supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
