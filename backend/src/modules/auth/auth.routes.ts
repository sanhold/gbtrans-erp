import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { loginSchema, changePasswordSchema, verify2FASchema, confirm2FASchema } from './auth.validator';

const router = Router();
const controller = new AuthController();

router.post('/login', validate(loginSchema), (req, res) => controller.login(req, res));
router.post('/verify-2fa', validate(verify2FASchema), (req, res) => controller.verify2FA(req, res));
// La création d'utilisateur se fait via POST /utilisateurs (voir modules/utilisateurs), qui applique
// les garde-fous nécessaires sur profilId/agenceId/estAdmin.
router.post('/change-password', authenticate, validate(changePasswordSchema), (req, res) => controller.changePassword(req, res));
router.post('/setup-2fa', authenticate, (req, res) => controller.setup2FA(req, res));
router.post('/confirm-2fa', authenticate, validate(confirm2FASchema), (req, res) => controller.confirm2FA(req, res));
router.post('/logout', authenticate, (req, res) => controller.logout(req, res));
router.get('/profile', authenticate, (req, res) => controller.getProfile(req, res));

export default router;
