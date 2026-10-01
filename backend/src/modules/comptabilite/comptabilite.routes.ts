import { Router, Response } from 'express';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import syscohadaPlanReference from '../../../prisma/data/syscohada-plan-reference.json';

const router = Router();
router.use(authenticate, requireSociete);

type Source = 'AUTO' | 'REEL';
const LIBELLE_SOURCE: Record<Source, string> = { AUTO: 'Compta Auto', REEL: 'Compta Réel' };

/** La comptabilité visée (Réel ou Auto) est obligatoire : plan comptable, journaux et exercices sont indépendants. */
function sourceDe(req: AuthRequest, res: Response): Source | null {
  const v = (req.query.source ?? req.body?.source) as string | undefined;
  if (v !== 'AUTO' && v !== 'REEL') { ApiResponse.badRequest(res, 'Le type de comptabilité (AUTO ou REEL) est requis'); return null; }
  return v;
}

/** Vérifie qu'un journal et des comptes appartiennent bien à la comptabilité de l'exercice. */
async function verifierCoherenceSource(societeId: string, exercice: { source: Source }, journal: { source: Source }, compteIds: string[]): Promise<string | null> {
  if (journal.source !== exercice.source) return `Ce journal appartient à ${LIBELLE_SOURCE[journal.source]} : l'exercice choisi est celui de ${LIBELLE_SOURCE[exercice.source]}`;
  const ids = [...new Set(compteIds.filter(Boolean))];
  if (ids.length === 0) return 'Aucun compte renseigné';
  const ok = await prisma.compteComptable.count({ where: { id: { in: ids }, societeId, source: exercice.source } });
  if (ok !== ids.length) return `Un ou plusieurs comptes n'appartiennent pas au plan comptable de ${LIBELLE_SOURCE[exercice.source]}`;
  return null;
}

// ===== COMPTES (plan comptable) =====

router.get('/comptes', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { tous } = req.query;
    const source = sourceDe(req, res); if (!source) return;
    const comptes = await prisma.compteComptable.findMany({
      where: { societeId: req.user!.societeId, source, ...(tous !== '1' && { actif: true }) },
      orderBy: { numero: 'asc' },
    });
    ApiResponse.success(res, comptes);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/comptes', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { numero, libelle, classe, type, nature, sens, parent, collectif, lettrable, rapprochable } = req.body;
    const source = sourceDe(req, res); if (!source) return;
    if (!numero || !libelle || !classe || !type || !nature) { ApiResponse.badRequest(res, 'Numéro, libellé, classe, type et nature sont requis'); return; }
    const compte = await prisma.compteComptable.create({
      data: {
        societeId: req.user!.societeId, source, numero: String(numero).trim(), libelle, classe: parseInt(classe),
        type, nature, sens: sens || 'DEBITEUR', parent: parent || null,
        niveau: String(numero).trim().length <= 2 ? 1 : String(numero).trim().length,
        collectif: !!collectif, lettrable: !!lettrable, rapprochable: !!rapprochable,
      },
    });
    ApiResponse.created(res, compte, 'Compte créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Ce numéro de compte existe déjà dans ce plan comptable' : e.message); }
});

