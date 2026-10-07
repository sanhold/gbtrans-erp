/**
 * Point d'entree pour declencher les sauvegardes dues, appelable par un service de cron
 * externe (ex: cron-job.org) en plus du minuteur interne (cf. server.ts), car un service
 * Render gratuit peut s'endormir apres inactivite et interrompre le minuteur interne.
 * Protege par un secret partage (CRON_SECRET), jamais par un token utilisateur.
 */
import { Router, Request, Response } from 'express';
import { executerSauvegardesDues } from './sauvegarde.service';

const router = Router();

router.post('/sauvegardes', async (req: Request, res: Response) => {
  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ success: false, message: 'Non autorisé' }); return;
  }
  try {
    const resultat = await executerSauvegardesDues();
    res.json({ success: true, data: resultat });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
