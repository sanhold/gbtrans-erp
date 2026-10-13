import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

// Lecture ouverte à COURRIERS:LIRE (choix d'un modèle lors de la composition d'un courrier,
// cf. page /courriers) en plus de PARAMETRES:LIRE (gestion des modèles sous /parametres).
router.get('/', authorize('COURRIERS:LIRE', 'PARAMETRES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, actif } = req.query;
    const data = await prisma.modeleCourrier.findMany({
      where: {
        societeId: req.user!.societeId,
        ...(type && { type: type as any }),
        ...(actif !== undefined && { actif: actif === 'true' }),
      },
      orderBy: { nom: 'asc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('COURRIERS:LIRE', 'PARAMETRES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const m = await prisma.modeleCourrier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!m) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, m);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('PARAMETRES:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { nom, type, objet, contenu } = req.body;
    if (!nom || !objet || !contenu) { ApiResponse.badRequest(res, 'Nom, objet et contenu du modèle requis'); return; }

    const m = await prisma.modeleCourrier.create({
      data: {
        societeId: req.user!.societeId,
        nom, objet, contenu,
        type: type || 'SORTANT',
      },
    });
    ApiResponse.created(res, m, 'Modèle de courrier créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('PARAMETRES:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.modeleCourrier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const { nom, type, objet, contenu, actif } = req.body;
    const m = await prisma.modeleCourrier.update({
      where: { id: req.params.id },
      data: { nom, type, objet, contenu, actif },
    });
    ApiResponse.success(res, m, 'Modèle de courrier modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', authorize('PARAMETRES:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.modeleCourrier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    await prisma.modeleCourrier.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Modèle de courrier supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
