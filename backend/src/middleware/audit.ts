import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';

export const audit = (module: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.json.bind(res);

    res.json = function (body: unknown) {
      prisma.journalAudit
        .create({
          data: {
            utilisateurId: req.user?.id,
            action,
            module,
            entite: req.params.id ? module : undefined,
            entiteId: req.params.id,
            donneesAvant: undefined,
            donneesApres: req.method !== 'GET' ? (body as object) : undefined,
            ipAdresse: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
          },
        })
        .catch((err) => {
          logger.error('Erreur audit:', err);
        });

      return originalSend(body);
    };

    next();
  };
};
