import { Router, Response } from 'express';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', authorize('FOURNISSEURS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, type } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.FournisseurWhereInput = {
      societeId: req.user!.societeId,
      ...(type && { type: type as any }),
      ...(search && {
        OR: [
          { raisonSociale: { contains: search as string, mode: 'insensitive' } },
          { code: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      prisma.fournisseur.findMany({ where, skip, take: parseInt(limit as string), orderBy: { raisonSociale: 'asc' } }),
      prisma.fournisseur.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('FOURNISSEURS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const f = await prisma.fournisseur.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: { contactsFournisseur: true },
    });
    if (!f) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, f);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FOURNISSEURS:CREER'), audit('FOURNISSEURS', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const last = await prisma.fournisseur.findFirst({
      where: { societeId: req.user!.societeId }, orderBy: { code: 'desc' }, select: { code: true },
    });
    const nextCode = last ? `FRN${(parseInt(last.code.replace('FRN', '')) + 1).toString().padStart(5, '0')}` : 'FRN00001';
    const f = await prisma.fournisseur.create({ data: { ...req.body, societeId: req.user!.societeId, code: nextCode } });
    ApiResponse.created(res, f, 'Fournisseur créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('FOURNISSEURS:MODIFIER'), audit('FOURNISSEURS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.fournisseur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const f = await prisma.fournisseur.update({ where: { id: req.params.id }, data: req.body });
    ApiResponse.success(res, f, 'Fournisseur modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
