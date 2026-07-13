import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { loginSchema, registerSchema, changePasswordSchema, verify2FASchema } from './auth.validator';

const router = Router();
const controller = new AuthController();

router.post('/login', validate(loginSchema), (req, res) => controller.login(req, res));
router.post('/verify-2fa', validate(verify2FASchema), (req, res) => controller.verify2FA(req, res));
router.post('/register', authenticate, authorize('UTILISATEURS:CREER'), validate(registerSchema), (req, res) => controller.register(req, res));
router.post('/change-password', authenticate, validate(changePasswordSchema), (req, res) => controller.changePassword(req, res));
router.post('/setup-2fa', authenticate, (req, res) => controller.setup2FA(req, res));
router.post('/logout', authenticate, (req, res) => controller.logout(req, res));
router.get('/profile', authenticate, (req, res) => controller.getProfile(req, res));

export default router;
