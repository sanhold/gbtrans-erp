import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

// Agrégat par client : total facturé / payé / reste à payer (sert à la fois
// à l'onglet "Comptes Clients" et à "Créances Clients", filtré côté frontend).
router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT c.id, c.code, c."raisonSociale",
        COALESCE(SUM(f."montantTTC"), 0) AS "totalFacture",
        COALESCE(SUM(f."montantPaye"), 0) AS "totalPaye",
        COALESCE(SUM(f."resteAPayer"), 0) AS "resteAPayer",
        COUNT(f.id)::int AS "nombreFactures"
      FROM clients c
      LEFT JOIN factures f ON f."clientId" = c.id AND f.statut NOT IN ('ANNULEE', 'BROUILLON')
      WHERE c."societeId" = ${req.user!.societeId}
      GROUP BY c.id, c.code, c."raisonSociale"
      ORDER BY "resteAPayer" DESC
    `;
    ApiResponse.success(res, rows);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Relevé détaillé d'un client : factures + paiements, ordre chronologique
router.get('/:clientId', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.clientId, societeId: req.user!.societeId } });
    if (!client) { ApiResponse.notFound(res); return; }

    const factures = await prisma.facture.findMany({
      where: { clientId: req.params.clientId, statut: { not: 'ANNULEE' } },
      orderBy: { dateFacture: 'asc' },
      select: { id: true, numero: true, dateFacture: true, montantTTC: true, montantPaye: true, resteAPayer: true, statut: true },
    });
    const paiements = await prisma.paiement.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { datePaiement: 'asc' },
      include: { affectations: { include: { facture: { select: { numero: true } } } } },
    });

    ApiResponse.success(res, { client, factures, paiements });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;
