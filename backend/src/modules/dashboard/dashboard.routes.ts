import { Router, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';

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
    const data = await service.getChiffreAffairesMensuel(req.user!.societeId, annee);
    ApiResponse.success(res, data);
  } catch (error: any) {
    ApiResponse.error(res, error.message);
  }
});

router.get('/top-clients', async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const annee = req.query.annee ? parseInt(req.query.annee as string) : undefined;
    const data = await service.getTopClients(req.user!.societeId, limit, annee);
    ApiResponse.success(res, data);
  } catch (error: any) {
    ApiResponse.error(res, error.message);
  }
});

router.get('/alertes', async (req: AuthRequest, res: Response) => {
  try {
    const alertes = await service.getAlertes(req.user!.societeId);
    ApiResponse.success(res, alertes);
  } catch (error: any) {
    ApiResponse.error(res, error.message);
  }
});

export default router;
