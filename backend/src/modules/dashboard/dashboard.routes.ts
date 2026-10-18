import { Router, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import { cacheSociete } from '../../utils/cacheMemoire';

const router = Router();
const service = new DashboardService();

router.use(authenticate, requireSociete);

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const annee = req.query.annee ? parseInt(req.query.annee as string) : undefined;
    const stats = await service.getStats(req.user!.societeId, annee);
    ApiResponse.success(res, stats);
  } catch (error: any) {
    ApiResponse.error(res, error.message);
  }
});

router.get('/ca-mensuel', async (req: AuthRequest, res: Response) => {
  try {
    const annee = req.query.annee ? parseInt(req.query.annee as string) : undefined;
    const data = await cacheSociete('stats:dashboard:ca-mensuel', req.user!.societeId, 30_000, () => service.getChiffreAffairesMensuel(req.user!.societeId, annee), String(annee ?? ''));
    ApiResponse.success(res, data);
  } catch (error: any) {
    ApiResponse.error(res, error.message);
  }
});

router.get('/top-clients', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(req.query.limit ? parseInt(req.query.limit as string) || 10 : 10, 50);
    const annee = req.query.annee ? parseInt(req.query.annee as string) : undefined;
    const data = await cacheSociete('stats:dashboard:top-clients', req.user!.societeId, 30_000, () => service.getTopClients(req.user!.societeId, limit, annee), `${limit}|${annee ?? ''}`);
    ApiResponse.success(res, data);
  } catch (error: any) {
    ApiResponse.error(res, error.message);
  }
});

router.get('/alertes', async (req: AuthRequest, res: Response) => {
  try {
    const alertes = await cacheSociete('stats:dashboard:alertes', req.user!.societeId, 30_000, () => service.getAlertes(req.user!.societeId));
    ApiResponse.success(res, alertes);
  } catch (error: any) {
    ApiResponse.error(res, error.message);
  }
});

export default router;
