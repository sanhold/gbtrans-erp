import { Router, Response } from 'express';
import { DossierController } from './dossiers.controller';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { dossierEstFerme } from '../../utils/dossierGuard';

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

function etapeDossierVersUiShape(e: any) {
  return {
    id: e.id,
    etapeProcessusId: e.etapeProcessusId,
    custom: !e.etapeProcessusId,
    ordre: e.ordre,
    code: e.etapeProcessus?.code || null,
    nom: e.etapeProcessus?.nom || e.nom,
    description: e.etapeProcessus?.description || e.description,
    couleur: e.etapeProcessus?.couleur || null,
    delaiJours: e.etapeProcessus?.delaiJours || null,
    obligatoire: e.etapeProcessus ? e.etapeProcessus.obligatoire : e.obligatoire,
    statut: e.statut,
    dateRealisation: e.dateRealisation,
    executant: e.executant || null,
    commentaire: e.commentaire,
  };
}

router.get('/:id/etapes', authorize('DOSSIERS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const dossier = await prisma.dossier.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      select: { id: true, statut: true, processusId: true },
    });
    if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
    if (!dossier.processusId) { ApiResponse.success(res, { peutModifier: !dossierEstFerme(dossier.statut), etapes: [] }); return; }

    // Première consultation : matérialise une ligne par étape du processus. Une fois cette
    // initialisation faite, on ne recrée plus jamais automatiquement d'étapes manquantes —
    // sinon une étape supprimée par l'utilisateur réapparaîtrait au prochain chargement.
    const nbEtapesDossierExistantes = await prisma.etapeDossier.count({ where: { dossierId: dossier.id } });
    if (nbEtapesDossierExistantes === 0) {
      const etapesProcessus = await prisma.etapeProcessus.findMany({ where: { processusId: dossier.processusId } });
      if (etapesProcessus.length > 0) {
        await prisma.etapeDossier.createMany({
          data: etapesProcessus.map((ep) => ({ dossierId: dossier.id, etapeProcessusId: ep.id, ordre: ep.ordre })),
          skipDuplicates: true,
        });
      }
    }

    const etapesDossier = await prisma.etapeDossier.findMany({
      where: { dossierId: dossier.id },
      include: { executant: { select: { id: true, nom: true, prenom: true } }, etapeProcessus: true },
      orderBy: { ordre: 'asc' },
    });

    ApiResponse.success(res, { peutModifier: !dossierEstFerme(dossier.statut), etapes: etapesDossier.map(etapeDossierVersUiShape) });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/:id/etapes', authorize('DOSSIERS:MODIFIER'), audit('DOSSIERS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { nom, description, obligatoire } = req.body;
    if (!nom || !String(nom).trim()) { ApiResponse.badRequest(res, "Le nom de l'étape est obligatoire"); return; }

    const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
    if (dossierEstFerme(dossier.statut)) { ApiResponse.badRequest(res, `Ce dossier est ${dossier.statut.toLowerCase()} : impossible d'ajouter une étape`); return; }

    const dernier = await prisma.etapeDossier.aggregate({ where: { dossierId: dossier.id }, _max: { ordre: true } });
    const etape = await prisma.etapeDossier.create({
      data: {
        dossierId: dossier.id,
        nom: String(nom).trim(),
        description: description ? String(description).trim() : null,
        obligatoire: !!obligatoire,
        ordre: (dernier._max.ordre || 0) + 1,
      },
      include: { executant: { select: { id: true, nom: true, prenom: true } }, etapeProcessus: true },
    });
    ApiResponse.success(res, etapeDossierVersUiShape(etape), 'Étape ajoutée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/etapes/reorder', authorize('DOSSIERS:MODIFIER'), audit('DOSSIERS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) { ApiResponse.badRequest(res, 'Liste des étapes invalide'); return; }

    const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
    if (dossierEstFerme(dossier.statut)) { ApiResponse.badRequest(res, `Ce dossier est ${dossier.statut.toLowerCase()} : impossible de réordonner les étapes`); return; }

    const etapesExistantes = await prisma.etapeDossier.findMany({ where: { dossierId: dossier.id }, select: { id: true } });
    const idsValides = new Set(etapesExistantes.map((e) => e.id));
    if (!ids.every((id: string) => idsValides.has(id))) { ApiResponse.badRequest(res, 'Étape inconnue pour ce dossier'); return; }

    await prisma.$transaction(
      ids.map((id: string, index: number) => prisma.etapeDossier.update({ where: { id }, data: { ordre: index + 1 } }))
    );
    ApiResponse.success(res, null, 'Ordre mis à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id/etapes/:etapeDossierId', authorize('DOSSIERS:MODIFIER'), audit('DOSSIERS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
    if (dossierEstFerme(dossier.statut)) { ApiResponse.badRequest(res, `Ce dossier est ${dossier.statut.toLowerCase()} : impossible de supprimer une étape`); return; }

    const etape = await prisma.etapeDossier.findFirst({ where: { id: req.params.etapeDossierId, dossierId: dossier.id } });
    if (!etape) { ApiResponse.notFound(res, 'Étape introuvable'); return; }

    await prisma.etapeDossier.delete({ where: { id: etape.id } });
    ApiResponse.success(res, null, 'Étape supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id/etapes/:etapeDossierId', authorize('DOSSIERS:MODIFIER'), audit('DOSSIERS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { statut, executantId, dateRealisation, commentaire } = req.body;
    if (!['VALIDEE', 'A_FAIRE'].includes(statut)) { ApiResponse.badRequest(res, 'Statut invalide'); return; }

    const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
    if (dossierEstFerme(dossier.statut)) { ApiResponse.badRequest(res, `Ce dossier est ${dossier.statut.toLowerCase()} : impossible de modifier ses étapes`); return; }

    const etape = await prisma.etapeDossier.findFirst({ where: { id: req.params.etapeDossierId, dossierId: dossier.id } });
    if (!etape) { ApiResponse.notFound(res, "Étape introuvable pour ce dossier"); return; }

    if (statut === 'VALIDEE' && !executantId) { ApiResponse.badRequest(res, 'Le personnel ayant exécuté cette étape est requis'); return; }

    const misAJour = await prisma.etapeDossier.update({
      where: { id: etape.id },
      data: {
        statut,
        executantId: statut === 'VALIDEE' ? executantId : null,
        dateRealisation: statut === 'VALIDEE' ? new Date(dateRealisation || Date.now()) : null,
        commentaire: commentaire ?? null,
      },
      include: { executant: { select: { id: true, nom: true, prenom: true } }, etapeProcessus: true },
    });
    ApiResponse.success(res, etapeDossierVersUiShape(misAJour), statut === 'VALIDEE' ? 'Étape validée' : 'Étape réinitialisée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;
