import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

// Liste des processus
// Lecture ouverte à DOSSIERS:LIRE (sélecteur de processus lors de la création d'un dossier,
// cf. page /dossiers/nouveau) en plus de PARAMETRES:LIRE (gestion sous /parametres/processus).
router.get('/', authorize('DOSSIERS:LIRE', 'PARAMETRES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.processusSuivi.findMany({
      where: { societeId: req.user!.societeId },
      include: { etapes: { orderBy: { ordre: 'asc' } }, _count: { select: { dossiers: true } } },
      orderBy: { nom: 'asc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Détail processus
router.get('/:id', authorize('DOSSIERS:LIRE', 'PARAMETRES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.processusSuivi.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
    if (!p) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, p);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Créer processus avec étapes
router.post('/', authorize('PARAMETRES:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, nom, description, nature, etapes } = req.body;

    const processus = await prisma.processusSuivi.create({
      data: {
        societeId: req.user!.societeId,
        code,
        nom,
        description,
        nature: nature || null,
        etapes: etapes?.length > 0 ? {
          create: etapes.map((e: any, i: number) => ({
            ordre: i + 1,
            code: e.code,
            nom: e.nom,
            description: e.description || null,
            couleur: e.couleur || null,
            delaiJours: e.delaiJours || null,
            obligatoire: e.obligatoire !== false,
          })),
        } : undefined,
      },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
    ApiResponse.created(res, processus, 'Processus créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Modifier processus
router.put('/:id', authorize('PARAMETRES:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.processusSuivi.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const { code, nom, description, nature, actif, etapes } = req.body;

    if (etapes) {
      await prisma.etapeProcessus.deleteMany({ where: { processusId: req.params.id } });
    }

    const processus = await prisma.processusSuivi.update({
      where: { id: req.params.id },
      data: {
        code, nom, description,
        nature: nature || null,
        actif: actif !== false,
        etapes: etapes ? {
          create: etapes.map((e: any, i: number) => ({
            ordre: i + 1,
            code: e.code,
            nom: e.nom,
            description: e.description || null,
            couleur: e.couleur || null,
            delaiJours: e.delaiJours || null,
            obligatoire: e.obligatoire !== false,
          })),
        } : undefined,
      },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
    ApiResponse.success(res, processus, 'Processus modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Supprimer processus
router.delete('/:id', authorize('PARAMETRES:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.processusSuivi.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const dossiersLies = await prisma.dossier.count({ where: { processusId: req.params.id } });
    if (dossiersLies > 0) {
      ApiResponse.badRequest(res, `Ce processus est utilisé par ${dossiersLies} dossier(s). Désactivez-le plutôt.`);
      return;
    }
    await prisma.processusSuivi.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Processus supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
