import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { ApiResponse } from '../utils/apiResponse';
import { getCachedUser, setCachedUser } from '../utils/sessionCache';
import { logger } from '../utils/logger';

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

    jwt.verify(token, config.jwt.secret);

    const cached = getCachedUser(token);
    if (cached) {
      req.user = cached;
      next();
      return;
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        utilisateur: {
          include: {
            profil: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session || !session.actif || session.expiresAt < new Date()) {
      ApiResponse.unauthorized(res, 'Session invalide ou expirée');
      return;
    }

    const utilisateur = session.utilisateur;

    const estVerrouille = !!utilisateur?.verrouilleJusqua && utilisateur.verrouilleJusqua > new Date();
    if (!utilisateur || !utilisateur.actif || estVerrouille) {
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

    setCachedUser(token, req.user, session.expiresAt);

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

export const requireSociete = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user?.societeId) {
    ApiResponse.forbidden(res, 'Société non définie');
    return;
  }

  // req.path est relatif au montage du routeur saas ('/api/v1/saas'), donc vaut bien
  // '/abonnement/paiement' ici sans prefixe ni query string a contourner.
  const estEcriture = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
  const estPaiementAbonnement = req.method === 'POST' && req.path === '/abonnement/paiement';
  if (estEcriture && !estPaiementAbonnement) {
    try {
      const abonnement = await prisma.abonnement.findUnique({
        where: { societeId: req.user.societeId },
        select: { statut: true },
      });
      if (abonnement && (abonnement.statut === 'EXPIRE' || abonnement.statut === 'IMPAYE')) {
        ApiResponse.forbidden(res, 'Abonnement expiré ou impayé. Réglez votre abonnement pour continuer à utiliser GBTRANS ERP.');
        return;
      }
    } catch (e) {
      // Panne transitoire de la verification d'abonnement : on laisse passer plutot que
      // de bloquer tout le trafic en ecriture de la plateforme sur un incident non lie.
      logger.warn('Vérification du statut abonnement échouée, requête autorisée par défaut', e);
    }
  }

  next();
};
