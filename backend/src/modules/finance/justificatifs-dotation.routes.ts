import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { assertDossierOuvert } from '../../utils/dossierGuard';
import { debiterCompte, crediterCompte } from '../../utils/debiterCompte';

const router = Router();
router.use(authenticate, requireSociete);

const PIECE_MAX = 4_000_000; // ~3 Mo en base64
const PIECE_RE = /^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,/;
const MODES_PAIEMENT = ['ESPECES', 'CHEQUE', 'VIREMENT', 'MOBILE_MONEY', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'MOOV_MONEY'];

// Les listes n'embarquent jamais la pièce jointe (lourde) : on expose seulement `aPiece`, la pièce se lit via GET /:id/piece.
const SELECT_LISTE = {
  id: true, dotationId: true, dossierId: true, dateJustificatif: true, categorie: true, designation: true, montant: true,
  statut: true, motifRejet: true, dateValidation: true, depenseId: true, createdAt: true,
  dotation: { select: { id: true, numero: true } },
  dossier: { select: { id: true, numero: true, numeroPhysique: true } },
  auteur: { select: { id: true, nom: true, prenom: true } },
} as const;

const avecPiece = async <T extends { id: string }>(items: T[]) => {
  const avecPieceIds = items.length
    ? await prisma.justificatifDotation.findMany({ where: { id: { in: items.map((i) => i.id) }, piece: { not: null } }, select: { id: true } })
    : [];
  const set = new Set(avecPieceIds.map((r) => r.id));
  return items.map((i) => ({ ...i, aPiece: set.has(i.id) }));
};

const aLeDroit = (req: AuthRequest, permission: string) => !!req.user!.estAdmin || req.user!.permissions.includes(permission);

// ---------- Côté bénéficiaire : « Mes dotations » ----------

router.get('/mes-dotations', async (req: AuthRequest, res: Response) => {
  try {
    const { societeId, id: userId } = req.user!;
    const dotations = await prisma.dotation.findMany({
      where: { societeId, agentId: userId, statut: { in: ['VALIDE', 'SOLDEE'] } },
      orderBy: { dateDotation: 'desc' },
      relationLoadStrategy: 'join', include: { justificatifs: { select: SELECT_LISTE, orderBy: { createdAt: 'desc' } } },
    });
    const ids = dotations.map((d) => d.id);
    const sums = ids.length
      ? await prisma.depense.groupBy({ by: ['dotationId'], _sum: { montant: true }, where: { dotationId: { in: ids }, statut: { not: 'ANNULEE' } } })
      : [];
    const utiliseParId = new Map(sums.map((s) => [s.dotationId as string, Number(s._sum.montant || 0)]));
    const data = [];
    for (const d of dotations) {
      const justificatifs = await avecPiece(d.justificatifs);
      const somme = (statut: string) => d.justificatifs.filter((j) => j.statut === statut).reduce((s, j) => s + Number(j.montant), 0);
      const enAttente = somme('EN_ATTENTE');
      const brouillon = somme('BROUILLON');
      const nbBrouillon = d.justificatifs.filter((j) => j.statut === 'BROUILLON').length;
      const utilise = utiliseParId.get(d.id) || 0;
      data.push({ ...d, justificatifs, montantUtilise: utilise, montantEnAttente: enAttente, montantBrouillon: brouillon, nbBrouillon, montantRestant: Number(d.montant) - utilise - enAttente - brouillon });
    }
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { societeId, id: userId } = req.user!;
    const { dotationId, dossierId, designation, categorie, dateJustificatif, piece } = req.body;
    const montant = Number(req.body.montant);
    if (!dotationId) { ApiResponse.badRequest(res, 'Dotation requise'); return; }
    if (!dossierId) { ApiResponse.badRequest(res, 'Le dossier concerné est obligatoire pour chaque dépense'); return; }
    if (!designation || !String(designation).trim()) { ApiResponse.badRequest(res, 'Désignation requise'); return; }
    if (!montant || montant <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }
    if (piece != null && piece !== '') {
      if (typeof piece !== 'string' || !PIECE_RE.test(piece)) { ApiResponse.badRequest(res, 'Pièce jointe : image (PNG, JPG, WebP) ou PDF attendu'); return; }
      if (piece.length > PIECE_MAX) { ApiResponse.badRequest(res, 'Pièce jointe trop volumineuse (3 Mo maximum)'); return; }
    }

    // Seul le bénéficiaire de la dotation peut y déposer des justificatifs.
    const dotation = await prisma.dotation.findFirst({ where: { id: dotationId, societeId, agentId: userId } });
    if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
    if (dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, dotation.statut === 'SOLDEE' ? 'Cette dotation est soldée : plus aucune dépense ne peut y être ajoutée' : 'Cette dotation est annulée'); return; }
    await assertDossierOuvert(dossierId, societeId);

    const [dep, att] = await Promise.all([
      prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId, statut: { not: 'ANNULEE' } } }),
      prisma.justificatifDotation.aggregate({ _sum: { montant: true }, where: { dotationId, statut: { in: ['BROUILLON', 'EN_ATTENTE'] } } }),
    ]);
    const restant = Number(dotation.montant) - Number(dep._sum.montant || 0) - Number(att._sum.montant || 0);
    if (montant > restant) { ApiResponse.badRequest(res, `Montant supérieur au reste disponible sur cette dotation (${restant})`); return; }

    const j = await prisma.justificatifDotation.create({
      data: {
        societeId, dotationId, dossierId, auteurId: userId, statut: 'BROUILLON',
        designation: String(designation).trim().slice(0, 500),
        categorie: categorie ? String(categorie).slice(0, 100) : 'DIVERS',
        montant,
        piece: piece || null,
        ...(dateJustificatif && { dateJustificatif: new Date(dateJustificatif) }),
      },
      select: SELECT_LISTE,
    });
    ApiResponse.created(res, j, 'Dépense enregistrée en brouillon — soumettez votre état pour l\'envoyer à la trésorerie');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

