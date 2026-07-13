import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { ApiResponse } from '../utils/apiResponse';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      ApiResponse.unauthorized(res, 'Token manquant');
      return;
    }

    const token = authHeader.split(' ')[1];

    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || !session.actif || session.expiresAt < new Date()) {
      ApiResponse.unauthorized(res, 'Session invalide ou expirée');
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      societeId: string;
      email: string;
    };

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      include: {
        profil: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!utilisateur || !utilisateur.actif || utilisateur.verrouille) {
      ApiResponse.unauthorized(res, 'Compte désactivé ou verrouillé');
      return;
    }

    req.user = {
      id: utilisateur.id,
      societeId: utilisateur.societeId,
      agenceId: utilisateur.agenceId || undefined,
      email: utilisateur.email,
      matricule: utilisateur.matricule,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      profilId: utilisateur.profilId || undefined,
      estAdmin: utilisateur.profil?.estAdmin || false,
      permissions: utilisateur.profil?.permissions.map(
        (p) => `${p.permission.module}:${p.permission.action}`
      ) || [],
    };

    next();
  } catch {
    ApiResponse.unauthorized(res, 'Token invalide');
  }
};

export const authorize = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    if (req.user.estAdmin) {
      next();
      return;
    }

    const hasPermission = permissions.some((p) =>
      req.user!.permissions.includes(p)
    );

    if (!hasPermission) {
      ApiResponse.forbidden(res, 'Permissions insuffisantes');
      return;
    }

    next();
  };
};

export const requireSociete = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.societeId) {
    ApiResponse.forbidden(res, 'Société non définie');
    return;
  }
  next();
};
