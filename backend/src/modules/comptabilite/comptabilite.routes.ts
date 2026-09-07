import { Router, Response } from 'express';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import syscohadaPlanReference from '../../../prisma/data/syscohada-plan-reference.json';

const router = Router();
router.use(authenticate, requireSociete);

// ===== COMPTES (plan comptable) =====

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
    const result = await prisma.compteComptable.createMany({
      data: syscohadaPlanReference.map(c => ({
        societeId, numero: c.numero, libelle: c.libelle, classe: c.classe,
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
      orderBy: { code: 'desc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/exercices', authorize('COMPTABILITE:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, libelle, dateDebut, dateFin, source } = req.body;
    if (!code || !libelle || !dateDebut || !dateFin) { ApiResponse.badRequest(res, 'Code, libellé, date de début et date de fin sont requis'); return; }
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

// ===== JOURNAUX =====

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
    if (exercice.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }

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
    if (existing.validee) { ApiResponse.badRequest(res, 'Une écriture validée ne peut plus être modifiée'); return; }

    const { dateEcriture, libelle, reference, piece, mouvements } = req.body;
    if (mouvements) {
      if (!Array.isArray(mouvements) || mouvements.length < 2) { ApiResponse.badRequest(res, 'Une écriture doit comporter au moins 2 lignes'); return; }
      const totalDebit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.debit) || 0), 0);
      const totalCredit = mouvements.reduce((s: number, m: any) => s + (parseFloat(m.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        ApiResponse.badRequest(res, `L'écriture n'est pas équilibrée : débit ${totalDebit.toFixed(2)} ≠ crédit ${totalCredit.toFixed(2)}`);
        return;
      }
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
    if (exercice.cloture) { ApiResponse.badRequest(res, 'Cet exercice est clôturé'); return; }

    const numero = await genererNumero(req.user!.societeId, `ECRITURE_${journal.code}`);

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
    const { dateDebut, dateFin, sources } = req.body as { dateDebut?: string; dateFin?: string; sources?: string[] };
    const debut = dateDebut ? new Date(dateDebut) : new Date(new Date().getFullYear(), 0, 1);
    const fin = dateFin ? new Date(dateFin) : new Date();
    const typesVoulus = new Set(sources && sources.length > 0 ? sources : ['FACTURE', 'FACTURE_FOURNISSEUR', 'PAIEMENT', 'PAIEMENT_FOURNISSEUR', 'DEPENSE']);

    const dejaProposees = await prisma.ecritureEnAttente.findMany({
      where: { societeId },
      select: { factureId: true, factureFournisseurId: true, paiementId: true, paiementFournisseurId: true, depenseId: true },
    });
    const dejaFacture = new Set(dejaProposees.map(e => e.factureId).filter(Boolean));
    const dejaFactureFournisseur = new Set(dejaProposees.map(e => e.factureFournisseurId).filter(Boolean));
    const dejaPaiement = new Set(dejaProposees.map(e => e.paiementId).filter(Boolean));
    const dejaPaiementFournisseur = new Set(dejaProposees.map(e => e.paiementFournisseurId).filter(Boolean));
    const dejaDepense = new Set(dejaProposees.map(e => e.depenseId).filter(Boolean));

    const aCreer: any[] = [];

    if (typesVoulus.has('FACTURE')) {
      const factures = await prisma.facture.findMany({
        where: { societeId, statut: { notIn: ['BROUILLON', 'ANNULEE'] }, dateFacture: { gte: debut, lte: fin }, id: { notIn: [...dejaFacture] as string[] } },
        include: { client: { select: { raisonSociale: true } } },
      });
      for (const f of factures) {
        aCreer.push({
          societeId, source: 'FACTURE', factureId: f.id,
          libelle: `${f.type === 'AVOIR' ? 'Avoir' : 'Facture'} ${f.numero} — ${f.client?.raisonSociale || ''}`,
          montant: f.montantTTC, dateOperation: f.dateFacture,
        });
      }
    }

    if (typesVoulus.has('FACTURE_FOURNISSEUR')) {
      const factures = await prisma.factureFournisseur.findMany({
        where: { societeId, statut: { notIn: ['BROUILLON', 'ANNULEE'] }, dateFacture: { gte: debut, lte: fin }, id: { notIn: [...dejaFactureFournisseur] as string[] } },
        include: { fournisseur: { select: { raisonSociale: true } } },
      });
      for (const f of factures) {
        aCreer.push({
          societeId, source: 'FACTURE_FOURNISSEUR', factureFournisseurId: f.id,
          libelle: `Facture fournisseur ${f.numero} — ${f.fournisseur?.raisonSociale || ''}`,
          montant: f.montantTTC, dateOperation: f.dateFacture,
        });
      }
    }

    if (typesVoulus.has('PAIEMENT')) {
      const paiements = await prisma.paiement.findMany({
        where: { statut: 'VALIDE', datePaiement: { gte: debut, lte: fin }, id: { notIn: [...dejaPaiement] as string[] }, client: { societeId } },
      });
      for (const p of paiements) {
        aCreer.push({ societeId, source: 'PAIEMENT', paiementId: p.id, libelle: `Paiement client ${p.numero}`, montant: p.montant, dateOperation: p.datePaiement });
      }
    }

    if (typesVoulus.has('PAIEMENT_FOURNISSEUR')) {
      const paiements = await prisma.paiementFournisseur.findMany({
        where: { societeId, statut: 'VALIDE', datePaiement: { gte: debut, lte: fin }, id: { notIn: [...dejaPaiementFournisseur] as string[] } },
      });
      for (const p of paiements) {
        aCreer.push({ societeId, source: 'PAIEMENT_FOURNISSEUR', paiementFournisseurId: p.id, libelle: `Paiement fournisseur ${p.numero}`, montant: p.montant, dateOperation: p.datePaiement });
      }
    }

    if (typesVoulus.has('DEPENSE')) {
      const depenses = await prisma.depense.findMany({
        where: { societeId, statut: 'VALIDE', dateDepense: { gte: debut, lte: fin }, id: { notIn: [...dejaDepense] as string[] } },
      });
      for (const d of depenses) {
        aCreer.push({ societeId, source: 'DEPENSE', depenseId: d.id, libelle: `Dépense ${d.numero} — ${d.categorie}`, montant: d.montant, dateOperation: d.dateDepense });
      }
    }

    if (aCreer.length > 0) {
      await prisma.ecritureEnAttente.createMany({ data: aCreer });
    }
    ApiResponse.success(res, { suggerees: aCreer.length }, `${aCreer.length} suggestion(s) ajoutée(s) à la file d'attente`);
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
