import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { assertDossierOuvert } from '../../utils/dossierGuard';
import { debiterCompte } from '../../utils/debiterCompte';

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
      where: { societeId, agentId: userId, statut: 'VALIDE' },
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
      const enAttente = d.justificatifs.filter((j) => j.statut === 'EN_ATTENTE').reduce((s, j) => s + Number(j.montant), 0);
      const utilise = utiliseParId.get(d.id) || 0;
      data.push({ ...d, justificatifs, montantUtilise: utilise, montantEnAttente: enAttente, montantRestant: Number(d.montant) - utilise - enAttente });
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
    if (!designation || !String(designation).trim()) { ApiResponse.badRequest(res, 'Désignation requise'); return; }
    if (!montant || montant <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }
    if (piece != null && piece !== '') {
      if (typeof piece !== 'string' || !PIECE_RE.test(piece)) { ApiResponse.badRequest(res, 'Pièce jointe : image (PNG, JPG, WebP) ou PDF attendu'); return; }
      if (piece.length > PIECE_MAX) { ApiResponse.badRequest(res, 'Pièce jointe trop volumineuse (3 Mo maximum)'); return; }
    }

    // Seul le bénéficiaire de la dotation peut y déposer des justificatifs.
    const dotation = await prisma.dotation.findFirst({ where: { id: dotationId, societeId, agentId: userId } });
    if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
    if (dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, 'Cette dotation est annulée'); return; }
    if (dossierId) await assertDossierOuvert(dossierId, societeId);

    const [dep, att] = await Promise.all([
      prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId, statut: { not: 'ANNULEE' } } }),
      prisma.justificatifDotation.aggregate({ _sum: { montant: true }, where: { dotationId, statut: 'EN_ATTENTE' } }),
    ]);
    const restant = Number(dotation.montant) - Number(dep._sum.montant || 0) - Number(att._sum.montant || 0);
    if (montant > restant) { ApiResponse.badRequest(res, `Montant supérieur au reste disponible sur cette dotation (${restant})`); return; }

    const j = await prisma.justificatifDotation.create({
      data: {
        societeId, dotationId, dossierId: dossierId || null, auteurId: userId,
        designation: String(designation).trim().slice(0, 500),
        categorie: categorie ? String(categorie).slice(0, 100) : 'DIVERS',
        montant,
        piece: piece || null,
        ...(dateJustificatif && { dateJustificatif: new Date(dateJustificatif) }),
      },
      select: SELECT_LISTE,
    });
    ApiResponse.created(res, j, 'Justificatif envoyé à la comptabilité');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', audit('FINANCE', 'SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const r = await prisma.justificatifDotation.deleteMany({
      where: { id: req.params.id, societeId: req.user!.societeId, auteurId: req.user!.id, statut: 'EN_ATTENTE' },
    });
    if (r.count === 0) { ApiResponse.badRequest(res, 'Justificatif introuvable ou déjà traité'); return; }
    ApiResponse.success(res, null, 'Justificatif supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ---------- Côté comptabilité ----------

router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const statut = String(req.query.statut || 'EN_ATTENTE');
    const items = await prisma.justificatifDotation.findMany({
      where: { societeId: req.user!.societeId, ...(statut !== 'TOUS' && { statut }) },
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