/**
 * L'agent soumet son état de dépenses : toutes ses dépenses en brouillon sur la dotation passent « en attente »
 * dans la file de la trésorerie. Tant qu'il n'a pas soumis, la comptabilité ne voit rien.
 */
router.post('/soumettre', audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { societeId, id: userId } = req.user!;
    const { dotationId } = req.body;
    if (!dotationId) { ApiResponse.badRequest(res, 'Dotation requise'); return; }
    const dotation = await prisma.dotation.findFirst({ where: { id: dotationId, societeId, agentId: userId } });
    if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
    if (dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, dotation.statut === 'SOLDEE' ? 'Cette dotation est soldée : plus aucune dépense ne peut y être ajoutée' : 'Cette dotation est annulée'); return; }
    const r = await prisma.justificatifDotation.updateMany({
      where: { societeId, dotationId, auteurId: userId, statut: 'BROUILLON' },
      data: { statut: 'EN_ATTENTE' },
    });
    if (r.count === 0) { ApiResponse.badRequest(res, 'Aucune dépense en brouillon à soumettre'); return; }
    ApiResponse.success(res, { soumises: r.count }, `${r.count} dépense(s) envoyée(s) à la trésorerie pour validation`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', audit('FINANCE', 'SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const r = await prisma.justificatifDotation.deleteMany({
      where: { id: req.params.id, societeId: req.user!.societeId, auteurId: req.user!.id, statut: 'BROUILLON' },
    });
    if (r.count === 0) { ApiResponse.badRequest(res, 'Dépense introuvable, ou déjà soumise à la trésorerie'); return; }
    ApiResponse.success(res, null, 'Justificatif supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ---------- Côté comptabilité ----------


/** Montants d'une dotation : validé (dépenses), en attente (soumis), brouillon, reste à justifier. */
async function montantsDotation(dotationId: string, montantDotation: number) {
  const [dep, att, bro] = await Promise.all([
    prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId, statut: { not: 'ANNULEE' } } }),
    prisma.justificatifDotation.aggregate({ _sum: { montant: true }, where: { dotationId, statut: 'EN_ATTENTE' } }),
    prisma.justificatifDotation.aggregate({ _sum: { montant: true }, where: { dotationId, statut: 'BROUILLON' } }),
  ]);
  const montantUtilise = Number(dep._sum.montant || 0);
  const montantEnAttente = Number(att._sum.montant || 0);
  const montantBrouillon = Number(bro._sum.montant || 0);
  return { montantUtilise, montantEnAttente, montantBrouillon, montantRestant: montantDotation - montantUtilise - montantEnAttente - montantBrouillon };
}

/**
 * File de la trésorerie : une ligne par dotation.
 * vue = A_VALIDER (dotations avec des dépenses soumises, par défaut) | OUVERTES (toutes les dotations non soldées) | SOLDEES.
 */
