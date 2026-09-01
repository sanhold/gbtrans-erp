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
    const data = await prisma.compteBancaire.findMany({
      where: { societeId: req.user!.societeId },
      orderBy: { code: 'asc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, libelle, banque, rib, iban, swift, devise, compteComptable } = req.body;
    const c = await prisma.compteBancaire.create({
      data: { societeId: req.user!.societeId, code, libelle, banque, rib, iban, swift, devise, compteComptable, solde: 0 },
    });
    ApiResponse.created(res, c, 'Compte bancaire créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteBancaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const { solde: _solde, ...rest } = req.body;
    const c = await prisma.compteBancaire.update({ where: { id: req.params.id }, data: rest });
    ApiResponse.success(res, c, 'Compte bancaire modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/desactiver', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteBancaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const c = await prisma.compteBancaire.update({ where: { id: req.params.id }, data: { actif: false } });
    ApiResponse.success(res, c, 'Compte bancaire désactivé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/activer', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.compteBancaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const c = await prisma.compteBancaire.update({ where: { id: req.params.id }, data: { actif: true } });
    ApiResponse.success(res, c, 'Compte bancaire activé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
