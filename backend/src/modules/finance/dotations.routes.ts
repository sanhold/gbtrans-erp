import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const LIBELLE_RETOUR_RELIQUAT = 'Retour du reliquat de la dotation';

/** Reversement du reste d'une dotation soldée : compte crédité, montant, date et personne qui l'a reçu. */
function formaterReversement(op: any) {
  return {
    id: op.id,
    montant: Number(op.montant),
    date: op.dateOperation,
    beneficiaire: op.beneficiaire || null,
    compte: op.caisse
      ? { type: 'CAISSE', code: op.caisse.code, libelle: op.caisse.libelle }
      : op.compteBancaire
        ? { type: 'BANQUE', code: op.compteBancaire.code, libelle: op.compteBancaire.libelle, banque: op.compteBancaire.banque }
        : null,
  };
}

async function chargerReversement(societeId: string, numero: string) {
  return prisma.operationFinanciere.findFirst({
    where: { societeId, type: 'ENCAISSEMENT', reference: numero, libelle: { startsWith: LIBELLE_RETOUR_RELIQUAT }, statut: { not: 'ANNULEE' } },
    orderBy: { createdAt: 'desc' },
    include: { caisse: { select: { code: true, libelle: true } }, compteBancaire: { select: { code: true, libelle: true, banque: true } } },
  });
}

async function withMontants(dotations: any[]) {
  const ids = dotations.map((d) => d.id);
  // Reversements des dotations soldées, en une seule requête.
  const numerosSoldes = dotations.filter((d) => d.statut === 'SOLDEE').map((d) => d.numero as string);
  const opsRetour = numerosSoldes.length
    ? await prisma.operationFinanciere.findMany({
        where: { societeId: dotations[0].societeId, type: 'ENCAISSEMENT', reference: { in: numerosSoldes }, libelle: { startsWith: LIBELLE_RETOUR_RELIQUAT }, statut: { not: 'ANNULEE' } },
        orderBy: { createdAt: 'desc' },
        include: { caisse: { select: { code: true, libelle: true } }, compteBancaire: { select: { code: true, libelle: true, banque: true } } },
      })
    : [];
  const reversementParNumero = new Map<string, any>();
  for (const op of opsRetour) if (op.reference && !reversementParNumero.has(op.reference)) reversementParNumero.set(op.reference, formaterReversement(op));
  const sums = ids.length
    ? await prisma.depense.groupBy({ by: ['dotationId'], _sum: { montant: true }, where: { dotationId: { in: ids }, statut: { not: 'ANNULEE' } } })
    : [];
  const utiliseParId = new Map(sums.map((s) => [s.dotationId as string, Number(s._sum.montant || 0)]));
  // Une dotation est « soumise » dès qu'une de ses dépenses a quitté l'état de brouillon.
  const soumises = ids.length
    ? await prisma.justificatifDotation.groupBy({ by: ['dotationId'], _count: { _all: true }, where: { dotationId: { in: ids }, statut: { not: 'BROUILLON' } } })
    : [];
  const soumisParId = new Set(soumises.map((s) => s.dotationId as string));
  return dotations.map((d) => {
    const montantUtilise = utiliseParId.get(d.id) || 0;
    const soumise = soumisParId.has(d.id);
    return { ...d, montantUtilise, montantRestant: Number(d.montant) - montantUtilise, soumise, modifiable: d.statut === 'VALIDE' && !soumise, reversement: reversementParNumero.get(d.numero) || null };
  });
}

