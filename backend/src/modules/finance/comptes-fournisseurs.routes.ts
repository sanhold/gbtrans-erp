import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

// Agrégat par fournisseur : total facturé / payé / reste à payer (sert à la fois
// à l'onglet "Comptes Fournisseurs" et à "Créances Fournisseurs" (dettes), filtré côté frontend).
router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT fr.id, fr.code, fr."raisonSociale",
        COALESCE(SUM(ff."montantTTC"), 0) AS "totalFacture",
        COALESCE(SUM(ff."montantPaye"), 0) AS "totalPaye",
        COALESCE(SUM(ff."resteAPayer"), 0) AS "resteAPayer",
        COUNT(ff.id)::int AS "nombreFactures"
      FROM fournisseurs fr
      LEFT JOIN factures_fournisseurs ff ON ff."fournisseurId" = fr.id AND ff.statut NOT IN ('ANNULEE', 'BROUILLON')
      WHERE fr."societeId" = ${req.user!.societeId}
      GROUP BY fr.id, fr.code, fr."raisonSociale"
      ORDER BY "resteAPayer" DESC
    `;
    ApiResponse.success(res, rows);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Relevé détaillé d'un fournisseur : factures fournisseurs + paiements, ordre chronologique
router.get('/:fournisseurId', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const fournisseur = await prisma.fournisseur.findFirst({ where: { id: req.params.fournisseurId, societeId: req.user!.societeId } });
    if (!fournisseur) { ApiResponse.notFound(res); return; }

    const factures = await prisma.factureFournisseur.findMany({
      where: { fournisseurId: req.params.fournisseurId, statut: { not: 'ANNULEE' } },
      orderBy: { dateFacture: 'asc' },
      select: { id: true, numero: true, dateFacture: true, montantTTC: true, montantPaye: true, resteAPayer: true, statut: true },
    });
    const paiements = await prisma.paiementFournisseur.findMany({
      where: { fournisseurId: req.params.fournisseurId },
      orderBy: { datePaiement: 'asc' },
      include: { affectations: { include: { factureFournisseur: { select: { numero: true } } } } },
    });

    ApiResponse.success(res, { fournisseur, factures, paiements });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;