router.put('/comptes/:id', authorize('COMPTABILITE:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    const { libelle, classe, type, nature, sens, parent, collectif, lettrable, rapprochable, actif } = req.body;
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

router.delete('/comptes/:id', authorize('COMPTABILITE:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteComptable.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    const mouvement = await prisma.mouvementComptable.findFirst({ where: { compteId: req.params.id } });
    if (mouvement) { ApiResponse.badRequest(res, 'Ce compte a des mouvements comptables : il ne peut pas être supprimé, seulement désactivé'); return; }
    await prisma.compteComptable.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Compte supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/comptes/importer-syscohada', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const source = sourceDe(req, res); if (!source) return;
    const result = await prisma.compteComptable.createMany({
      data: syscohadaPlanReference.map(c => ({
        societeId, source, numero: c.numero, libelle: c.libelle, classe: c.classe,
        type: c.type as any, nature: c.nature as any, sens: c.sens as any,
        niveau: c.numero.length,
      })),
      skipDuplicates: true,
    });
    ApiResponse.success(res, { importes: result.count, total: syscohadaPlanReference.length }, `${result.count} compte(s) importé(s) (${syscohadaPlanReference.length - result.count} déjà présent(s))`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== EXERCICES =====

router.get('/exercices', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { source } = req.query;
    const data = await prisma.exercice.findMany({
      where: { societeId: req.user!.societeId, ...(source && { source: source as any }) },
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
    const { code, libelle, dateDebut, dateFin, source } = req.body;
    if (!code || !libelle || !dateDebut || !dateFin) { ApiResponse.badRequest(res, 'Code, libellé, date de début et date de fin sont requis'); return; }
    const debut = new Date(dateDebut); const fin = new Date(dateFin);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || fin <= debut) { ApiResponse.badRequest(res, 'La date de fin doit être postérieure à la date de début'); return; }
    const sourceExo = source === 'REEL' ? 'REEL' : 'AUTO';
    const chevauche = await prisma.exercice.findFirst({
      where: { societeId: req.user!.societeId, source: sourceExo, dateDebut: { lte: fin }, dateFin: { gte: debut } },
    });
    if (chevauche) { ApiResponse.badRequest(res, `Cette période chevauche l'exercice ${chevauche.code} (${chevauche.libelle})`); return; }
    const exercice = await prisma.exercice.create({
      data: {
        societeId: req.user!.societeId, code, libelle,
        dateDebut: new Date(dateDebut), dateFin: new Date(dateFin),
        source: source === 'REEL' ? 'REEL' : 'AUTO',
      },
    });
    ApiResponse.created(res, exercice, 'Exercice créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Un exercice avec ce code existe déjà pour ce type de comptabilité' : e.message); }
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

// ===== JOURNAUX =====

router.get('/journaux', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const source = sourceDe(req, res); if (!source) return;
    const data = await prisma.journalComptable.findMany({
      where: { societeId: req.user!.societeId, source },
      orderBy: { code: 'asc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/journaux', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, libelle, type, compteContrepartie } = req.body;
    const source = sourceDe(req, res); if (!source) return;
    if (!code || !libelle || !type) { ApiResponse.badRequest(res, 'Code, libellé et type sont requis'); return; }
    const journal = await prisma.journalComptable.create({
      data: { societeId: req.user!.societeId, source, code: String(code).trim().toUpperCase(), libelle, type, compteContrepartie: compteContrepartie || null },
    });
    ApiResponse.created(res, journal, 'Journal créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Ce code de journal existe déjà dans cette comptabilité' : e.message); }
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

// ===== ECRITURES (détail d'un journal) =====

router.get('/ecritures', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '30', journalId, exerciceId, source, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {
      journal: { societeId: req.user!.societeId },
      ...(journalId && { journalId }),
      ...(exerciceId && { exerciceId }),
      ...(source && { exercice: { source: source as any } }),
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
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
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
    { const err = await verifierCoherenceSource(req.user!.societeId, exercice, journal, mouvements.map((m: any) => m.compteId)); if (err) { ApiResponse.badRequest(res, err); return; } }
    if (exercice.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }
    { const d = new Date(dateEcriture); if (d < exercice.dateDebut || d > exercice.dateFin) { ApiResponse.badRequest(res, `La date de l'écriture doit être comprise dans l'exercice ${exercice.code} (${exercice.dateDebut.toLocaleDateString('fr-FR')} – ${exercice.dateFin.toLocaleDateString('fr-FR')})`); return; } }

    const numero = await genererNumero(req.user!.societeId, journal.source === 'AUTO' ? `ECRITURE_AUTO_${journal.code}` : `ECRITURE_${journal.code}`);
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
    }

    if (mouvements && exoEcriture) {
      const journalEcr = await prisma.journalComptable.findUnique({ where: { id: existing.journalId } });
      if (journalEcr) { const err = await verifierCoherenceSource(req.user!.societeId, exoEcriture, journalEcr, mouvements.map((m: any) => m.compteId)); if (err) { ApiResponse.badRequest(res, err); return; } }
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
    if (existing.validee) { ApiResponse.badRequest(res, 'Une écriture validée ne peut pas être supprimée'); return; }
    await prisma.ecritureComptable.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Écriture supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== ÉCRITURES EN ATTENTE DE COMPTABILISATION (Compta Réel) =====

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
    ApiResponse.created(res, entree, 'Entrée ajoutée à la file d\'attente');
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
    { const err = await verifierCoherenceSource(req.user!.societeId, exercice, journal, mouvements.map((m: any) => m.compteId)); if (err) { ApiResponse.badRequest(res, err); return; } }
    if (exercice.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }
    { const d = new Date(dateEcriture); if (d < exercice.dateDebut || d > exercice.dateFin) { ApiResponse.badRequest(res, `La date de l'écriture doit être comprise dans l'exercice ${exercice.code} (${exercice.dateDebut.toLocaleDateString('fr-FR')} – ${exercice.dateFin.toLocaleDateString('fr-FR')})`); return; } }

    const numero = await genererNumero(req.user!.societeId, journal.source === 'AUTO' ? `ECRITURE_AUTO_${journal.code}` : `ECRITURE_${journal.code}`);

    const ecriture = await prisma.$transaction(async (tx) => {
      const created = await tx.ecritureComptable.create({
        data: {
          exerciceId, journalId, numero,
          dateEcriture: new Date(dateEcriture),
          libelle, reference: reference || null, piece: piece || null,
          createurId: req.user!.id,
          factureId: entree.factureId || undefined,
          paiementId: entree.paiementId || undefined,
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
    ApiResponse.success(res, updated, 'Entrée rejetée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== COMPTA AUTO (génération de suggestions vers la file d'attente) =====

router.post('/compta-auto/generer', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { dateDebut, dateFin, sources, exerciceId } = req.body as { dateDebut?: string; dateFin?: string; sources?: string[]; exerciceId?: string };
    if (!exerciceId) { ApiResponse.badRequest(res, 'Choisissez un exercice Compta Auto'); return; }
    const exo = await prisma.exercice.findFirst({ where: { id: exerciceId, societeId } });
    if (!exo) { ApiResponse.notFound(res, 'Exercice introuvable'); return; }
    if (exo.source !== 'AUTO') { ApiResponse.badRequest(res, "Cet exercice n'appartient pas à Compta Auto"); return; }
    if (exo.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }

    const debut = new Date(Math.max(dateDebut ? new Date(dateDebut).getTime() : 0, exo.dateDebut.getTime()));
    const fin = new Date(Math.min(dateFin ? new Date(dateFin).getTime() : Infinity, exo.dateFin.getTime()));
    const typesVoulus = new Set(sources && sources.length > 0 ? sources : ['FACTURE', 'FACTURE_FOURNISSEUR', 'PAIEMENT', 'PAIEMENT_FOURNISSEUR', 'DEPENSE']);

    // Plan comptable et journaux propres à Compta Auto
    const [comptes, journaux] = await Promise.all([
      prisma.compteComptable.findMany({ where: { societeId, source: 'AUTO', actif: true }, select: { id: true, numero: true } }),
      prisma.journalComptable.findMany({ where: { societeId, source: 'AUTO', actif: true }, select: { id: true, code: true, type: true } }),
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
      ApiResponse.badRequest(res, `Le paramétrage de Compta Auto est incomplet. ${manquantsComptes.length ? `Comptes manquants : ${manquantsComptes.join(', ')}. ` : ''}${manquantsJournaux.length ? `Journaux manquants : ${manquantsJournaux.join(', ')}. ` : ''}Complétez-le dans Paramètres Auto.`);
      return;
    }
    const codeJournal = new Map(journaux.map(j => [j.id, j.code]));

    // Documents déjà comptabilisés dans Compta Auto
    const deja = await prisma.ecritureComptable.findMany({
      where: { exercice: { societeId, source: 'AUTO' } },
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
    const { exerciceId, compteId, classe, source, dateDebut, dateFin } = req.query;
    const societeId = req.user!.societeId;

    // Une seule requête pour tous les mouvements (au lieu d'une par compte) : c'était
    // le principal goulot d'étranglement de cette page (jusqu'à plusieurs dizaines de
    // requêtes séquentielles). On groupe par compte côté application.
    const mouvements = await prisma.mouvementComptable.findMany({
      where: {
        compte: {
          societeId,
          ...(compteId && { id: compteId as string }),
          ...(classe && { classe: parseInt(classe as string) }),
        },
        ecriture: {
          ...(exerciceId && { exerciceId: exerciceId as string }),
          ...(source && { exercice: { source: source as any } }),
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

// ===== BALANCE (générale) =====

router.get('/balance', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId, source, dateDebut, dateFin } = req.query;
    const societeId = req.user!.societeId;

    const comptes = await prisma.compteComptable.findMany({ where: { societeId }, orderBy: { numero: 'asc' } });

    const ecritureFilter: any = {
      ...(exerciceId && { exerciceId }),
      ...(source && { exercice: { source: source as any } }),
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

// ===== BILAN & COMPTE DE RESULTAT (simplifié SYSCOHADA) =====

router.get('/bilan', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId, source } = req.query;
    const societeId = req.user!.societeId;

    const comptes = await prisma.compteComptable.findMany({ where: { societeId } });
    const mouvements = await prisma.mouvementComptable.groupBy({
      by: ['compteId'],
      where: {
        compte: { societeId },
        ecriture: {
          ...(exerciceId && { exerciceId: exerciceId as string }),
          ...(source && { exercice: { source: source as any } }),
        },
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
