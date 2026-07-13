import { Router } from 'express';
import { DossierController } from './dossiers.controller';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { audit } from '../../middleware/audit';

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

export default router;
