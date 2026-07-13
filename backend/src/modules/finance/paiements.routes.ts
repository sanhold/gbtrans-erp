import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

// Lecture seule : la création d'un Paiement reste dans le module Facturation
// (un Paiement sans allocation PaiementFacture n'aurait pas de sens métier).
router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', clientId, modePaiement, statut, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.PaiementWhereInput = {
      client: { societeId: req.user!.societeId },
      ...(clientId && { clientId: clientId as string }),
      ...(modePaiement && { modePaiement: modePaiement as any }),
      ...(statut && { statut: statut as any }),
      ...((dateDebut || dateFin) && {
        datePaiement: {
          ...(dateDebut && { gte: new Date(dateDebut as string) }),
          ...(dateFin && { lte: new Date(dateFin as string) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.paiement.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { datePaiement: 'desc' },
        include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
          affectations: { include: { facture: { select: { id: true, numero: true } } } },
        },
      }),
      prisma.paiement.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;
