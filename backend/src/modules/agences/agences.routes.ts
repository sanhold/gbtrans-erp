import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

/** Agences actives de la société de l'utilisateur (liste de référence pour les filtres et les colonnes). */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.agence.findMany({
      where: { societeId: req.user!.societeId, actif: true },
      select: { id: true, code: true, nom: true },
      orderBy: { nom: 'asc' },
    });
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: 'Erreur lors du chargement des agences' });
  }
});

export default router;
