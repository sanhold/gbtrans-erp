import { Router, Response } from 'express';
import { DossierController } from './dossiers.controller';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
const controller = new DossierController();

router.use(authenticate, requireSociete);

router.post('/', authorize('DOSSIERS:CREER'), audit('DOSSIERS', 'CREER'), (req, res) => controller.create(req, res));
router.get('/', authorize('DOSSIERS:LIRE'), (req, res) => controller.findAll(req, res));
router.get('/statistiques', authorize('DOSSIERS:LIRE'), (req, res) => controller.statistiques(req, res));
router.get('/bilan', authorize('DOSSIERS:LIRE'), (req, res) => controller.bilan(req, res));
router.get('/numero-physique-suggestion', authorize('DOSSIERS:LIRE'), (req, res) => controller.suggestionNumeroPhysique(req, res));
router.get('/:id', authorize('DOSSIERS:LIRE'), (req, res) => controller.findById(req, res));
router.put('/:id', authorize('DOSSIERS:MODIFIER'), audit('DOSSIERS', 'MODIFIER'), (req, res) => controller.update(req, res));
router.patch('/:id/statut', authorize('DOSSIERS:MODIFIER'), audit('DOSSIERS', 'CHANGER_STATUT'), (req, res) => controller.changeStatut(req, res));
router.patch('/:id/archiver', authorize('DOSSIERS:ARCHIVER'), audit('DOSSIERS', 'ARCHIVER'), (req, res) => controller.archiver(req, res));
router.delete('/:id', authorize('DOSSIERS:SUPPRIMER'), audit('DOSSIERS', 'SUPPRIMER'), (req, res) => controller.delete(req, res));

// ---------- Suivi d'exécution des étapes ----------

router.get('/:id/etapes', authorize('DOSSIERS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const dossier = await prisma.dossier.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      select: { id: true, processusId: true },
    });
    if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
    if (!dossier.processusId) { ApiResponse.success(res, []); return; }

    const [etapesProcessus, etapesDossier] = await Promise.all([
      prisma.etapeProcessus.findMany({ where: { processusId: dossier.processusId }, orderBy: { ordre: 'asc' } }),
      prisma.etapeDossier.findMany({
        where: { dossierId: dossier.id },
        include: { executant: { select: { id: true, nom: true, prenom: true } } },
      }),
    ]);
    const parEtape = new Map(etapesDossier.map((e) => [e.etapeProcessusId, e]));

    const result = etapesProcessus.map((ep) => {
      const suivi = parEtape.get(ep.id);
      return {
        etapeProcessusId: ep.id,
        ordre: ep.ordre,
        code: ep.code,
        nom: ep.nom,
        description: ep.description,
        couleur: ep.couleur,
        delaiJours: ep.delaiJours,
        obligatoire: ep.obligatoire,
        statut: suivi?.statut || 'A_FAIRE',
        dateRealisation: suivi?.dateRealisation || null,
        executant: suivi?.executant || null,
        commentaire: suivi?.commentaire || null,
      };
    });
    ApiResponse.success(res, result);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/:id/etapes/:etapeProcessusId', authorize('DOSSIERS:MODIFIER'), audit('DOSSIERS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { statut, executantId, dateRealisation, commentaire } = req.body;
    if (!['VALIDEE', 'A_FAIRE'].includes(statut)) { ApiResponse.badRequest(res, 'Statut invalide'); return; }

    const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }

    const etapeProcessus = await prisma.etapeProcessus.findFirst({ where: { id: req.params.etapeProcessusId, processusId: dossier.processusId || undefined } });
    if (!etapeProcessus) { ApiResponse.notFound(res, "Étape introuvable pour le processus de ce dossier"); return; }

    if (statut === 'VALIDEE' && !executantId) { ApiResponse.badRequest(res, 'Le personnel ayant exécuté cette étape est requis'); return; }

    const etape = await prisma.etapeDossier.upsert({
      where: { dossierId_etapeProcessusId: { dossierId: req.params.id, etapeProcessusId: req.params.etapeProcessusId } },
      update: {
        statut,
        executantId: statut === 'VALIDEE' ? executantId : null,
        dateRealisation: statut === 'VALIDEE' ? new Date(dateRealisation || Date.now()) : null,
        commentaire: commentaire ?? null,
      },
      create: {
        dossierId: req.params.id,
        etapeProcessusId: req.params.etapeProcessusId,
        statut,
        executantId: statut === 'VALIDEE' ? executantId : null,
        dateRealisation: statut === 'VALIDEE' ? new Date(dateRealisation || Date.now()) : null,
        commentaire: commentaire ?? null,
      },
      include: { executant: { select: { id: true, nom: true, prenom: true } } },
    });
    ApiResponse.success(res, etape, statut === 'VALIDEE' ? 'Étape validée' : 'Étape réinitialisée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
