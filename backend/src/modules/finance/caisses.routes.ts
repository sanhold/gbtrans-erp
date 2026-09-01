import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.caisse.findMany({
      where: { societeId: req.user!.societeId },
      orderBy: { code: 'asc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, libelle, devise, plafond, compteComptable } = req.body;
    const c = await prisma.caisse.create({
      data: { societeId: req.user!.societeId, code, libelle, devise, plafond, compteComptable, solde: 0 },
    });
    ApiResponse.created(res, c, 'Caisse créée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caisse.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const { solde: _solde, ...rest } = req.body;
    const c = await prisma.caisse.update({ where: { id: req.params.id }, data: rest });
    ApiResponse.success(res, c, 'Caisse modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/desactiver', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caisse.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const c = await prisma.caisse.update({ where: { id: req.params.id }, data: { actif: false } });
    ApiResponse.success(res, c, 'Caisse désactivée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/activer', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caisse.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const c = await prisma.caisse.update({ where: { id: req.params.id }, data: { actif: true } });
    ApiResponse.success(res, c, 'Caisse activée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
