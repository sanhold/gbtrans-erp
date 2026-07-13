import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';
import { assertDossierOuvert } from '../../utils/dossierGuard';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', categorie, dossierId, fournisseurId, dotationId, statut, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.DepenseWhereInput = {
      societeId: req.user!.societeId,
      ...(categorie && { categorie: categorie as string }),
      ...(dossierId && { dossierId: dossierId as string }),
      ...(fournisseurId && { fournisseurId: fournisseurId as string }),
      ...(dotationId && { dotationId: dotationId as string }),
      ...(statut && { statut: statut as string }),
      ...((dateDebut || dateFin) && {
        dateDepense: {
          ...(dateDebut && { gte: new Date(dateDebut as string) }),
          ...(dateFin && { lte: new Date(dateFin as string) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.depense.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateDepense: 'desc' },
        include: {
          dossier: { select: { id: true, numero: true } },
          fournisseur: { select: { id: true, raisonSociale: true } },
          caisse: { select: { id: true, code: true, libelle: true } },
          compteBancaire: { select: { id: true, code: true, libelle: true } },
          dotation: { select: { id: true, numero: true } },
        },
      }),
      prisma.depense.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const {
      dossierId, fournisseurId, caisseId, compteBancaireId, dotationId, categorie, designation,
      montant, modePaiement, reference, observations, dateDepense,
    } = req.body;

    if ((caisseId && compteBancaireId) || (!caisseId && !compteBancaireId)) {
      ApiResponse.badRequest(res, 'Choisissez exactement une caisse OU un compte bancaire à débiter'); return;
    }
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }

    if (dossierId) await assertDossierOuvert(dossierId, societeId);

    const account = caisseId
      ? await prisma.caisse.findFirst({ where: { id: caisseId, societeId } })
      : await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
    if (!account) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    if (Number(account.solde) - montantNum < 0) { ApiResponse.badRequest(res, 'Solde insuffisant pour cette dépense'); return; }

    if (dotationId) {
      const dotation = await prisma.dotation.findFirst({ where: { id: dotationId, societeId } });
      if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
      if (dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, 'Cette dotation est annulée'); return; }
      const sum = await prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId } });
      const montantRestant = Number(dotation.montant) - Number(sum._sum.montant || 0);
      if (montantNum > montantRestant) { ApiResponse.badRequest(res, `Montant supérieur au reste disponible sur cette dotation (${montantRestant})`); return; }
    }

    const numero = await genererNumero(societeId, 'DEPENSE');

    const depense = await prisma.$transaction(async (tx) => {
      const d = await tx.depense.create({
        data: {
          societeId, numero, dossierId, fournisseurId, caisseId, compteBancaireId, dotationId,
          categorie, designation, montant: montantNum, modePaiement, reference, observations,
          ...(dateDepense && { dateDepense: new Date(dateDepense) }),
        },
      });

      await tx.operationFinanciere.create({
        data: {
          societeId,
          numero: await genererNumero(societeId, 'OPERATION_FINANCIERE'),
          type: 'DECAISSEMENT', sens: 'SORTIE',
          caisseId, compteBancaireId,
          montant: montantNum, libelle: designation, reference: numero,
        },
      });

      if (caisseId) await tx.caisse.update({ where: { id: caisseId }, data: { solde: { decrement: montantNum } } });
      else await tx.compteBancaire.update({ where: { id: compteBancaireId }, data: { solde: { decrement: montantNum } } });

      return d;
    });

    ApiResponse.created(res, depense, 'Dépense enregistrée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.depense.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.dossierId) await assertDossierOuvert(existing.dossierId, req.user!.societeId);
    const { categorie, designation, observations, statut } = req.body;
    const d = await prisma.depense.update({ where: { id: req.params.id }, data: { categorie, designation, observations, statut } });
    ApiResponse.success(res, d, 'Dépense modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
