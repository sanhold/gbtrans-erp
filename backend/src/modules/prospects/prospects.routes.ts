import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, statut } = req.query;
    const data = await prisma.prospect.findMany({
      where: {
        societeId: req.user!.societeId,
        ...(statut && { statut: statut as string }),
        ...(search && {
          OR: [
            { raisonSociale: { contains: search as string, mode: 'insensitive' as const } },
            { contact: { contains: search as string, mode: 'insensitive' as const } },
            { email: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.prospect.create({
      data: { ...req.body, societeId: req.user!.societeId },
    });
    ApiResponse.created(res, p, 'Prospect ajouté');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.prospect.update({ where: { id: req.params.id }, data: req.body });
    ApiResponse.success(res, p, 'Prospect modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.prospect.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Prospect supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
