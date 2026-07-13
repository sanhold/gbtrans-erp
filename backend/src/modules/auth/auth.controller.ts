import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, motDePasse } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, motDePasse, ip, userAgent);
      ApiResponse.success(res, result, 'Connexion réussie');
    } catch (error: any) {
      logger.warn(`Tentative de connexion échouée: ${error.message}`);
      ApiResponse.unauthorized(res, error.message);
    }
  }

  async verify2FA(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, token } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.verify2FA(email, code, token, ip, userAgent);
      ApiResponse.success(res, result, 'Authentification 2FA réussie');
    } catch (error: any) {
      ApiResponse.unauthorized(res, error.message);
    }
  }

  async setup2FA(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await authService.setup2FA(req.user!.id);
      ApiResponse.success(res, result, 'Double authentification configurée');
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const utilisateur = await authService.register(req.body);
      ApiResponse.created(res, utilisateur, 'Utilisateur créé avec succès');
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ancienMotDePasse, nouveauMotDePasse } = req.body;
      const result = await authService.changePassword(
        req.user!.id,
        ancienMotDePasse,
        nouveauMotDePasse
      );
      ApiResponse.success(res, result);
    } catch (error: any) {
      ApiResponse.badRequest(res, error.message);
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1] || '';
      const result = await authService.logout(token);
      ApiResponse.success(res, result);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.id);
      ApiResponse.success(res, profile);
    } catch (error: any) {
      ApiResponse.error(res, error.message);
    }
  }
}
