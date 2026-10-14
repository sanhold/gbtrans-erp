import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../../src/config/database';

/** Mot de passe clair commun à tous les utilisateurs de test (hashé en base). */
export const MOT_DE_PASSE_TEST = 'TestPassw0rd!';

export interface SocieteDeTest {
  societeId: string;
  code: string;
  profilAdminId: string;
  utilisateurId: string;
  email: string;
}

/**
 * Crée une société de test avec un profil Admin (estAdmin: true, qui contourne les
 * vérifications de permission applicatives) et un utilisateur actif rattaché. Équivalent
 * minimal du flux d'inscription SaaS, mais directement via Prisma (pas de passage par
 * POST /saas/inscription).
 */
export async function creerSocieteAvecAdmin(libelle: string): Promise<SocieteDeTest> {
  const suffixe = randomUUID().replace(/-/g, '').slice(0, 10);

  const societe = await prisma.societe.create({
    data: {
      code: `T${suffixe}`.toUpperCase().slice(0, 20),
      raisonSociale: `${libelle} (test ${suffixe})`,
      activiteTransit: true,
      activiteTransport: true,
    },
  });

  const profilAdmin = await prisma.profil.create({
    data: {
      societeId: societe.id,
      code: 'ADMIN',
      nom: 'Administrateur',
      estAdmin: true,
    },
  });

  const motDePasse = await bcrypt.hash(MOT_DE_PASSE_TEST, 10);
  const email = `admin.${suffixe}@test.gbtrans.local`;

  const utilisateur = await prisma.utilisateur.create({
    data: {
      societeId: societe.id,
      matricule: `ADM-${suffixe}`,
      nom: 'Admin',
      prenom: libelle.replace(/\s+/g, ''),
      email,
      motDePasse,
      actif: true,
      profilId: profilAdmin.id,
    },
  });

  return {
    societeId: societe.id,
    code: societe.code,
    profilAdminId: profilAdmin.id,
    utilisateurId: utilisateur.id,
    email,
  };
}

/** Crée un profil sans aucune permission (estAdmin: false, aucune ligne ProfilPermission). */
export async function creerProfilSansPermission(societeId: string, libelle = 'Sans permissions') {
  const suffixe = randomUUID().replace(/-/g, '').slice(0, 8);
  return prisma.profil.create({
    data: {
      societeId,
      code: `NOPERM${suffixe}`.toUpperCase(),
      nom: libelle,
      estAdmin: false,
    },
  });
}

/** Crée un utilisateur actif rattaché à un profil donné (admin ou restreint) dans une société. */
export async function creerUtilisateurAvecProfil(societeId: string, profilId: string, libelle: string) {
  const suffixe = randomUUID().replace(/-/g, '').slice(0, 10);
  const motDePasse = await bcrypt.hash(MOT_DE_PASSE_TEST, 10);
  const email = `${libelle.toLowerCase().replace(/[^a-z0-9]/g, '')}.${suffixe}@test.gbtrans.local`;

  const utilisateur = await prisma.utilisateur.create({
    data: {
      societeId,
      matricule: `USR-${suffixe}`,
      nom: libelle,
      prenom: 'Test',
      email,
      motDePasse,
      actif: true,
      profilId,
    },
  });

  return { utilisateurId: utilisateur.id, email };
}

export default prisma;
