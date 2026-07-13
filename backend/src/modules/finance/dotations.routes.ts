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

async function withMontants(dotations: any[]) {
  const ids = dotations.map((d) => d.id);
  const sums = ids.length
    ? await prisma.depense.groupBy({ by: ['dotationId'], _sum: { montant: true }, where: { dotationId: { in: ids } } })
    : [];
  const utiliseParId = new Map(sums.map((s) => [s.dotationId as string, Number(s._sum.montant || 0)]));
  return dotations.map((d) => {
    const montantUtilise = utiliseParId.get(d.id) || 0;
    return { ...d, montantUtilise, montantRestant: Number(d.montant) - montantUtilise };
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
        where, skip, take: parseInt(limit as string),
        orderBy: { dateDotation: 'desc' },
        include: { agent: { select: { id: true, nom: true, prenom: true } } },
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
      include: {
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

    const { montant, motif, agentId } = req.body;
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }

    const sum = await prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId: req.params.id } });
    const montantUtilise = Number(sum._sum?.montant || 0);
    if (montantNum < montantUtilise) {
      ApiResponse.badRequest(res, `Le montant ne peut pas être inférieur au montant déjà utilisé (${montantUtilise})`); return;
    }

    const dotation = await prisma.dotation.update({
      where: { id: req.params.id },
      data: { montant: montantNum, motif, agentId },
      include: { agent: { select: { id: true, nom: true, prenom: true } } },
    });
    ApiResponse.success(res, { ...dotation, montantUtilise, montantRestant: montantNum - montantUtilise }, 'Dotation modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/annuler', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.dotation.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const dotation = await prisma.dotation.update({ where: { id: req.params.id }, data: { statut: 'ANNULEE' } });
    ApiResponse.success(res, dotation, 'Dotation annulée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
