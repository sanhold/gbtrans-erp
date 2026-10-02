import { Router, Response } from 'express';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import syscohadaPlanReference from '../../../prisma/data/syscohada-plan-reference.json';

const router = Router();
router.use(authenticate, requireSociete);

/**
 * Architecture reprise du modele observe chez un produit comparable : UN SEUL plan comptable,
 * UN SEUL jeu de journaux, UN SEUL jeu d'exercices, partages par Compta Automatique et Compta
 * Manuelle. Une ecriture est "automatique" (generee et validee directement par Compta Auto,
 * lecture seule) si son numero porte le prefixe reserve a la generation automatique (cf.
 * utils/numerotation.ts) ; sinon elle est "manuelle" (saisie libre ou pieces comptabilisees
 * a la main depuis la file d'attente).
 */
const PREFIXES_AUTO = ['AVE', 'AAC', 'ABQ', 'ACA', 'AOD', 'AUT'];
function estOrigineAuto(numero: string): boolean {
  return PREFIXES_AUTO.some(p => numero.startsWith(p + '/'));
}
function origineDe(numero: string): 'AUTO' | 'MANUEL' {
  return estOrigineAuto(numero) ? 'AUTO' : 'MANUEL';
}
function filtreOrigine(origine?: string) {
  if (origine === 'AUTO') return { OR: PREFIXES_AUTO.map(p => ({ numero: { startsWith: `${p}/` } })) };
  if (origine === 'MANUEL') return { NOT: { OR: PREFIXES_AUTO.map(p => ({ numero: { startsWith: `${p}/` } })) } };
  return {};
}

// ===== COMPTES (plan comptable, partage) =====

router.get('/comptes', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { tous } = req.query;
    const comptes = await prisma.compteComptable.findMany({
      where: { societeId: req.user!.societeId, ...(tous !== '1' && { actif: true }) },
      orderBy: { numero: 'asc' },
    });
    ApiResponse.success(res, comptes);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/comptes', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { numero, libelle, classe, type, nature, sens, parent, collectif, lettrable, rapprochable } = req.body;
    if (!numero || !libelle || !classe || !type || !nature) { ApiResponse.badRequest(res, 'Numéro, libellé, classe, type et nature sont requis'); return; }
    const compte = await prisma.compteComptable.create({
      data: {
        societeId: req.user!.societeId, numero: String(numero).trim(), libelle, classe: parseInt(classe),
        type, nature, sens: sens || 'DEBITEUR', parent: parent || null,
        niveau: String(numero).trim().length <= 2 ? 1 : String(numero).trim().length,
        collectif: !!collectif, lettrable: !!lettrable, rapprochable: !!rapprochable,
      },
    });
    ApiResponse.created(res, compte, 'Compte créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Ce numéro de compte existe déjà' : e.message); }
});

