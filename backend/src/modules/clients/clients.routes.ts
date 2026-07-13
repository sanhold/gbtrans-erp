import { Router } from 'express';
import { ClientController } from './clients.controller';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { audit } from '../../middleware/audit';

const router = Router();
const controller = new ClientController();

router.use(authenticate, requireSociete);

router.post('/', authorize('CLIENTS:CREER'), audit('CLIENTS', 'CREER'), (req, res) => controller.create(req, res));
router.get('/', authorize('CLIENTS:LIRE'), (req, res) => controller.findAll(req, res));
router.get('/:id', authorize('CLIENTS:LIRE'), (req, res) => controller.findById(req, res));
router.put('/:id', authorize('CLIENTS:MODIFIER'), audit('CLIENTS', 'MODIFIER'), (req, res) => controller.update(req, res));
router.patch('/:id/bloquer', authorize('CLIENTS:BLOQUER'), audit('CLIENTS', 'BLOQUER'), (req, res) => controller.bloquer(req, res));
router.patch('/:id/debloquer', authorize('CLIENTS:BLOQUER'), audit('CLIENTS', 'DEBLOQUER'), (req, res) => controller.debloquer(req, res));
router.patch('/:id/archiver', authorize('CLIENTS:ARCHIVER'), audit('CLIENTS', 'ARCHIVER'), (req, res) => controller.archiver(req, res));

export default router;