router.get('/file', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const vue = String(req.query.vue || 'A_VALIDER');
    const where: any = { societeId, statut: vue === 'SOLDEES' ? 'SOLDEE' : 'VALIDE' };
    if (vue === 'A_VALIDER') where.justificatifs = { some: { statut: 'EN_ATTENTE' } };
    const dotations = await prisma.dotation.findMany({
      where, orderBy: { dateDotation: 'desc' }, take: 200,
      relationLoadStrategy: 'join', include: { agent: { select: { id: true, nom: true, prenom: true } } },
    });
    const ids = dotations.map((d) => d.id);
    const [attente, depenses] = ids.length ? await Promise.all([
      prisma.justificatifDotation.groupBy({ by: ['dotationId'], _sum: { montant: true }, _count: { _all: true }, where: { dotationId: { in: ids }, statut: 'EN_ATTENTE' } }),
      prisma.depense.groupBy({ by: ['dotationId'], _sum: { montant: true }, where: { dotationId: { in: ids }, statut: { not: 'ANNULEE' } } }),
    ]) : [[], []];
    const attParId = new Map(attente.map((a) => [a.dotationId, { n: a._count._all, m: Number(a._sum.montant || 0) }]));
    const depParId = new Map(depenses.map((d) => [d.dotationId as string, Number(d._sum.montant || 0)]));
    ApiResponse.success(res, dotations.map((d) => {
      const a = attParId.get(d.id);
      const utilise = depParId.get(d.id) || 0;
      return { id: d.id, numero: d.numero, dateDotation: d.dateDotation, motif: d.motif, montant: Number(d.montant), statut: d.statut, agent: d.agent,
        nbEnAttente: a?.n || 0, montantEnAttente: a?.m || 0, montantUtilise: utilise, montantRestant: Number(d.montant) - utilise };
    }));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

/** Détail d'une dotation pour la validation : informations de la dotation + dépenses soumises, validées ou rejetées (jamais les brouillons). */
router.get('/dotation/:dotationId', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const dotation = await prisma.dotation.findFirst({
      where: { id: req.params.dotationId, societeId },
      relationLoadStrategy: 'join', include: { agent: { select: { id: true, nom: true, prenom: true } } },
    });
    if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
    const items = await prisma.justificatifDotation.findMany({
      where: { dotationId: dotation.id, societeId, statut: { not: 'BROUILLON' } },
      orderBy: { createdAt: 'asc' }, select: SELECT_LISTE,
    });
    const m = await montantsDotation(dotation.id, Number(dotation.montant));
    ApiResponse.success(res, { dotation: { ...dotation, montant: Number(dotation.montant), ...m }, justificatifs: await avecPiece(items) });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

/** Le comptable saisit directement une dépense sur une dotation : elle arrive « en attente », prête à être cochée. */
router.post('/comptable', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { societeId, id: userId } = req.user!;
    const { dotationId, dossierId, designation, categorie, dateJustificatif, piece } = req.body;
    const montant = Number(req.body.montant);
    if (!dotationId) { ApiResponse.badRequest(res, 'Dotation requise'); return; }
    if (!dossierId) { ApiResponse.badRequest(res, 'Le dossier concerné est obligatoire pour chaque dépense'); return; }
    if (!designation || !String(designation).trim()) { ApiResponse.badRequest(res, 'Désignation requise'); return; }
    if (!montant || montant <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }
    if (piece != null && piece !== '') {
      if (typeof piece !== 'string' || !PIECE_RE.test(piece)) { ApiResponse.badRequest(res, 'Pièce jointe : image (PNG, JPG, WebP) ou PDF attendu'); return; }
      if (piece.length > PIECE_MAX) { ApiResponse.badRequest(res, 'Pièce jointe trop volumineuse (3 Mo maximum)'); return; }
    }
    const dotation = await prisma.dotation.findFirst({ where: { id: dotationId, societeId } });
    if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
    if (dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, dotation.statut === 'SOLDEE' ? 'Cette dotation est soldée' : 'Cette dotation est annulée'); return; }
    await assertDossierOuvert(dossierId, societeId);
    const m = await montantsDotation(dotationId, Number(dotation.montant));
    if (montant > m.montantRestant) { ApiResponse.badRequest(res, `Montant supérieur au reste disponible sur cette dotation (${m.montantRestant})`); return; }
    const j = await prisma.justificatifDotation.create({
      data: {
        societeId, dotationId, dossierId, auteurId: userId, statut: 'EN_ATTENTE',
        designation: String(designation).trim().slice(0, 500),
        categorie: categorie ? String(categorie).slice(0, 100) : 'DIVERS',
        montant, piece: piece || null,
        ...(dateJustificatif && { dateJustificatif: new Date(dateJustificatif) }),
      },
      select: SELECT_LISTE,
    });
    ApiResponse.created(res, j, 'Dépense ajoutée à la dotation');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

/**
 * Validation d'une dotation par la trésorerie :
 *  - le comptable coche les dépenses retenues (les autres dépenses soumises sont rejetées) ;
 *  - il choisit le compte débité : il est débité de toutes les sommes sorties pour la dotation
 *    (dépenses retenues + reliquat remis à l'agent) ;
 *  - s'il reste un reliquat, il choisit le compte sur lequel il est retourné (crédit) ;
 *  - la dotation est alors soldée.
 */
router.post('/valider-dotation', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { societeId, id: userId } = req.user!;
    const { dotationId, justificatifIds, caisseId, compteBancaireId, modePaiement, retour } = req.body;
    if (!dotationId) { ApiResponse.badRequest(res, 'Dotation requise'); return; }
    if (!Array.isArray(justificatifIds)) { ApiResponse.badRequest(res, 'Liste des dépenses retenues requise'); return; }
    if ((caisseId && compteBancaireId) || (!caisseId && !compteBancaireId)) {
      ApiResponse.badRequest(res, 'Choisissez exactement une caisse OU un compte bancaire à débiter'); return;
    }
    if (!MODES_PAIEMENT.includes(modePaiement)) { ApiResponse.badRequest(res, 'Mode de paiement invalide'); return; }

    const dotation = await prisma.dotation.findFirst({ where: { id: dotationId, societeId } });
    if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
    if (dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, dotation.statut === 'SOLDEE' ? 'Cette dotation est déjà soldée' : 'Cette dotation est annulée'); return; }

    const enAttente = await prisma.justificatifDotation.findMany({ where: { dotationId, societeId, statut: 'EN_ATTENTE' } });
    const retenus = enAttente.filter((j) => justificatifIds.includes(j.id));
    if (retenus.length !== new Set(justificatifIds).size) {
      ApiResponse.badRequest(res, 'Une des dépenses cochées est introuvable ou déjà traitée'); return;
    }
    const nonRetenus = enAttente.filter((j) => !justificatifIds.includes(j.id));
    for (const j of retenus) if (j.dossierId) await assertDossierOuvert(j.dossierId, societeId);

    const sommeRetenue = retenus.reduce((t, j) => t + Number(j.montant), 0);
    const dep = await prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId, statut: { not: 'ANNULEE' } } });
    const dejaValide = Number(dep._sum.montant || 0);
    const reliquat = Math.round((Number(dotation.montant) - dejaValide - sommeRetenue) * 100) / 100;
    if (reliquat < 0) { ApiResponse.badRequest(res, 'Les dépenses cochées dépassent le montant de la dotation'); return; }

    const compteDebit = caisseId
      ? await prisma.caisse.findFirst({ where: { id: caisseId, societeId } })
      : await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
    if (!compteDebit) { ApiResponse.notFound(res, 'Compte à débiter introuvable'); return; }

    let retourCaisseId: string | null = null;
    let retourBanqueId: string | null = null;
    if (reliquat > 0) {
      const rc = retour?.caisseId || null; const rb = retour?.compteBancaireId || null;
      if ((rc && rb) || (!rc && !rb)) { ApiResponse.badRequest(res, `Il reste ${reliquat} F : choisissez le compte sur lequel ce reliquat est retourné`); return; }
      const compteRetour = rc
        ? await prisma.caisse.findFirst({ where: { id: rc, societeId } })
        : await prisma.compteBancaire.findFirst({ where: { id: rb, societeId } });
      if (!compteRetour) { ApiResponse.notFound(res, 'Compte de retour introuvable'); return; }
      retourCaisseId = rc; retourBanqueId = rb;
    }

    // Numéros générés avant la transaction (comme pour la validation d'une dépense isolée).
    const numeros: { depense: string; operation: string }[] = [];
    for (let i = 0; i < retenus.length; i++) {
      numeros.push({ depense: await genererNumero(societeId, 'DEPENSE'), operation: await genererNumero(societeId, 'OPERATION_FINANCIERE') });
    }
    const numOpReliquatSortie = reliquat > 0 ? await genererNumero(societeId, 'OPERATION_FINANCIERE') : '';
    const numOpReliquatRetour = reliquat > 0 ? await genererNumero(societeId, 'OPERATION_FINANCIERE') : '';

    await prisma.$transaction(async (tx) => {
      // Garde anti double validation : la dotation ne passe VALIDE -> SOLDEE qu'une seule fois.
      const maj = await tx.dotation.updateMany({ where: { id: dotationId, societeId, statut: 'VALIDE' }, data: { statut: 'SOLDEE' } });
      if (maj.count !== 1) throw new Error('Cette dotation vient d\'être traitée');

      for (let i = 0; i < retenus.length; i++) {
        const j = retenus[i];
        const marque = await tx.justificatifDotation.updateMany({
          where: { id: j.id, statut: 'EN_ATTENTE' },
          data: { statut: 'VALIDE', valideParId: userId, dateValidation: new Date() },
        });
        if (marque.count !== 1) throw new Error('Une dépense vient d\'être traitée par quelqu\'un d\'autre');
        const d = await tx.depense.create({
          data: {
            societeId, numero: numeros[i].depense, dossierId: j.dossierId, caisseId: caisseId || null, compteBancaireId: compteBancaireId || null,
            dotationId, categorie: j.categorie, designation: j.designation, montant: Number(j.montant),
            modePaiement, reference: dotation.numero, observations: 'Dépense de dotation validée par la trésorerie',
            dateDepense: j.dateJustificatif,
          },
        });
        await tx.operationFinanciere.create({
          data: {
            societeId, numero: numeros[i].operation, type: 'DECAISSEMENT', sens: 'SORTIE',
            caisseId: caisseId || null, compteBancaireId: compteBancaireId || null,
            montant: Number(j.montant), libelle: j.designation, reference: numeros[i].depense,
          },
        });
        await tx.justificatifDotation.update({ where: { id: j.id }, data: { depenseId: d.id } });
      }

      // Dépenses non cochées : rejetées (l'argent correspondant fait partie du reliquat retourné).
      if (nonRetenus.length > 0) {
        await tx.justificatifDotation.updateMany({
          where: { id: { in: nonRetenus.map((j) => j.id) }, statut: 'EN_ATTENTE' },
          data: { statut: 'REJETE', motifRejet: 'Non retenue lors de la validation de la dotation', valideParId: userId, dateValidation: new Date() },
        });
      }

      // Le compte choisi est débité de tout ce qui est sorti pour la dotation : dépenses retenues + reliquat remis à l'agent.
      await debiterCompte(tx, { caisseId, compteBancaireId }, sommeRetenue + reliquat);
      if (reliquat > 0) {
        await tx.operationFinanciere.create({
          data: {
            societeId, numero: numOpReliquatSortie, type: 'DECAISSEMENT', sens: 'SORTIE',
            caisseId: caisseId || null, compteBancaireId: compteBancaireId || null,
            montant: reliquat, libelle: `Fonds non dépensés de la dotation ${dotation.numero}`, reference: dotation.numero,
          },
        });
        await crediterCompte(tx, { caisseId: retourCaisseId, compteBancaireId: retourBanqueId }, reliquat);
        await tx.operationFinanciere.create({
          data: {
            societeId, numero: numOpReliquatRetour, type: 'ENCAISSEMENT', sens: 'ENTREE',
            caisseId: retourCaisseId, compteBancaireId: retourBanqueId,
            montant: reliquat, libelle: `Retour du reliquat de la dotation ${dotation.numero}`, reference: dotation.numero,
          },
        });
      }
    });

    ApiResponse.success(res, { retenues: retenus.length, rejetees: nonRetenus.length, reliquat, sommeRetenue },
      `Dotation ${dotation.numero} validée : ${retenus.length} dépense(s) enregistrée(s)${reliquat > 0 ? `, ${reliquat} F retournés` : ''}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const statut = String(req.query.statut || 'EN_ATTENTE');
    const items = await prisma.justificatifDotation.findMany({
      where: { societeId: req.user!.societeId, statut: statut !== 'TOUS' ? (statut === 'BROUILLON' ? 'EN_ATTENTE' : statut) : { not: 'BROUILLON' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: SELECT_LISTE,
    });
    ApiResponse.success(res, await avecPiece(items));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id/piece', async (req: AuthRequest, res: Response) => {
  try {
    const j = await prisma.justificatifDotation.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      select: { piece: true, auteurId: true },
    });
    if (!j || !j.piece) { ApiResponse.notFound(res, 'Pièce introuvable'); return; }
    if (j.auteurId !== req.user!.id && !aLeDroit(req, 'FINANCE:LIRE')) { ApiResponse.forbidden(res, 'Permissions insuffisantes'); return; }
    ApiResponse.success(res, { piece: j.piece });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/:id/valider', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { societeId, id: userId } = req.user!;
    const { caisseId, compteBancaireId, modePaiement } = req.body;
    if ((caisseId && compteBancaireId) || (!caisseId && !compteBancaireId)) {
      ApiResponse.badRequest(res, 'Choisissez exactement une caisse OU un compte bancaire à débiter'); return;
    }
    if (!MODES_PAIEMENT.includes(modePaiement)) { ApiResponse.badRequest(res, 'Mode de paiement invalide'); return; }

    const j = await prisma.justificatifDotation.findFirst({ where: { id: req.params.id, societeId }, relationLoadStrategy: 'join', include: { dotation: true } });
    if (!j) { ApiResponse.notFound(res, 'Justificatif introuvable'); return; }
    if (j.statut !== 'EN_ATTENTE') { ApiResponse.badRequest(res, 'Ce justificatif est déjà traité'); return; }
    if (j.dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, 'Cette dotation est annulée'); return; }
    if (j.dossierId) await assertDossierOuvert(j.dossierId, societeId);

    const compte = caisseId
      ? await prisma.caisse.findFirst({ where: { id: caisseId, societeId } })
      : await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
    if (!compte) { ApiResponse.notFound(res, 'Compte introuvable'); return; }

    const montant = Number(j.montant);
    const dep = await prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId: j.dotationId, statut: { not: 'ANNULEE' } } });
    const restant = Number(j.dotation.montant) - Number(dep._sum.montant || 0);
    if (montant > restant) { ApiResponse.badRequest(res, `Montant supérieur au reste disponible sur la dotation (${restant})`); return; }

    const numero = await genererNumero(societeId, 'DEPENSE');
    const numeroOperation = await genererNumero(societeId, 'OPERATION_FINANCIERE');

    const depense = await prisma.$transaction(async (tx) => {
      // Garde anti double validation : seule la première requête passe EN_ATTENTE -> VALIDE.
      const maj = await tx.justificatifDotation.updateMany({
        where: { id: j.id, statut: 'EN_ATTENTE' },
        data: { statut: 'VALIDE', valideParId: userId, dateValidation: new Date() },
      });
      if (maj.count !== 1) throw new Error('Ce justificatif est déjà traité');

      const d = await tx.depense.create({
        data: {
          societeId, numero, dossierId: j.dossierId, caisseId: caisseId || null, compteBancaireId: compteBancaireId || null,
          dotationId: j.dotationId, categorie: j.categorie, designation: j.designation, montant,
          modePaiement, reference: j.dotation.numero, observations: 'Justificatif de dotation validé par la comptabilité',
          dateDepense: j.dateJustificatif,
        },
      });
      await tx.operationFinanciere.create({
        data: {
          societeId, numero: numeroOperation, type: 'DECAISSEMENT', sens: 'SORTIE',
          caisseId: caisseId || null, compteBancaireId: compteBancaireId || null,
          montant, libelle: j.designation, reference: numero,
        },
      });
      await debiterCompte(tx, { caisseId, compteBancaireId }, montant);
      await tx.justificatifDotation.update({ where: { id: j.id }, data: { depenseId: d.id } });
      return d;
    });

    ApiResponse.success(res, depense, `Justificatif validé — dépense ${depense.numero} enregistrée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/:id/rejeter', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const motif = req.body.motif ? String(req.body.motif).trim().slice(0, 500) : '';
    if (!motif) { ApiResponse.badRequest(res, 'Un motif est obligatoire pour rejeter un justificatif'); return; }
    const r = await prisma.justificatifDotation.updateMany({
      where: { id: req.params.id, societeId: req.user!.societeId, statut: 'EN_ATTENTE' },
      data: { statut: 'REJETE', motifRejet: motif, valideParId: req.user!.id, dateValidation: new Date() },
    });
    if (r.count === 0) { ApiResponse.badRequest(res, 'Justificatif introuvable ou déjà traité'); return; }
    ApiResponse.success(res, null, 'Justificatif rejeté');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
