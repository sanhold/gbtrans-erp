/**
 * File de décision (comptabilité réelle).
 *
 * Toutes les transactions (factures, paiements, dépenses…) arrivent ici tant qu'aucune décision n'a été prise :
 *  - « Facture normalisée » (factures clients) : on enregistre le numéro FNE délivré par la DGI sur la facture ;
 *  - « Comptabilité réelle » (recevable) ;
 *  → dans les deux cas, la pièce est automatiquement ajoutée aux « Pièces à comptabiliser » (EcritureEnAttente) ;
 *  - « Corbeille » : la transaction quitte la file, sans être comptabilisée. Réversible. Les pièces rejetées
 *    (EcritureEnAttente REJETEE) sont aussi visibles dans la corbeille et peuvent y être restaurées.
 *
 * Compta Auto reste indépendante : elle ne lit ni n'écrit cette file.
 * Lecture : COMPTABILITE:LIRE. Décider, restaurer, corriger : COMPTABILITE:DECIDER.
 */
import { Router, Response } from 'express';
import { authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();

type Source = 'FACTURE' | 'FACTURE_FOURNISSEUR' | 'PAIEMENT' | 'PAIEMENT_FOURNISSEUR' | 'DEPENSE';
const SOURCES: Source[] = ['FACTURE', 'FACTURE_FOURNISSEUR', 'PAIEMENT', 'PAIEMENT_FOURNISSEUR', 'DEPENSE'];
const LIBELLE_SOURCE: Record<Source, string> = {
  FACTURE: 'Facture', FACTURE_FOURNISSEUR: 'Facture fournisseur', PAIEMENT: 'Paiement',
  PAIEMENT_FOURNISSEUR: 'Paiement fournisseur', DEPENSE: 'Dépense',
};
const COLONNE_FK: Record<Source, 'factureId' | 'factureFournisseurId' | 'paiementId' | 'paiementFournisseurId' | 'depenseId'> = {
  FACTURE: 'factureId', FACTURE_FOURNISSEUR: 'factureFournisseurId', PAIEMENT: 'paiementId',
  PAIEMENT_FOURNISSEUR: 'paiementFournisseurId', DEPENSE: 'depenseId',
};
const STATUTS_FACTURE_EXCLUS = ['BROUILLON', 'ANNULEE'] as const;
const LIMITE_PAR_SOURCE = 1000;
const MAX_LOT = 200;

interface Ligne {
  cle: string; kind: 'TRANSACTION' | 'DECISION' | 'REJET'; id: string; source: Source | 'MANUEL';
  typeLibelle: string; numero: string; tiers: string | null; libelle: string; montant: number; date: Date;
  decision?: { id: string; statut: string; numeroFne: string | null; motif: string | null; decidePar: string | null; date: Date };
}

const n = (v: unknown) => Number(v ?? 0);

/** Filtres de portée « société » et d'éligibilité (transactions valides, non brouillon) par type de source. */
function filtreSource(source: Source, societeId: string): Record<string, unknown> {
  switch (source) {
    case 'FACTURE': return { societeId, statut: { notIn: [...STATUTS_FACTURE_EXCLUS] } };
    case 'FACTURE_FOURNISSEUR': return { societeId, statut: { notIn: [...STATUTS_FACTURE_EXCLUS] } };
    case 'PAIEMENT': return { statut: 'VALIDE', OR: [{ client: { societeId } }, { createur: { societeId } }] };
    case 'PAIEMENT_FOURNISSEUR': return { societeId, statut: 'VALIDE' };
    case 'DEPENSE': return { societeId, statut: 'VALIDE' };
  }
}

async function transactionsADecider(societeId: string, types: Source[]): Promise<Ligne[]> {
  const sansDecision = { decisionFne: null };
  const lignes: Ligne[] = [];
  const base = { take: LIMITE_PAR_SOURCE };

  if (types.includes('FACTURE')) {
    const r = await prisma.facture.findMany({
      ...base, where: { ...filtreSource('FACTURE', societeId), ...sansDecision } as any, orderBy: { dateFacture: 'desc' },
      select: { id: true, numero: true, type: true, dateFacture: true, montantTTC: true, client: { select: { raisonSociale: true } } },
    });
    for (const f of r) lignes.push({ cle: `FACTURE:${f.id}`, kind: 'TRANSACTION', id: f.id, source: 'FACTURE', typeLibelle: f.type === 'FACTURE' ? 'Facture' : String(f.type), numero: f.numero, tiers: f.client?.raisonSociale ?? null, libelle: `Facture ${f.numero}`, montant: n(f.montantTTC), date: f.dateFacture });
  }
  if (types.includes('FACTURE_FOURNISSEUR')) {
    const r = await prisma.factureFournisseur.findMany({
      ...base, where: { ...filtreSource('FACTURE_FOURNISSEUR', societeId), ...sansDecision } as any, orderBy: { dateFacture: 'desc' },
      select: { id: true, numero: true, dateFacture: true, montantTTC: true, fournisseur: { select: { raisonSociale: true } } },
    });
    for (const f of r) lignes.push({ cle: `FACTURE_FOURNISSEUR:${f.id}`, kind: 'TRANSACTION', id: f.id, source: 'FACTURE_FOURNISSEUR', typeLibelle: LIBELLE_SOURCE.FACTURE_FOURNISSEUR, numero: f.numero, tiers: f.fournisseur?.raisonSociale ?? null, libelle: `Facture fournisseur ${f.numero}`, montant: n(f.montantTTC), date: f.dateFacture });
  }
  if (types.includes('PAIEMENT')) {
    const r = await prisma.paiement.findMany({
      ...base, where: { ...filtreSource('PAIEMENT', societeId), ...sansDecision } as any, orderBy: { datePaiement: 'desc' },
      select: { id: true, numero: true, datePaiement: true, montant: true, client: { select: { raisonSociale: true } } },
    });
    for (const p of r) lignes.push({ cle: `PAIEMENT:${p.id}`, kind: 'TRANSACTION', id: p.id, source: 'PAIEMENT', typeLibelle: LIBELLE_SOURCE.PAIEMENT, numero: p.numero, tiers: p.client?.raisonSociale ?? null, libelle: `Paiement client ${p.numero}`, montant: n(p.montant), date: p.datePaiement });
  }
  if (types.includes('PAIEMENT_FOURNISSEUR')) {
    const r = await prisma.paiementFournisseur.findMany({
      ...base, where: { ...filtreSource('PAIEMENT_FOURNISSEUR', societeId), ...sansDecision } as any, orderBy: { datePaiement: 'desc' },
      select: { id: true, numero: true, datePaiement: true, montant: true, fournisseur: { select: { raisonSociale: true } } },
    });
    for (const p of r) lignes.push({ cle: `PAIEMENT_FOURNISSEUR:${p.id}`, kind: 'TRANSACTION', id: p.id, source: 'PAIEMENT_FOURNISSEUR', typeLibelle: LIBELLE_SOURCE.PAIEMENT_FOURNISSEUR, numero: p.numero, tiers: p.fournisseur?.raisonSociale ?? null, libelle: `Paiement fournisseur ${p.numero}`, montant: n(p.montant), date: p.datePaiement });
  }
  if (types.includes('DEPENSE')) {
    const r = await prisma.depense.findMany({
      ...base, where: { ...filtreSource('DEPENSE', societeId), ...sansDecision } as any, orderBy: { dateDepense: 'desc' },
      select: { id: true, numero: true, dateDepense: true, montant: true, categorie: true, fournisseur: { select: { raisonSociale: true } } },
    });
    for (const d of r) lignes.push({ cle: `DEPENSE:${d.id}`, kind: 'TRANSACTION', id: d.id, source: 'DEPENSE', typeLibelle: LIBELLE_SOURCE.DEPENSE, numero: d.numero, tiers: d.fournisseur?.raisonSociale ?? null, libelle: `Dépense ${d.numero} — ${d.categorie}`, montant: n(d.montant), date: d.dateDepense });
  }
  return lignes;
}

const includeDecision = {
  facture: { select: { numero: true, type: true, dateFacture: true, montantTTC: true, client: { select: { raisonSociale: true } } } },
  factureFournisseur: { select: { numero: true, dateFacture: true, montantTTC: true, fournisseur: { select: { raisonSociale: true } } } },
  paiement: { select: { numero: true, datePaiement: true, montant: true, client: { select: { raisonSociale: true } } } },
  paiementFournisseur: { select: { numero: true, datePaiement: true, montant: true, fournisseur: { select: { raisonSociale: true } } } },
  depense: { select: { numero: true, dateDepense: true, montant: true, categorie: true, fournisseur: { select: { raisonSociale: true } } } },
} as const;

function ligneDepuisDecision(d: any): Ligne {
  let numero = '', tiers: string | null = null, montant = 0, date: Date = d.createdAt, libelle = '';
  if (d.facture) { numero = d.facture.numero; tiers = d.facture.client?.raisonSociale ?? null; montant = n(d.facture.montantTTC); date = d.facture.dateFacture; libelle = `Facture ${numero}`; }
  else if (d.factureFournisseur) { numero = d.factureFournisseur.numero; tiers = d.factureFournisseur.fournisseur?.raisonSociale ?? null; montant = n(d.factureFournisseur.montantTTC); date = d.factureFournisseur.dateFacture; libelle = `Facture fournisseur ${numero}`; }
  else if (d.paiement) { numero = d.paiement.numero; tiers = d.paiement.client?.raisonSociale ?? null; montant = n(d.paiement.montant); date = d.paiement.datePaiement; libelle = `Paiement client ${numero}`; }
  else if (d.paiementFournisseur) { numero = d.paiementFournisseur.numero; tiers = d.paiementFournisseur.fournisseur?.raisonSociale ?? null; montant = n(d.paiementFournisseur.montant); date = d.paiementFournisseur.datePaiement; libelle = `Paiement fournisseur ${numero}`; }
  else if (d.depense) { numero = d.depense.numero; tiers = d.depense.fournisseur?.raisonSociale ?? null; montant = n(d.depense.montant); date = d.depense.dateDepense; libelle = `Dépense ${numero} — ${d.depense.categorie}`; }
  return {
    cle: `DECISION:${d.id}`, kind: 'DECISION', id: d.id, source: d.source, typeLibelle: LIBELLE_SOURCE[d.source as Source] ?? d.source,
    numero, tiers, libelle, montant, date,
    decision: { id: d.id, statut: d.statut, numeroFne: d.numeroFne, motif: d.motif, decidePar: d.decidePar, date: d.updatedAt },
  };
}

function nomUtilisateur(req: AuthRequest): string | null {
  return `${req.user?.prenom || ''} ${req.user?.nom || ''}`.trim() || null;
}

// ===== LECTURE =====

router.get('/', authorize('COMPTABILITE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const vue = (req.query.vue as string) || 'a-decider';
    const type = req.query.type as string | undefined;
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const types = type && (SOURCES as string[]).includes(type) ? [type as Source] : SOURCES;

    let lignes: Ligne[] = [];
    if (vue === 'a-decider') {
      lignes = await transactionsADecider(societeId, types);
    } else if (vue === 'traitees') {
      const r = await prisma.decisionFne.findMany({
        where: { societeId, statut: { in: ['FACTURE_NORMALISEE', 'RECEVABLE'] }, ...(type ? { source: type as Source } : {}) },
        include: includeDecision, orderBy: { updatedAt: 'desc' }, take: 1000,
      });
      lignes = r.map(ligneDepuisDecision);
    } else if (vue === 'corbeille') {
      const [decisions, rejetees] = await Promise.all([
        prisma.decisionFne.findMany({ where: { societeId, statut: 'CORBEILLE', ...(type ? { source: type as Source } : {}) }, include: includeDecision, orderBy: { updatedAt: 'desc' }, take: 1000 }),
        type ? Promise.resolve([]) : prisma.ecritureEnAttente.findMany({ where: { societeId, statut: 'REJETEE' }, orderBy: { updatedAt: 'desc' }, take: 1000 }),
      ]);
      lignes = decisions.map(ligneDepuisDecision);
      for (const e of rejetees as any[]) {
        lignes.push({
          cle: `REJET:${e.id}`, kind: 'REJET', id: e.id, source: e.source, typeLibelle: 'Pièce rejetée', numero: '', tiers: null,
          libelle: e.libelle, montant: n(e.montant), date: e.dateOperation,
          decision: { id: e.id, statut: 'REJETEE', numeroFne: null, motif: e.motifRejet, decidePar: e.createurNom, date: e.updatedAt },
        });
      }
    } else { ApiResponse.badRequest(res, 'Vue inconnue'); return; }

    if (q) lignes = lignes.filter(l => `${l.numero} ${l.tiers ?? ''} ${l.libelle} ${l.decision?.numeroFne ?? ''}`.toLowerCase().includes(q));
    lignes.sort((a, b) => b.date.getTime() - a.date.getTime());
    const total = lignes.length;
    const items = lignes.slice((page - 1) * limit, page * limit);

    // Compteurs des onglets et des filtres par type
    const parType: Record<string, number> = {};
    await Promise.all(SOURCES.map(async (s) => {
      const where = { ...filtreSource(s, societeId), decisionFne: null } as any;
      parType[s] = await (prisma as any)[{ FACTURE: 'facture', FACTURE_FOURNISSEUR: 'factureFournisseur', PAIEMENT: 'paiement', PAIEMENT_FOURNISSEUR: 'paiementFournisseur', DEPENSE: 'depense' }[s]].count({ where });
    }));
    const [corbeilleDec, corbeilleRej, traitees] = await Promise.all([
      prisma.decisionFne.count({ where: { societeId, statut: 'CORBEILLE' } }),
      prisma.ecritureEnAttente.count({ where: { societeId, statut: 'REJETEE' } }),
      prisma.decisionFne.count({ where: { societeId, statut: { in: ['FACTURE_NORMALISEE', 'RECEVABLE'] } } }),
    ]);
    const compteurs = {
      aDecider: Object.values(parType).reduce((a, b) => a + b, 0), parType,
      corbeille: corbeilleDec + corbeilleRej, traitees,
    };

    ApiResponse.success(res, { items, total, page, limit, compteurs, tronque: lignes.length >= LIMITE_PAR_SOURCE * (vue === 'a-decider' ? types.length : 1) });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== DÉCISIONS =====

router.post('/decider', authorize('COMPTABILITE:DECIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { items, decision, numeroFne, motif } = req.body as { items?: { source: Source; id: string }[]; decision?: string; numeroFne?: string; motif?: string };
    if (!['FACTURE_NORMALISEE', 'RECEVABLE', 'CORBEILLE'].includes(decision || '')) { ApiResponse.badRequest(res, 'Décision invalide'); return; }
    if (!Array.isArray(items) || items.length === 0) { ApiResponse.badRequest(res, 'Sélectionnez au moins une transaction'); return; }
    if (items.length > MAX_LOT) { ApiResponse.badRequest(res, `Maximum ${MAX_LOT} transactions à la fois`); return; }
    if (items.some(i => !SOURCES.includes(i.source) || typeof i.id !== 'string')) { ApiResponse.badRequest(res, 'Transaction invalide'); return; }
    if (decision === 'FACTURE_NORMALISEE' && items.some(i => i.source !== 'FACTURE')) { ApiResponse.badRequest(res, 'Seules les factures clients peuvent être mises en facture normalisée'); return; }
    const fne = typeof numeroFne === 'string' ? numeroFne.trim().slice(0, 100) : '';
    const motifTexte = typeof motif === 'string' ? motif.trim().slice(0, 500) : '';
    const auteur = nomUtilisateur(req);

    const ignorees: { cle: string; raison: string }[] = [];
    let traitees = 0;

    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const cle = `${it.source}:${it.id}`;
        const where = { id: it.id, ...filtreSource(it.source, societeId), decisionFne: null } as any;
        let libelle = '', montant = 0, date = new Date();
        let trouve = false;
        switch (it.source) {
          case 'FACTURE': { const r = await tx.facture.findFirst({ where, select: { numero: true, montantTTC: true, dateFacture: true, client: { select: { raisonSociale: true } } } }); if (r) { trouve = true; libelle = `Facture ${r.numero}${r.client ? ` — ${r.client.raisonSociale}` : ''}`; montant = n(r.montantTTC); date = r.dateFacture; } break; }
          case 'FACTURE_FOURNISSEUR': { const r = await tx.factureFournisseur.findFirst({ where, select: { numero: true, montantTTC: true, dateFacture: true, fournisseur: { select: { raisonSociale: true } } } }); if (r) { trouve = true; libelle = `Facture fournisseur ${r.numero}${r.fournisseur ? ` — ${r.fournisseur.raisonSociale}` : ''}`; montant = n(r.montantTTC); date = r.dateFacture; } break; }
          case 'PAIEMENT': { const r = await tx.paiement.findFirst({ where, select: { numero: true, montant: true, datePaiement: true, client: { select: { raisonSociale: true } } } }); if (r) { trouve = true; libelle = `Paiement client ${r.numero}${r.client ? ` — ${r.client.raisonSociale}` : ''}`; montant = n(r.montant); date = r.datePaiement; } break; }
          case 'PAIEMENT_FOURNISSEUR': { const r = await tx.paiementFournisseur.findFirst({ where, select: { numero: true, montant: true, datePaiement: true, fournisseur: { select: { raisonSociale: true } } } }); if (r) { trouve = true; libelle = `Paiement fournisseur ${r.numero}${r.fournisseur ? ` — ${r.fournisseur.raisonSociale}` : ''}`; montant = n(r.montant); date = r.datePaiement; } break; }
          case 'DEPENSE': { const r = await tx.depense.findFirst({ where, select: { numero: true, montant: true, dateDepense: true, categorie: true } }); if (r) { trouve = true; libelle = `Dépense ${r.numero} — ${r.categorie}`; montant = n(r.montant); date = r.dateDepense; } break; }
        }
        if (!trouve) { ignorees.push({ cle, raison: 'Introuvable ou déjà traitée' }); continue; }

        const fk = { [COLONNE_FK[it.source]]: it.id };
        let ecritureAttenteId: string | null = null;
        if (decision !== 'CORBEILLE') {
          const ea = await tx.ecritureEnAttente.create({
            data: { societeId, source: it.source, ...fk, libelle: libelle.slice(0, 500), montant, dateOperation: date, createurNom: auteur },
          });
          ecritureAttenteId = ea.id;
        }
        await tx.decisionFne.create({
          data: {
            societeId, source: it.source, ...fk, statut: decision as any,
            numeroFne: decision === 'FACTURE_NORMALISEE' && fne ? fne : null,
            motif: decision === 'CORBEILLE' && motifTexte ? motifTexte : null,
            decidePar: auteur, ecritureAttenteId,
          },
        });
        traitees++;
      }
    });

    const msg = decision === 'CORBEILLE' ? `${traitees} transaction(s) mise(s) à la corbeille`
      : `${traitees} transaction(s) ajoutée(s) aux pièces à comptabiliser`;
    ApiResponse.success(res, { traitees, ignorees }, msg);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

/** Restaure de la corbeille : transaction -> de nouveau « à décider » ; pièce rejetée -> de nouveau « à comptabiliser ». */
router.post('/restaurer', authorize('COMPTABILITE:DECIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { items } = req.body as { items?: { kind: 'DECISION' | 'REJET'; id: string }[] };
    if (!Array.isArray(items) || items.length === 0) { ApiResponse.badRequest(res, 'Sélectionnez au moins un élément'); return; }
    if (items.length > MAX_LOT) { ApiResponse.badRequest(res, `Maximum ${MAX_LOT} éléments à la fois`); return; }
    let restaures = 0;
    const ignores: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        if (it.kind === 'DECISION') {
          const r = await tx.decisionFne.deleteMany({ where: { id: it.id, societeId, statut: 'CORBEILLE' } });
          if (r.count) restaures++; else ignores.push(it.id);
        } else if (it.kind === 'REJET') {
          const r = await tx.ecritureEnAttente.updateMany({ where: { id: it.id, societeId, statut: 'REJETEE' }, data: { statut: 'EN_ATTENTE', motifRejet: null } });
          if (r.count) restaures++; else ignores.push(it.id);
        } else ignores.push(String(it.id));
      }
    });
    ApiResponse.success(res, { restaures, ignores }, `${restaures} élément(s) restauré(s)`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

/** Renseigne ou corrige le numéro FNE d'une facture déjà mise en facture normalisée. */
router.patch('/:id/fne', authorize('COMPTABILITE:DECIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const d = await prisma.decisionFne.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!d) { ApiResponse.notFound(res, 'Décision introuvable'); return; }
    if (d.statut !== 'FACTURE_NORMALISEE') { ApiResponse.badRequest(res, "Cette transaction n'est pas en facture normalisée"); return; }
    const fne = typeof req.body.numeroFne === 'string' ? req.body.numeroFne.trim().slice(0, 100) : '';
    const maj = await prisma.decisionFne.update({ where: { id: d.id }, data: { numeroFne: fne || null } });
    ApiResponse.success(res, maj, 'Numéro FNE enregistré');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