router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', numero, agentId, statut } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.DotationWhereInput = {
      societeId: req.user!.societeId,
      ...(numero && { numero: { contains: numero as string, mode: 'insensitive' } }),
      ...(agentId && { agentId: agentId as string }),
      ...(statut && { statut: statut as string }),
    };
    const [data, total] = await Promise.all([
      prisma.dotation.findMany({
        where, skip, take: Math.min(parseInt(limit as string) || 20, 100),
        orderBy: { dateDotation: 'desc' },
        relationLoadStrategy: 'join', include: { agent: { select: { id: true, nom: true, prenom: true } } },
      }),
      prisma.dotation.count({ where }),
    ]);
    ApiResponse.paginated(res, await withMontants(data), total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const dotation = await prisma.dotation.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      relationLoadStrategy: 'join', include: {
        agent: { select: { id: true, nom: true, prenom: true } },
        depenses: { orderBy: { dateDepense: 'desc' } },
      },
    });
    if (!dotation) { ApiResponse.notFound(res); return; }
    const [withTotal] = await withMontants([dotation]);
    ApiResponse.success(res, withTotal);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { montant, motif, agentId, dateDotation } = req.body;
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }
    if (!agentId) { ApiResponse.badRequest(res, 'Agent requis'); return; }

    const agent = await prisma.utilisateur.findFirst({ where: { id: agentId, societeId } });
    if (!agent) { ApiResponse.badRequest(res, 'Agent introuvable'); return; }

    const numero = await genererNumero(societeId, 'DOTATION');
    const dotation = await prisma.dotation.create({
      data: {
        societeId, numero, montant: montantNum, motif, agentId, createurId: req.user!.id,
        ...(dateDotation && { dateDotation: new Date(dateDotation) }),
      },
      include: { agent: { select: { id: true, nom: true, prenom: true } } },
    });
    ApiResponse.created(res, { ...dotation, montantUtilise: 0, montantRestant: montantNum }, 'Dotation créée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const existing = await prisma.dotation.findFirst({ where: { id: req.params.id, societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'SOLDEE') { ApiResponse.badRequest(res, 'Cette dotation est soldée : elle ne peut plus être modifiée'); return; }

    if (existing.statut !== 'VALIDE') { ApiResponse.badRequest(res, 'Cette dotation est annulée : elle ne peut plus être modifiée'); return; }
    const nbSoumis = await prisma.justificatifDotation.count({ where: { dotationId: req.params.id, statut: { not: 'BROUILLON' } } });
    if (nbSoumis > 0) { ApiResponse.badRequest(res, 'Cette dotation est déjà soumise à la trésorerie : elle ne peut plus être modifiée'); return; }

    const { montant, motif, agentId, dateDotation } = req.body;
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }

    if (agentId) {
      const agent = await prisma.utilisateur.findFirst({ where: { id: agentId, societeId } });
      if (!agent) { ApiResponse.badRequest(res, 'Agent introuvable'); return; }
    }

    const sum = await prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId: req.params.id, statut: { not: 'ANNULEE' } } });
    const montantUtilise = Number(sum._sum?.montant || 0);
    const brouillons = await prisma.justificatifDotation.aggregate({ _sum: { montant: true }, where: { dotationId: req.params.id, statut: 'BROUILLON' } });
    const montantBrouillon = Number(brouillons._sum?.montant || 0);
    if (montantNum < montantUtilise + montantBrouillon) {
      ApiResponse.badRequest(res, `Le montant ne peut pas être inférieur aux dépenses déjà saisies (${montantUtilise + montantBrouillon})`); return;
    }

    const dotation = await prisma.dotation.update({
      where: { id: req.params.id },
      data: { montant: montantNum, motif, ...(agentId && { agentId }), ...(dateDotation && { dateDotation: new Date(dateDotation) }) },
      include: { agent: { select: { id: true, nom: true, prenom: true } } },
    });
    ApiResponse.success(res, { ...dotation, montantUtilise, montantRestant: montantNum - montantUtilise, soumise: false, modifiable: true }, 'Dotation modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/annuler', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.dotation.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'SOLDEE') { ApiResponse.badRequest(res, 'Cette dotation est soldée : elle ne peut plus être annulée'); return; }
    const dotation = await prisma.dotation.update({ where: { id: req.params.id }, data: { statut: 'ANNULEE' } });
    ApiResponse.success(res, dotation, 'Dotation annulée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

/**
 * Renseigne « à qui » a été versé le reste d'une dotation soldée (pour les dotations validées avant la saisie du bénéficiaire,
 * ou pour corriger une erreur). N'enregistre aucun mouvement : seul le nom du bénéficiaire est modifié.
 */
router.patch('/:id/reversement', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const beneficiaire = typeof req.body?.beneficiaire === 'string' ? req.body.beneficiaire.trim() : '';
    if (!beneficiaire) { ApiResponse.badRequest(res, 'Indiquez à qui le reste a été versé'); return; }
    if (beneficiaire.length > 200) { ApiResponse.badRequest(res, 'Nom trop long (200 caractères maximum)'); return; }

    const dotation = await prisma.dotation.findFirst({ where: { id: req.params.id, societeId } });
    if (!dotation) { ApiResponse.notFound(res); return; }
    const op = await chargerReversement(societeId, dotation.numero);
    if (!op) { ApiResponse.notFound(res, "Aucun reversement n'est enregistré pour cette dotation"); return; }

    const maj = await prisma.operationFinanciere.update({
      where: { id: op.id }, data: { beneficiaire },
      include: { caisse: { select: { code: true, libelle: true } }, compteBancaire: { select: { code: true, libelle: true, banque: true } } },
    });
    ApiResponse.success(res, formaterReversement(maj), 'Bénéficiaire du reversement enregistré');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
