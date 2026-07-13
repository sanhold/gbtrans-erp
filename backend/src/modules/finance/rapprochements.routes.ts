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
    const { compteBancaireId } = req.query;
    const data = await prisma.rapprochement.findMany({
      where: {
        societeId: req.user!.societeId,
        ...(compteBancaireId && { compteBancaireId: compteBancaireId as string }),
      },
      orderBy: { dateBancaire: 'desc' },
      include: { compteBancaire: { select: { id: true, code: true, libelle: true, banque: true } } },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { compteBancaireId, dateBancaire, dateComptable, soldeReleve, soldeComptable, observations } = req.body;
    const compte = await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
    if (!compte) { ApiResponse.notFound(res, 'Compte bancaire introuvable'); return; }

    const ecart = Number(soldeReleve) - Number(soldeComptable);
    const r = await prisma.rapprochement.create({
      data: {
        societeId, compteBancaireId,
        dateBancaire: new Date(dateBancaire), dateComptable: new Date(dateComptable),
        soldeReleve: Number(soldeReleve), soldeComptable: Number(soldeComptable), ecart, observations,
      },
    });
    ApiResponse.created(res, r, 'Rapprochement créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/statut', authorize('FINANCE:VALIDER'), audit('FINANCE', 'VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.rapprochement.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const { statut } = req.body;
    const r = await prisma.rapprochement.update({ where: { id: req.params.id }, data: { statut } });
    ApiResponse.success(res, r, 'Statut mis à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