router.put('/comptes/:id', authorize('COMPTABILITE:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    const { libelle, classe, type, nature, sens, parent, collectif, lettrable, rapprochable, actif } = req.body;
    if (existing.verrouille && (libelle !== undefined || classe !== undefined || type !== undefined || nature !== undefined || sens !== undefined || parent !== undefined)) {
      ApiResponse.badRequest(res, 'Ce compte est verrouillé : déverrouillez-le avant de modifier ses caractéristiques.');
      return;
    }
    const compte = await prisma.compteComptable.update({
      where: { id: req.params.id },
      data: {
        ...(libelle !== undefined && { libelle }),
        ...(classe !== undefined && { classe: parseInt(classe) }),
        ...(type !== undefined && { type }),
        ...(nature !== undefined && { nature }),
        ...(sens !== undefined && { sens }),
        ...(parent !== undefined && { parent: parent || null }),
        ...(collectif !== undefined && { collectif: !!collectif }),
        ...(lettrable !== undefined && { lettrable: !!lettrable }),
        ...(rapprochable !== undefined && { rapprochable: !!rapprochable }),
        ...(actif !== undefined && { actif: !!actif }),
      },
    });
    ApiResponse.success(res, compte, 'Compte modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/comptes/:id/verrouiller', authorize('COMPTABILITE:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    const compte = await prisma.compteComptable.update({ where: { id: req.params.id }, data: { verrouille: true } });
    ApiResponse.success(res, compte, `Compte ${compte.numero} verrouillé`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/comptes/:id/deverrouiller', authorize('COMPTABILITE:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    const compte = await prisma.compteComptable.update({ where: { id: req.params.id }, data: { verrouille: false } });
    ApiResponse.success(res, compte, `Compte ${compte.numero} déverrouillé`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/comptes/:id', authorize('COMPTABILITE:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    if (existing.verrouille) { ApiResponse.badRequest(res, 'Ce compte est verrouillé : déverrouillez-le avant de le supprimer.'); return; }
    const mouvement = await prisma.mouvementComptable.findFirst({ where: { compteId: req.params.id } });
    if (mouvement) { ApiResponse.badRequest(res, 'Ce compte a des mouvements comptables : il ne peut pas être supprimé, seulement désactivé'); return; }
    await prisma.compteComptable.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Compte supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.get('/comptes/syscohada-reference', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const existants = await prisma.compteComptable.findMany({ where: { societeId: req.user!.societeId }, select: { numero: true } });
    const presents = new Set(existants.map(c => c.numero));
    ApiResponse.success(res, syscohadaPlanReference.map(c => ({ ...c, dejaPresent: presents.has(c.numero) })));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/comptes/importer-syscohada', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { numeros } = req.body as { numeros?: string[] };
    const aImporter = Array.isArray(numeros) && numeros.length > 0
      ? syscohadaPlanReference.filter(c => numeros.includes(c.numero))
      : syscohadaPlanReference;
    if (aImporter.length === 0) { ApiResponse.badRequest(res, 'Aucun compte sélectionné'); return; }
    const result = await prisma.compteComptable.createMany({
      data: aImporter.map(c => ({
        societeId, numero: c.numero, libelle: c.libelle, classe: c.classe,
        type: c.type as any, nature: c.nature as any, sens: c.sens as any,
        niveau: c.numero.length,
      })),
      skipDuplicates: true,
    });
    ApiResponse.success(res, { importes: result.count, total: aImporter.length }, `${result.count} compte(s) ajouté(s)${aImporter.length - result.count > 0 ? ` (${aImporter.length - result.count} déjà présent(s))` : ''}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== EXERCICES (partages) =====

router.get('/exercices', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.exercice.findMany({
      where: { societeId: req.user!.societeId },
      orderBy: [{ dateDebut: 'desc' }, { code: 'desc' }],
      include: { _count: { select: { ecritures: true } } },
    });
    const nonValidees = await prisma.ecritureComptable.groupBy({
      by: ['exerciceId'],
      where: { validee: false, exercice: { societeId: req.user!.societeId } },
      _count: true,
    });
    const mapNonValidees = new Map(nonValidees.map(n => [n.exerciceId, n._count]));
    ApiResponse.success(res, data.map(ex => ({
      ...ex,
      nbEcritures: ex._count.ecritures,
      nbNonValidees: mapNonValidees.get(ex.id) || 0,
    })));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/exercices', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, libelle, dateDebut, dateFin } = req.body;
    if (!code || !libelle || !dateDebut || !dateFin) { ApiResponse.badRequest(res, 'Code, libellé, date de début et date de fin sont requis'); return; }
    const debut = new Date(dateDebut); const fin = new Date(dateFin);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || fin <= debut) { ApiResponse.badRequest(res, 'La date de fin doit être postérieure à la date de début'); return; }
    const chevauche = await prisma.exercice.findFirst({
      where: { societeId: req.user!.societeId, dateDebut: { lte: fin }, dateFin: { gte: debut } },
    });
    if (chevauche) { ApiResponse.badRequest(res, `Cette période chevauche l'exercice ${chevauche.code} (${chevauche.libelle})`); return; }
    const exercice = await prisma.exercice.create({
      data: { societeId: req.user!.societeId, code, libelle, dateDebut: debut, dateFin: fin },
    });
    ApiResponse.created(res, exercice, 'Exercice créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Un exercice avec ce code existe déjà' : e.message); }
});

router.patch('/exercices/:id/cloturer', authorize('COMPTABILITE:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const exo = await prisma.exercice.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!exo) { ApiResponse.notFound(res, 'Exercice introuvable'); return; }
    if (exo.cloture) { ApiResponse.badRequest(res, 'Cet exercice est déjà clôturé'); return; }
    const nonValidees = await prisma.ecritureComptable.count({ where: { exerciceId: exo.id, validee: false } });
    if (nonValidees > 0) { ApiResponse.badRequest(res, `${nonValidees} écriture(s) non validée(s) : validez-les avant de clôturer l'exercice`); return; }
    const updated = await prisma.exercice.update({ where: { id: exo.id }, data: { cloture: true, dateCloture: new Date() } });
    ApiResponse.success(res, updated, `Exercice ${exo.code} clôturé`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/exercices/:id/rouvrir', authorize('COMPTABILITE:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const exo = await prisma.exercice.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!exo) { ApiResponse.notFound(res, 'Exercice introuvable'); return; }
    if (!exo.cloture) { ApiResponse.badRequest(res, "Cet exercice n'est pas clôturé"); return; }
    const updated = await prisma.exercice.update({ where: { id: exo.id }, data: { cloture: false, dateCloture: null } });
    ApiResponse.success(res, updated, `Exercice ${exo.code} rouvert`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== JOURNAUX (partages) =====

router.get('/journaux', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.journalComptable.findMany({
      where: { societeId: req.user!.societeId },
      orderBy: { code: 'asc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/journaux', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, libelle, type, compteContrepartie } = req.body;
    if (!code || !libelle || !type) { ApiResponse.badRequest(res, 'Code, libellé et type sont requis'); return; }
    const journal = await prisma.journalComptable.create({
      data: { societeId: req.user!.societeId, code: String(code).trim().toUpperCase(), libelle, type, compteContrepartie: compteContrepartie || null },
    });
    ApiResponse.created(res, journal, 'Journal créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Ce code de journal existe déjà' : e.message); }
});

router.put('/journaux/:id', authorize('COMPTABILITE:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.journalComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Journal introuvable'); return; }
    const { libelle, type, compteContrepartie, actif } = req.body;
    const journal = await prisma.journalComptable.update({
      where: { id: req.params.id },
      data: {
        ...(libelle !== undefined && { libelle }),
        ...(type !== undefined && { type }),
        ...(compteContrepartie !== undefined && { compteContrepartie: compteContrepartie || null }),
        ...(actif !== undefined && { actif: !!actif }),
      },
    });
    ApiResponse.success(res, journal, 'Journal modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/journaux/:id', authorize('COMPTABILITE:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.journalComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Journal introuvable'); return; }
    const ecriture = await prisma.ecritureComptable.findFirst({ where: { journalId: req.params.id } });
    if (ecriture) { ApiResponse.badRequest(res, 'Ce journal contient des écritures : il ne peut pas être supprimé, seulement désactivé'); return; }
    await prisma.journalComptable.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Journal supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== ECRITURES =====

router.get('/ecritures', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '30', journalId, exerciceId, origine, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {
      journal: { societeId: req.user!.societeId },
      ...(journalId && { journalId }),
      ...(exerciceId && { exerciceId }),
      ...filtreOrigine(origine as string),
      ...(dateDebut && dateFin && { dateEcriture: { gte: new Date(dateDebut as string), lte: new Date(dateFin as string) } }),
    };
    const [data, total] = await Promise.all([
      prisma.ecritureComptable.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateEcriture: 'desc' },
        include: {
          journal: { select: { code: true, libelle: true } },
          mouvements: { include: { compte: { select: { numero: true, libelle: true } } } },
        },
      }),
      prisma.ecritureComptable.count({ where }),
    ]);
    ApiResponse.paginated(res, data.map(e => ({ ...e, origine: origineDe(e.numero) })), total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/ecritures', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId, journalId, dateEcriture, libelle, reference, piece, mouvements } = req.body;
    if (!exerciceId || !journalId || !dateEcriture || !libelle) { ApiResponse.badRequest(res, 'Exercice, journal, date et libellé sont requis'); return; }
    if (!Array.isArray(mouvements) || mouvements.length < 2) { ApiResponse.badRequest(res, 'Une écriture doit comporter au moins 2 lignes'); return; }

    const totalDebit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.debit) || 0), 0);
    const totalCredit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      ApiResponse.badRequest(res, `L'écriture n'est pas équilibrée : débit ${totalDebit.toFixed(2)} ≠ crédit ${totalCredit.toFixed(2)}`);
      return;
    }
    if (totalDebit === 0) { ApiResponse.badRequest(res, 'Les montants ne peuvent pas être tous nuls'); return; }

    const journal = await prisma.journalComptable.findFirst({ where: { id: journalId, societeId: req.user!.societeId } });
    if (!journal) { ApiResponse.notFound(res, 'Journal introuvable'); return; }
    const exercice = await prisma.exercice.findFirst({ where: { id: exerciceId, societeId: req.user!.societeId } });
    if (!exercice) { ApiResponse.notFound(res, 'Exercice introuvable'); return; }
    if (exercice.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }
    { const d = new Date(dateEcriture); if (d < exercice.dateDebut || d > exercice.dateFin) { ApiResponse.badRequest(res, `La date de l'écriture doit être comprise dans l'exercice ${exercice.code} (${exercice.dateDebut.toLocaleDateString('fr-FR')} – ${exercice.dateFin.toLocaleDateString('fr-FR')})`); return; } }
    const ids = [...new Set(mouvements.map((m: any) => m.compteId).filter(Boolean))];
    const nbComptes = await prisma.compteComptable.count({ where: { id: { in: ids }, societeId: req.user!.societeId } });
    if (nbComptes !== ids.length) { ApiResponse.badRequest(res, 'Un ou plusieurs comptes sont introuvables'); return; }

    const numero = await genererNumero(req.user!.societeId, `ECRITURE_${journal.code}`);
    const ecriture = await prisma.ecritureComptable.create({
      data: {
        exerciceId, journalId, numero,
        dateEcriture: new Date(dateEcriture),
        libelle, reference: reference || null, piece: piece || null,
        createurId: req.user!.id,
        mouvements: {
          create: mouvements.map((m: any) => ({
            compteId: m.compteId,
            libelle: m.libelle || null,
            debit: parseFloat(m.debit) || 0,
            credit: parseFloat(m.credit) || 0,
          })),
        },
      },
      include: { journal: true, mouvements: { include: { compte: { select: { numero: true, libelle: true } } } } },
    });
    ApiResponse.created(res, ecriture, `Écriture ${numero} créée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/ecritures/:id', authorize('COMPTABILITE:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.ecritureComptable.findFirst({
      where: { id: req.params.id, journal: { societeId: req.user!.societeId } },
    });
    if (!existing) { ApiResponse.notFound(res, 'Écriture introuvable'); return; }
    if (estOrigineAuto(existing.numero)) { ApiResponse.badRequest(res, "Cette écriture a été générée par Compta Auto : elle ne peut pas être modifiée manuellement."); return; }
    if (existing.validee) { ApiResponse.badRequest(res, 'Une écriture validée ne peut plus être modifiée'); return; }
    const exoEcriture = await prisma.exercice.findUnique({ where: { id: existing.exerciceId } });
    if (exoEcriture?.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }

    const { dateEcriture, libelle, reference, piece, mouvements } = req.body;
    if (dateEcriture && exoEcriture) {
      const d = new Date(dateEcriture);
      if (d < exoEcriture.dateDebut || d > exoEcriture.dateFin) { ApiResponse.badRequest(res, `La date de l'écriture doit être comprise dans l'exercice ${exoEcriture.code}`); return; }
    }
    if (mouvements) {
      if (!Array.isArray(mouvements) || mouvements.length < 2) { ApiResponse.badRequest(res, 'Une écriture doit comporter au moins 2 lignes'); return; }
      const totalDebit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.debit) || 0), 0);
      const totalCredit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        ApiResponse.badRequest(res, `L'écriture n'est pas équilibrée : débit ${totalDebit.toFixed(2)} ≠ crédit ${totalCredit.toFixed(2)}`);
        return;
      }
      const ids = [...new Set(mouvements.map((m: any) => m.compteId).filter(Boolean))];
      const nbComptes = await prisma.compteComptable.count({ where: { id: { in: ids }, societeId: req.user!.societeId } });
      if (nbComptes !== ids.length) { ApiResponse.badRequest(res, 'Un ou plusieurs comptes sont introuvables'); return; }
    }

    const ecriture = await prisma.$transaction(async (tx) => {
      if (mouvements) {
        await tx.mouvementComptable.deleteMany({ where: { ecritureId: req.params.id } });
      }
      return tx.ecritureComptable.update({
        where: { id: req.params.id },
        data: {
          ...(dateEcriture !== undefined && { dateEcriture: new Date(dateEcriture) }),
          ...(libelle !== undefined && { libelle }),
          ...(reference !== undefined && { reference: reference || null }),
          ...(piece !== undefined && { piece: piece || null }),
          ...(mouvements && {
            mouvements: {
              create: mouvements.map((m: any) => ({
                compteId: m.compteId, libelle: m.libelle || null,
                debit: parseFloat(m.debit) || 0, credit: parseFloat(m.credit) || 0,
              })),
            },
          }),
        },
        include: { journal: true, mouvements: { include: { compte: { select: { numero: true, libelle: true } } } } },
      });
    });
    ApiResponse.success(res, ecriture, 'Écriture modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/ecritures/:id/valider', authorize('COMPTABILITE:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.ecritureComptable.findFirst({ where: { id: req.params.id, journal: { societeId: req.user!.societeId } } });
    if (!existing) { ApiResponse.notFound(res, 'Écriture introuvable'); return; }
    if (existing.validee) { ApiResponse.badRequest(res, 'Cette écriture est déjà validée'); return; }
    const ecriture = await prisma.ecritureComptable.update({ where: { id: req.params.id }, data: { validee: true, dateValidation: new Date() } });
    ApiResponse.success(res, ecriture, 'Écriture validée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/ecritures/:id', authorize('COMPTABILITE:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.ecritureComptable.findFirst({ where: { id: req.params.id, journal: { societeId: req.user!.societeId } } });
    if (!existing) { ApiResponse.notFound(res, 'Écriture introuvable'); return; }
    if (estOrigineAuto(existing.numero)) { ApiResponse.badRequest(res, "Cette écriture a été générée par Compta Auto : elle ne peut pas être supprimée manuellement."); return; }
    if (existing.validee) { ApiResponse.badRequest(res, 'Une écriture validée ne peut pas être supprimée'); return; }
    await prisma.ecritureComptable.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Écriture supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== PIÈCES À COMPTABILISER (Compta Manuelle) =====

const ecritureAttenteInclude = {
  facture: { select: { id: true, numero: true, client: { select: { raisonSociale: true } } } },
  factureFournisseur: { select: { id: true, numero: true, fournisseur: { select: { raisonSociale: true } } } },
  paiement: { select: { id: true, numero: true } },
  paiementFournisseur: { select: { id: true, numero: true } },
  depense: { select: { id: true, numero: true, categorie: true } },
};

router.get('/ecritures-attente', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { statut } = req.query;
    const data = await prisma.ecritureEnAttente.findMany({
      where: { societeId: req.user!.societeId, statut: (statut as any) || 'EN_ATTENTE' },
      include: ecritureAttenteInclude,
      orderBy: { dateOperation: 'desc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

/** Propose une écriture équilibrée pour une pièce en attente, sur le même principe que Compta Auto —
 *  l'utilisateur ajuste ensuite la proposition avant de comptabiliser (cf. "écriture pré-remplie" de référence). */
router.get('/ecritures-attente/:id/proposition', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const entree = await prisma.ecritureEnAttente.findFirst({
      where: { id: req.params.id, societeId },
      include: {
        facture: { select: { montantTTC: true, montantTVA: true, type: true } },
        factureFournisseur: { select: { montantTTC: true, montantTVA: true } },
        paiement: { select: { montant: true, modePaiement: true, caisseId: true, compteBancaireId: true } },
        paiementFournisseur: { select: { montant: true, modePaiement: true, caisseId: true, compteBancaireId: true } },
        depense: { select: { montant: true, modePaiement: true, caisseId: true, compteBancaireId: true, categorie: true } },
      },
    });
    if (!entree) { ApiResponse.notFound(res, 'Entrée introuvable'); return; }

    const [comptes, journaux] = await Promise.all([
      prisma.compteComptable.findMany({ where: { societeId, actif: true }, select: { id: true, numero: true } }),
      prisma.journalComptable.findMany({ where: { societeId, actif: true }, select: { id: true, code: true, type: true } }),
    ]);
    const cid = (...nums: string[]) => { for (const n of nums) { const c = comptes.find(x => x.numero === n); if (c) return c.id; } return null; };
    const jrn = (type: string) => journaux.find(j => j.type === type) || null;
    const C = {
      clients: cid('411'), ventes: cid('706'), tvaFact: cid('443', '4431'),
      fournisseurs: cid('401'), tvaRecup: cid('445', '4451'),
      banque: cid('512'), caisse: cid('571'), services: cid('63', '628', '605'), achats: cid('605', '604', '601'),
    };
    const J = { vente: jrn('VENTE'), achat: jrn('ACHAT'), banque: jrn('BANQUE'), caisse: jrn('CAISSE'), od: jrn('OD') };
    const n = (v: any) => Math.abs(Number(v) || 0);
    const tresorerie = (caisseId?: string | null, banqueId?: string | null, mode?: string) => {
      if (caisseId || (!banqueId && mode === 'ESPECES')) return C.caisse && J.caisse ? { compte: C.caisse, journal: J.caisse.id } : null;
      if (banqueId || mode) return C.banque && J.banque ? { compte: C.banque, journal: J.banque.id } : null;
      return null;
    };

    let journalId: string | null = null;
    let lignes: { compteId: string; libelle?: string; debit: number; credit: number }[] = [];
    const montant = n(entree.montant);

    if (entree.source === 'FACTURE' && entree.facture) {
      const ttc = n(entree.facture.montantTTC), tva = n(entree.facture.montantTVA), ht = ttc - tva;
      const avoir = entree.facture.type === 'AVOIR';
      if (J.vente && C.clients && C.ventes) {
        journalId = J.vente.id;
        lignes = avoir
          ? [{ compteId: C.ventes, debit: ht, credit: 0 }, ...(tva > 0 && C.tvaFact ? [{ compteId: C.tvaFact, debit: tva, credit: 0 }] : []), { compteId: C.clients, debit: 0, credit: ttc }]
          : [{ compteId: C.clients, debit: ttc, credit: 0 }, { compteId: C.ventes, debit: 0, credit: ht }, ...(tva > 0 && C.tvaFact ? [{ compteId: C.tvaFact, debit: 0, credit: tva }] : [])];
      }
    } else if (entree.source === 'FACTURE_FOURNISSEUR' && entree.factureFournisseur) {
      const ttc = n(entree.factureFournisseur.montantTTC), tva = n(entree.factureFournisseur.montantTVA), ht = ttc - tva;
      if (J.achat && C.achats && C.fournisseurs) {
        journalId = J.achat.id;
        lignes = [{ compteId: C.achats, debit: ht, credit: 0 }, ...(tva > 0 && C.tvaRecup ? [{ compteId: C.tvaRecup, debit: tva, credit: 0 }] : []), { compteId: C.fournisseurs, debit: 0, credit: ttc }];
      }
    } else if (entree.source === 'PAIEMENT' && entree.paiement && C.clients) {
      const t = tresorerie(entree.paiement.caisseId, entree.paiement.compteBancaireId, entree.paiement.modePaiement);
      if (t) { journalId = t.journal; lignes = [{ compteId: t.compte, debit: montant, credit: 0 }, { compteId: C.clients, debit: 0, credit: montant }]; }
    } else if (entree.source === 'PAIEMENT_FOURNISSEUR' && entree.paiementFournisseur && C.fournisseurs) {
      const t = tresorerie(entree.paiementFournisseur.caisseId, entree.paiementFournisseur.compteBancaireId, entree.paiementFournisseur.modePaiement);
      if (t) { journalId = t.journal; lignes = [{ compteId: C.fournisseurs, debit: montant, credit: 0 }, { compteId: t.compte, debit: 0, credit: montant }]; }
    } else if (entree.source === 'DEPENSE' && entree.depense) {
      const t = tresorerie(entree.depense.caisseId, entree.depense.compteBancaireId, entree.depense.modePaiement);
      const charge = C.services || C.achats;
      if (charge) {
        journalId = t ? t.journal : (J.od ? J.od.id : null);
        const contrepartie = t ? t.compte : C.fournisseurs;
        if (contrepartie) lignes = [{ compteId: charge, debit: montant, credit: 0 }, { compteId: contrepartie, debit: 0, credit: montant }];
      }
    }

    const avertissement = lignes.length === 0
      ? (entree.source === 'MANUEL' ? "Pièce manuelle : choisissez vous-même les comptes." : "Le plan comptable ne permet pas de proposer une écriture complète pour cette pièce : complétez-le, ou choisissez les comptes vous-même.")
      : undefined;

    ApiResponse.success(res, { journalId, libelle: entree.libelle, dateEcriture: entree.dateOperation, lignes, avertissement });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/ecritures-attente', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { libelle, montant, dateOperation } = req.body;
    if (!libelle || !montant || !dateOperation) { ApiResponse.badRequest(res, 'Libellé, montant et date sont requis'); return; }
    const entree = await prisma.ecritureEnAttente.create({
      data: {
        societeId: req.user!.societeId, source: 'MANUEL', libelle,
        montant: parseFloat(montant), dateOperation: new Date(dateOperation),
        createurNom: `${req.user!.prenom || ''} ${req.user!.nom || ''}`.trim() || null,
      },
    });
    ApiResponse.created(res, entree, 'Pièce ajoutée à la file d\'attente');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/ecritures-attente/:id/comptabiliser', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const entree = await prisma.ecritureEnAttente.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!entree) { ApiResponse.notFound(res, 'Entrée introuvable'); return; }
    if (entree.statut !== 'EN_ATTENTE') { ApiResponse.badRequest(res, 'Cette entrée a déjà été traitée'); return; }

    const { exerciceId, journalId, dateEcriture, libelle, reference, piece, mouvements } = req.body;
    if (!exerciceId || !journalId || !dateEcriture || !libelle) { ApiResponse.badRequest(res, 'Exercice, journal, date et libellé sont requis'); return; }
    if (!Array.isArray(mouvements) || mouvements.length < 2) { ApiResponse.badRequest(res, 'Une écriture doit comporter au moins 2 lignes'); return; }

    const totalDebit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.debit) || 0), 0);
    const totalCredit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      ApiResponse.badRequest(res, `L'écriture n'est pas équilibrée : débit ${totalDebit.toFixed(2)} ≠ crédit ${totalCredit.toFixed(2)}`);
      return;
    }
    if (totalDebit === 0) { ApiResponse.badRequest(res, 'Les montants ne peuvent pas être tous nuls'); return; }

    const journal = await prisma.journalComptable.findFirst({ where: { id: journalId, societeId: req.user!.societeId } });
    if (!journal) { ApiResponse.notFound(res, 'Journal introuvable'); return; }
    const exercice = await prisma.exercice.findFirst({ where: { id: exerciceId, societeId: req.user!.societeId } });
    if (!exercice) { ApiResponse.notFound(res, 'Exercice introuvable'); return; }
    if (exercice.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }
    { const d = new Date(dateEcriture); if (d < exercice.dateDebut || d > exercice.dateFin) { ApiResponse.badRequest(res, `La date de l'écriture doit être comprise dans l'exercice ${exercice.code} (${exercice.dateDebut.toLocaleDateString('fr-FR')} – ${exercice.dateFin.toLocaleDateString('fr-FR')})`); return; } }
    const ids = [...new Set(mouvements.map((m: any) => m.compteId).filter(Boolean))];
    const nbComptes = await prisma.compteComptable.count({ where: { id: { in: ids }, societeId: req.user!.societeId } });
    if (nbComptes !== ids.length) { ApiResponse.badRequest(res, 'Un ou plusieurs comptes sont introuvables'); return; }

    const numero = await genererNumero(req.user!.societeId, `ECRITURE_${journal.code}`);

    const ecriture = await prisma.$transaction(async (tx) => {
      const created = await tx.ecritureComptable.create({
        data: {
          exerciceId, journalId, numero,
          dateEcriture: new Date(dateEcriture),
          libelle, reference: reference || null, piece: piece || null,
          createurId: req.user!.id,
          factureId: entree.factureId || undefined,
          factureFournisseurId: entree.factureFournisseurId || undefined,
          paiementId: entree.paiementId || undefined,
          paiementFournisseurId: entree.paiementFournisseurId || undefined,
          depenseId: entree.depenseId || undefined,
          mouvements: {
            create: mouvements.map((m: any) => ({
              compteId: m.compteId, libelle: m.libelle || null,
              debit: parseFloat(m.debit) || 0, credit: parseFloat(m.credit) || 0,
            })),
          },
        },
        include: { journal: true, mouvements: { include: { compte: { select: { numero: true, libelle: true } } } } },
      });
      await tx.ecritureEnAttente.update({ where: { id: entree.id }, data: { statut: 'COMPTABILISEE', ecritureId: created.id } });
      return created;
    });

    ApiResponse.created(res, ecriture, `Écriture ${numero} comptabilisée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/ecritures-attente/:id/rejeter', authorize('COMPTABILITE:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const entree = await prisma.ecritureEnAttente.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!entree) { ApiResponse.notFound(res, 'Entrée introuvable'); return; }
    if (entree.statut !== 'EN_ATTENTE') { ApiResponse.badRequest(res, 'Cette entrée a déjà été traitée'); return; }
    const { motif } = req.body;
    const updated = await prisma.ecritureEnAttente.update({
      where: { id: entree.id },
      data: { statut: 'REJETEE', motifRejet: motif || null },
    });
    ApiResponse.success(res, updated, 'Pièce rejetée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== COMPTA AUTO (génération directe dans le grand livre partagé) =====

router.post('/compta-auto/generer', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { dateDebut, dateFin, sources, exerciceId } = req.body as { dateDebut?: string; dateFin?: string; sources?: string[]; exerciceId?: string };
    if (!exerciceId) { ApiResponse.badRequest(res, 'Choisissez un exercice'); return; }
    const exo = await prisma.exercice.findFirst({ where: { id: exerciceId, societeId } });
    if (!exo) { ApiResponse.notFound(res, 'Exercice introuvable'); return; }
    if (exo.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }

    const debut = new Date(Math.max(dateDebut ? new Date(dateDebut).getTime() : 0, exo.dateDebut.getTime()));
    const fin = new Date(Math.min(dateFin ? new Date(dateFin).getTime() : Infinity, exo.dateFin.getTime()));
    const typesVoulus = new Set(sources && sources.length > 0 ? sources : ['FACTURE', 'FACTURE_FOURNISSEUR', 'PAIEMENT', 'PAIEMENT_FOURNISSEUR', 'DEPENSE']);

    const [comptes, journaux] = await Promise.all([
      prisma.compteComptable.findMany({ where: { societeId, actif: true }, select: { id: true, numero: true } }),
      prisma.journalComptable.findMany({ where: { societeId, actif: true }, select: { id: true, code: true, type: true } }),
    ]);
    const cid = (...nums: string[]) => { for (const n of nums) { const c = comptes.find(x => x.numero === n); if (c) return c.id; } return null; };
    const jrn = (type: string) => journaux.find(j => j.type === type) || null;
    const C = {
      clients: cid('411'), ventes: cid('706'), tvaFact: cid('443', '4431'),
      fournisseurs: cid('401'), tvaRecup: cid('445', '4451'),
      banque: cid('512'), caisse: cid('571'),
      achats: cid('605', '604', '601'), services: cid('63', '628', '605'),
    };
    const manquantsComptes = Object.entries({ '411 Clients': C.clients, '706 Prestations': C.ventes, '443 TVA facturée': C.tvaFact, '401 Fournisseurs': C.fournisseurs, '445 TVA récupérable': C.tvaRecup, '512 Banques': C.banque, '571 Caisse': C.caisse, '605 Achats': C.achats }).filter(([, v]) => !v).map(([k]) => k);
    const J = { vente: jrn('VENTE'), achat: jrn('ACHAT'), banque: jrn('BANQUE'), caisse: jrn('CAISSE'), od: jrn('OD') };
    const manquantsJournaux = Object.entries({ Ventes: J.vente, Achats: J.achat, Banque: J.banque, Caisse: J.caisse, OD: J.od }).filter(([, v]) => !v).map(([k]) => k);
    if (manquantsComptes.length || manquantsJournaux.length) {
      ApiResponse.badRequest(res, `Le plan comptable est incomplet pour la génération automatique. ${manquantsComptes.length ? `Comptes manquants : ${manquantsComptes.join(', ')}. ` : ''}${manquantsJournaux.length ? `Journaux manquants : ${manquantsJournaux.join(', ')}. ` : ''}Complétez-le dans Plan comptable.`);
      return;
    }
    const codeJournal = new Map(journaux.map(j => [j.id, j.code]));

    // Documents déjà comptabilisés (manuellement ou automatiquement, peu importe) : jamais deux fois.
    const deja = await prisma.ecritureComptable.findMany({
      where: { journal: { societeId } },
      select: { factureId: true, paiementId: true, factureFournisseurId: true, paiementFournisseurId: true, depenseId: true },
    });
    const dejaSet = (k: keyof (typeof deja)[number]) => new Set(deja.map(e => e[k]).filter(Boolean) as string[]);
    const dFact = dejaSet('factureId'), dPai = dejaSet('paiementId'), dFF = dejaSet('factureFournisseurId'), dPF = dejaSet('paiementFournisseurId'), dDep = dejaSet('depenseId');

    type Ligne = { compteId: string; debit: number; credit: number; libelle?: string };
    type Plan = { journalId: string; date: Date; libelle: string; reference: string; lignes: Ligne[]; origine: Record<string, string> };
    const plans: Plan[] = [];
    let ignorees = 0;
    const n = (v: any) => Math.abs(Number(v) || 0);
    const tresorerie = (caisseId?: string | null, banqueId?: string | null, mode?: string) => {
      if (caisseId || (!banqueId && mode === 'ESPECES')) return { compte: C.caisse!, journal: J.caisse!.id };
      if (banqueId || mode) return { compte: C.banque!, journal: J.banque!.id };
      return null;
    };

    if (typesVoulus.has('FACTURE')) {
      const factures = await prisma.facture.findMany({
        where: { societeId, statut: { notIn: ['BROUILLON', 'ANNULEE'] }, dateFacture: { gte: debut, lte: fin }, id: { notIn: [...dFact] } },
        include: { client: { select: { raisonSociale: true } } },
      });
      for (const f of factures) {
        const ttc = n(f.montantTTC), tva = n(f.montantTVA), ht = ttc - tva;
        if (ttc === 0) { ignorees++; continue; }
        const avoir = f.type === 'AVOIR';
        const lignes: Ligne[] = avoir
          ? [{ compteId: C.ventes!, debit: ht, credit: 0 }, ...(tva > 0 ? [{ compteId: C.tvaFact!, debit: tva, credit: 0 }] : []), { compteId: C.clients!, debit: 0, credit: ttc }]
          : [{ compteId: C.clients!, debit: ttc, credit: 0 }, { compteId: C.ventes!, debit: 0, credit: ht }, ...(tva > 0 ? [{ compteId: C.tvaFact!, debit: 0, credit: tva }] : [])];
        plans.push({ journalId: J.vente!.id, date: f.dateFacture, libelle: `${avoir ? 'Avoir' : 'Facture'} ${f.numero} — ${f.client?.raisonSociale || ''}`, reference: f.numero, lignes, origine: { factureId: f.id } });
      }
    }

    if (typesVoulus.has('FACTURE_FOURNISSEUR')) {
      const factures = await prisma.factureFournisseur.findMany({
        where: { societeId, statut: { notIn: ['BROUILLON', 'ANNULEE'] }, dateFacture: { gte: debut, lte: fin }, id: { notIn: [...dFF] } },
        include: { fournisseur: { select: { raisonSociale: true } } },
      });
      for (const f of factures) {
        const ttc = n(f.montantTTC), tva = n(f.montantTVA), ht = ttc - tva;
        if (ttc === 0) { ignorees++; continue; }
        plans.push({
          journalId: J.achat!.id, date: f.dateFacture, libelle: `Facture fournisseur ${f.numero} — ${f.fournisseur?.raisonSociale || ''}`, reference: f.numero,
          lignes: [{ compteId: C.achats!, debit: ht, credit: 0 }, ...(tva > 0 ? [{ compteId: C.tvaRecup!, debit: tva, credit: 0 }] : []), { compteId: C.fournisseurs!, debit: 0, credit: ttc }],
          origine: { factureFournisseurId: f.id },
        });
      }
    }

    if (typesVoulus.has('PAIEMENT')) {
      const paiements = await prisma.paiement.findMany({
        where: { statut: 'VALIDE', datePaiement: { gte: debut, lte: fin }, id: { notIn: [...dPai] }, client: { societeId } },
      });
      for (const p of paiements) {
        const t = tresorerie(p.caisseId, p.compteBancaireId, p.modePaiement); const m = n(p.montant);
        if (!t || m === 0) { ignorees++; continue; }
        plans.push({ journalId: t.journal, date: p.datePaiement, libelle: `Paiement client ${p.numero}`, reference: p.numero, lignes: [{ compteId: t.compte, debit: m, credit: 0 }, { compteId: C.clients!, debit: 0, credit: m }], origine: { paiementId: p.id } });
      }
    }

    if (typesVoulus.has('PAIEMENT_FOURNISSEUR')) {
      const paiements = await prisma.paiementFournisseur.findMany({
        where: { societeId, statut: 'VALIDE', datePaiement: { gte: debut, lte: fin }, id: { notIn: [...dPF] } },
      });
      for (const p of paiements) {
        const t = tresorerie(p.caisseId, p.compteBancaireId, p.modePaiement); const m = n(p.montant);
        if (!t || m === 0) { ignorees++; continue; }
        plans.push({ journalId: t.journal, date: p.datePaiement, libelle: `Paiement fournisseur ${p.numero}`, reference: p.numero, lignes: [{ compteId: C.fournisseurs!, debit: m, credit: 0 }, { compteId: t.compte, debit: 0, credit: m }], origine: { paiementFournisseurId: p.id } });
      }
    }

    if (typesVoulus.has('DEPENSE')) {
      const depenses = await prisma.depense.findMany({
        where: { societeId, statut: 'VALIDE', dateDepense: { gte: debut, lte: fin }, id: { notIn: [...dDep] } },
      });
      for (const d of depenses) {
        const m = n(d.montant);
        if (m === 0) { ignorees++; continue; }
        const t = d.caisseId || d.compteBancaireId ? tresorerie(d.caisseId, d.compteBancaireId, d.modePaiement) : null;
        const contrepartie = t ? t.compte : C.fournisseurs!;
        plans.push({ journalId: t ? t.journal : J.od!.id, date: d.dateDepense, libelle: `Dépense ${d.numero} — ${d.categorie}`, reference: d.numero, lignes: [{ compteId: C.services || C.achats!, debit: m, credit: 0 }, { compteId: contrepartie, debit: 0, credit: m }], origine: { depenseId: d.id } });
      }
    }

    // Création par lots (un appel ne traite pas plus de 300 documents)
    const LOT = 300;
    const lot = plans.slice(0, LOT);
    let generees = 0;
    for (const pl of lot) {
      const numero = await genererNumero(societeId, `ECRITURE_AUTO_${codeJournal.get(pl.journalId)}`);
      await prisma.ecritureComptable.create({
        data: {
          exerciceId: exo.id, journalId: pl.journalId, numero, dateEcriture: pl.date, libelle: pl.libelle, reference: pl.reference,
          createurId: req.user!.id, validee: true, dateValidation: new Date(), ...pl.origine,
          mouvements: { create: pl.lignes.map(l => ({ compteId: l.compteId, libelle: l.libelle || null, debit: l.debit, credit: l.credit })) },
        },
      });
      generees++;
    }
    const restantes = plans.length - lot.length;
    ApiResponse.success(res, { generees, ignorees, restantes },
      `${generees} écriture(s) générée(s) dans ${exo.code}${restantes > 0 ? ` — ${restantes} restante(s), relancez la génération` : ''}${ignorees > 0 ? ` (${ignorees} document(s) ignoré(s) : montant nul ou compte de trésorerie inconnu)` : ''}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== GRAND LIVRE (mouvements par compte) =====

router.get('/grand-livre', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId, compteId, classe, origine, dateDebut, dateFin } = req.query;
    const societeId = req.user!.societeId;

    const mouvements = await prisma.mouvementComptable.findMany({
      where: {
        compte: {
          societeId,
          ...(compteId && { id: compteId as string }),
          ...(classe && { classe: parseInt(classe as string) }),
        },
        ecriture: {
          ...(exerciceId && { exerciceId: exerciceId as string }),
          ...filtreOrigine(origine as string),
          ...(dateDebut && dateFin && { dateEcriture: { gte: new Date(dateDebut as string), lte: new Date(dateFin as string) } }),
        },
      },
      include: {
        compte: { select: { id: true, numero: true, libelle: true } },
        ecriture: { select: { id: true, numero: true, dateEcriture: true, libelle: true, reference: true, journal: { select: { code: true } } } },
      },
      orderBy: [{ compte: { numero: 'asc' } }, { ecriture: { dateEcriture: 'asc' } }],
    });

    const parCompte = new Map<string, any>();
    for (const m of mouvements) {
      let entry = parCompte.get(m.compte.id);
      if (!entry) {
        entry = { compte: m.compte, totalDebit: 0, totalCredit: 0, mouvements: [] };
        parCompte.set(m.compte.id, entry);
      }
      entry.totalDebit += Number(m.debit);
      entry.totalCredit += Number(m.credit);
      entry.mouvements.push({
        id: m.id, date: m.ecriture.dateEcriture, numeroEcriture: m.ecriture.numero,
        journal: m.ecriture.journal.code, libelle: m.libelle || m.ecriture.libelle,
        reference: m.ecriture.reference, debit: Number(m.debit), credit: Number(m.credit),
      });
    }
    const result = [...parCompte.values()].map(e => ({ ...e, solde: e.totalDebit - e.totalCredit }));

    ApiResponse.success(res, result);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== BALANCE =====

router.get('/balance', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId, origine, dateDebut, dateFin } = req.query;
    const societeId = req.user!.societeId;

    const comptes = await prisma.compteComptable.findMany({ where: { societeId }, orderBy: { numero: 'asc' } });

    const ecritureFilter: any = {
      ...(exerciceId && { exerciceId }),
      ...filtreOrigine(origine as string),
      ...(dateDebut && dateFin && { dateEcriture: { gte: new Date(dateDebut as string), lte: new Date(dateFin as string) } }),
    };

    const mouvements = await prisma.mouvementComptable.groupBy({
      by: ['compteId'],
      where: { compte: { societeId }, ecriture: ecritureFilter },
      _sum: { debit: true, credit: true },
    });
    const parCompte = new Map(mouvements.map(m => [m.compteId, { debit: Number(m._sum.debit || 0), credit: Number(m._sum.credit || 0) }]));

    const lignes = comptes
      .map(c => {
        const m = parCompte.get(c.id);
        if (!m) return null;
        const solde = m.debit - m.credit;
        return {
          compte: c.numero, libelle: c.libelle, classe: c.classe,
          debit: m.debit, credit: m.credit,
          soldeDebiteur: solde > 0 ? solde : 0, soldeCrediteur: solde < 0 ? -solde : 0,
        };
      })
      .filter(Boolean);

    const totaux = lignes.reduce((acc: any, l: any) => ({
      debit: acc.debit + l.debit, credit: acc.credit + l.credit,
      soldeDebiteur: acc.soldeDebiteur + l.soldeDebiteur, soldeCrediteur: acc.soldeCrediteur + l.soldeCrediteur,
    }), { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 });

    ApiResponse.success(res, { lignes, totaux });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== BILAN & COMPTE DE RESULTAT (simplifié SYSCOHADA, toujours consolidé Auto + Manuel) =====

router.get('/bilan', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId } = req.query;
    const societeId = req.user!.societeId;

    const comptes = await prisma.compteComptable.findMany({ where: { societeId } });
    const mouvements = await prisma.mouvementComptable.groupBy({
      by: ['compteId'],
      where: {
        compte: { societeId },
        ecriture: { ...(exerciceId && { exerciceId: exerciceId as string }) },
      },
      _sum: { debit: true, credit: true },
    });
    const parCompte = new Map(mouvements.map(m => [m.compteId, { debit: Number(m._sum.debit || 0), credit: Number(m._sum.credit || 0) }]));

    const soldeCompte = (c: { id: string }) => {
      const m = parCompte.get(c.id);
      return m ? m.debit - m.credit : 0;
    };

    // Bilan : classes 1-2-3-4-5 (comptes de bilan) ; Actif = soldes débiteurs, Passif = soldes créditeurs
    const comptesBilan = comptes.filter(c => c.type === 'BILAN');
    let totalActif = 0, totalPassif = 0;
    const actif: any[] = [], passif: any[] = [];
    for (const c of comptesBilan) {
      const solde = soldeCompte(c);
      if (Math.abs(solde) < 0.01) continue;
      if (solde > 0) { actif.push({ compte: c.numero, libelle: c.libelle, montant: solde }); totalActif += solde; }
      else { passif.push({ compte: c.numero, libelle: c.libelle, montant: -solde }); totalPassif += -solde; }
    }

    // Compte de résultat : classe 6 = charges (débit), classe 7 = produits (crédit)
    const comptesCharges = comptes.filter(c => c.classe === 6);
    const comptesProduits = comptes.filter(c => c.classe === 7);
    let totalCharges = 0, totalProduits = 0;
    const charges = comptesCharges.map(c => { const s = soldeCompte(c); totalCharges += s; return { compte: c.numero, libelle: c.libelle, montant: s }; }).filter(l => Math.abs(l.montant) >= 0.01);
    const produits = comptesProduits.map(c => { const s = -soldeCompte(c); totalProduits += s; return { compte: c.numero, libelle: c.libelle, montant: s }; }).filter(l => Math.abs(l.montant) >= 0.01);

    const resultatNet = totalProduits - totalCharges;

    ApiResponse.success(res, {
      bilan: { actif, passif, totalActif, totalPassif: totalPassif + (resultatNet !== 0 ? resultatNet : 0), resultatNet },
      compteResultat: { charges, produits, totalCharges, totalProduits, resultatNet },
    });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;
