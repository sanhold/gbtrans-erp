import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { config } from '../../config';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { invalidateSessionCache } from '../../utils/sessionCache';

export class AuthService {
  async login(email: string, motDePasse: string, ip?: string, userAgent?: string) {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      relationLoadStrategy: 'join', include: {
        profil: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        societe: { select: { id: true, raisonSociale: true, code: true, activiteTransit: true, activiteTransport: true } },
      },
    });

    if (!utilisateur) {
      await this.logConnexion(null, ip, userAgent, 'FAILED', 'Utilisateur non trouvé');
      throw new Error('Identifiants invalides');
    }

    const maintenant = new Date();
    if (utilisateur.verrouilleJusqua && utilisateur.verrouilleJusqua > maintenant) {
      await this.logConnexion(utilisateur.id, ip, userAgent, 'FAILED', 'Compte verrouillé temporairement');
      const minutesRestantes = Math.ceil((utilisateur.verrouilleJusqua.getTime() - maintenant.getTime()) / 60000);
      throw new Error(`Compte temporairement verrouillé suite à plusieurs échecs. Réessayez dans ${minutesRestantes} minute(s).`);
    }

    if (!utilisateur.actif) {
      await this.logConnexion(utilisateur.id, ip, userAgent, 'FAILED', 'Compte désactivé');
      throw new Error('Identifiants invalides');
    }

    const validPassword = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!validPassword) {
      const tentatives = utilisateur.tentativesEchouees + 1;
      const doitVerrouiller = tentatives % config.security.maxLoginAttempts === 0;
      const cyclesVerrouillage = tentatives / config.security.maxLoginAttempts;
      const dureeMinutes = doitVerrouiller ? config.security.lockoutDuration * cyclesVerrouillage : null;

      await prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: {
          tentativesEchouees: tentatives,
          verrouille: doitVerrouiller ? true : utilisateur.verrouille,
          verrouilleJusqua: doitVerrouiller
            ? new Date(maintenant.getTime() + dureeMinutes! * 60 * 1000)
            : utilisateur.verrouilleJusqua,
        },
      });

      await this.logConnexion(utilisateur.id, ip, userAgent, 'FAILED', 'Mot de passe incorrect');

      if (doitVerrouiller) {
        throw new Error(`Compte temporairement verrouillé suite à plusieurs échecs. Réessayez dans ${dureeMinutes} minute(s).`);
      }

      throw new Error('Identifiants invalides');
    }

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        tentativesEchouees: 0,
        verrouille: false,
        verrouilleJusqua: null,
        derniereConnexion: new Date(),
      },
    });

    if (utilisateur.doubleAuth) {
      const tempToken = jwt.sign(
        { id: utilisateur.id, twoFactor: true },
        config.jwt.secret,
        { expiresIn: '5m' }
      );
      return {
        requiresTwoFactor: true,
        tempToken,
        message: 'Veuillez entrer votre code de double authentification',
      };
    }

    return this.createSession(utilisateur, ip, userAgent);
  }

  async verify2FA(email: string, code: string, tempToken: string, ip?: string, userAgent?: string) {
    const decoded = jwt.verify(tempToken, config.jwt.secret) as { id: string; twoFactor: boolean };
    if (!decoded.twoFactor) throw new Error('Token 2FA invalide');

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      relationLoadStrategy: 'join', include: {
        profil: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        societe: { select: { id: true, raisonSociale: true, code: true, activiteTransit: true, activiteTransport: true } },
      },
    });

    if (!utilisateur || !utilisateur.secretDoubleAuth) {
      throw new Error('Configuration 2FA invalide');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: utilisateur.secretDoubleAuth,
    });

    if (!isValid) {
      throw new Error('Code de vérification invalide');
    }

    return this.createSession(utilisateur, ip, userAgent);
  }

  async setup2FA(utilisateurId: string) {
    const secret = authenticator.generateSecret();
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
    });

    if (!utilisateur) throw new Error('Utilisateur non trouvé');

    const otpAuthUrl = authenticator.keyuri(
      utilisateur.email,
      'GBTRANS ERP',
      secret
    );

    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    await prisma.utilisateur.update({
      where: { id: utilisateurId },
      data: { secretDoubleAuth: secret, doubleAuth: false },
    });

    return { secret, qrCodeUrl };
  }

  async confirm2FA(utilisateurId: string, code: string) {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
    });

    if (!utilisateur || !utilisateur.secretDoubleAuth) {
      throw new Error('Configuration 2FA invalide. Relancez la configuration.');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: utilisateur.secretDoubleAuth,
    });

    if (!isValid) {
      throw new Error('Code de vérification invalide');
    }

    await prisma.utilisateur.update({
      where: { id: utilisateurId },
      data: { doubleAuth: true },
    });

    return { message: 'Double authentification activée' };
  }

  async changePassword(utilisateurId: string, ancien: string, nouveau: string) {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
    });

    if (!utilisateur) throw new Error('Utilisateur non trouvé');

    const valid = await bcrypt.compare(ancien, utilisateur.motDePasse);
    if (!valid) throw new Error('Ancien mot de passe incorrect');

    const hashed = await bcrypt.hash(nouveau, 12);

    await prisma.utilisateur.update({
      where: { id: utilisateurId },
      data: {
        motDePasse: hashed,
        doitChangerMdp: false,
        expirationMdp: new Date(
          Date.now() + config.security.passwordExpiryDays * 24 * 60 * 60 * 1000
        ),
      },
    });

    const sessions = await prisma.session.findMany({
      where: { utilisateurId, actif: true },
      select: { token: true },
    });

    await prisma.session.updateMany({
      where: { utilisateurId },
      data: { actif: false },
    });

    for (const s of sessions) invalidateSessionCache(s.token);

    return { message: 'Mot de passe modifié avec succès. Veuillez vous reconnecter.' };
  }

  async logout(token: string) {
    await prisma.session.updateMany({
      where: { token },
      data: { actif: false },
    });
    invalidateSessionCache(token);
    return { message: 'Déconnexion réussie' };
  }

  async getProfile(utilisateurId: string) {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        avatar: true,
        doubleAuth: true,
        actif: true,
        derniereConnexion: true,
        createdAt: true,
        societe: {
          select: { id: true, raisonSociale: true, code: true, logo: true, activiteTransit: true, activiteTransport: true },
        },
        agence: {
          select: { id: true, nom: true, code: true },
        },
        profil: {
          select: {
            id: true,
            nom: true,
            estAdmin: true,
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
    if (!utilisateur) return null;

    return {
      ...utilisateur,
      profil: utilisateur.profil
        ? {
            id: utilisateur.profil.id,
            nom: utilisateur.profil.nom,
            estAdmin: utilisateur.profil.estAdmin,
            permissions: utilisateur.profil.permissions.map(
              (p) => `${p.permission.module}:${p.permission.action}`
            ),
          }
        : null,
    };
  }

  private async createSession(
    utilisateur: any,
    ip?: string,
    userAgent?: string
  ) {
    const token = jwt.sign(
      {
        id: utilisateur.id,
        societeId: utilisateur.societeId,
        email: utilisateur.email,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    const expiresAt = new Date(
      Date.now() + config.security.sessionTimeout * 60 * 1000
    );

    await prisma.session.create({
      data: {
        utilisateurId: utilisateur.id,
        token,
        ipAdresse: ip,
        userAgent,
        expiresAt,
      },
    });

    await this.logConnexion(utilisateur.id, ip, userAgent, 'SUCCESS');

    logger.info(`Connexion: ${utilisateur.email} depuis ${ip}`);

    return {
      token,
      expiresAt,
      utilisateur: {
        id: utilisateur.id,
        matricule: utilisateur.matricule,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        societe: utilisateur.societe,
        profil: utilisateur.profil
          ? {
              id: utilisateur.profil.id,
              nom: utilisateur.profil.nom,
              estAdmin: utilisateur.profil.estAdmin,
              permissions: utilisateur.profil.permissions?.map(
                (p: any) => `${p.permission.module}:${p.permission.action}`
              ),
            }
          : null,
      },
    };
  }

  private async logConnexion(
    utilisateurId: string | null,
    ip?: string,
    userAgent?: string,
    statut = 'SUCCESS',
    motif?: string
  ) {
    if (!utilisateurId) return;
    await prisma.historiqueConnexion.create({
      data: { utilisateurId, ipAdresse: ip, userAgent, statut, motif },
    });
  }
}
