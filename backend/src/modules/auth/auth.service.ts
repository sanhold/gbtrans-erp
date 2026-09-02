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
      include: {
        profil: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        societe: { select: { id: true, raisonSociale: true, code: true } },
      },
    });

    if (!utilisateur) {
      await this.logConnexion(null, ip, userAgent, 'FAILED', 'Utilisateur non trouvé');
      throw new Error('Identifiants incorrects');
    }

    if (utilisateur.verrouille) {
      throw new Error('Compte verrouillé. Contactez l\'administrateur.');
    }

    if (!utilisateur.actif) {
      throw new Error('Compte désactivé');
    }

    const validPassword = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!validPassword) {
      const tentatives = utilisateur.tentativesEchouees + 1;
      const doitVerrouiller = tentatives >= config.security.maxLoginAttempts;

      await prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: {
          tentativesEchouees: tentatives,
          verrouille: doitVerrouiller,
        },
      });

      await this.logConnexion(utilisateur.id, ip, userAgent, 'FAILED', 'Mot de passe incorrect');

      if (doitVerrouiller) {
        throw new Error('Compte verrouillé après trop de tentatives');
      }

      throw new Error(`Identifiants incorrects. ${config.security.maxLoginAttempts - tentatives} tentative(s) restante(s)`);
    }

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        tentativesEchouees: 0,
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
      include: {
        profil: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        societe: { select: { id: true, raisonSociale: true, code: true } },
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
      data: { secretDoubleAuth: secret, doubleAuth: true },
    });

    return { secret, qrCodeUrl };
  }

  async register(data: {
    societeId: string;
    agenceId?: string;
    matricule: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    motDePasse: string;
    profilId?: string;
  }) {
    const existing = await prisma.utilisateur.findFirst({
      where: {
        OR: [{ email: data.email }, { matricule: data.matricule }],
      },
    });

    if (existing) {
      throw new Error('Un utilisateur avec cet email ou matricule existe déjà');
    }

    const hashedPassword = await bcrypt.hash(data.motDePasse, 12);

    const utilisateur = await prisma.utilisateur.create({
      data: {
        ...data,
        motDePasse: hashedPassword,
        expirationMdp: new Date(
          Date.now() + config.security.passwordExpiryDays * 24 * 60 * 60 * 1000
        ),
      },
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        actif: true,
        createdAt: true,
      },
    });

    return utilisateur;
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

    return { message: 'Mot de passe modifié avec succès' };
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
    return prisma.utilisateur.findUnique({
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
          select: { id: true, raisonSociale: true, code: true, logo: true },
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
