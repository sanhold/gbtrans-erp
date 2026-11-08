import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

/** Les 5 comptes de test : un par profil standard d'une société. */
export const COMPTES_TEST = [
  { email: 'admin@gbtrans.ci', profil: 'ADMIN', nom: 'Administrateur' },
  { email: 'transitaire@gbtrans.ci', profil: 'TRANSITAIRE', nom: 'Transitaire' },
  { email: 'comptable@gbtrans.ci', profil: 'COMPTABLE', nom: 'Comptable' },
  { email: 'commercial@gbtrans.ci', profil: 'COMMERCIAL', nom: 'Commercial' },
  { email: 'consultation@gbtrans.ci', profil: 'CONSULTATION', nom: 'Consultation' },
];

export interface ResultatComptesTest {
  prets: { email: string; profil: string }[];
  ignores: { email: string; raison: string }[];
}

/**
 * Crée ou met à jour les comptes de test d'une société (profil correspondant, mot de passe commun,
 * déverrouillés). Ne touche jamais un compte du même e-mail rattaché à une autre société.
 * Utilisé par la route super-admin et par le script scripts/creer-comptes-test.ts.
 */
export async function creerComptesTest(
  prisma: PrismaClient,
  societe: { id: string; code: string },
  motDePasse: string
): Promise<ResultatComptesTest> {
  const hash = await bcrypt.hash(motDePasse, 12);
  const resultat: ResultatComptesTest = { prets: [], ignores: [] };

  for (const c of COMPTES_TEST) {
    const profil = await prisma.profil.findFirst({ where: { societeId: societe.id, code: c.profil } });
    if (!profil) {
      resultat.ignores.push({ email: c.email, raison: `profil ${c.profil} absent dans cette société` });
      continue;
    }
    const existant = await prisma.utilisateur.findUnique({ where: { email: c.email } });
    if (existant && existant.societeId !== societe.id) {
      resultat.ignores.push({ email: c.email, raison: 'ce compte existe déjà dans une autre société (non modifié)' });
      continue;
    }
    await prisma.utilisateur.upsert({
      where: { email: c.email },
      update: { motDePasse: hash, profilId: profil.id, actif: true, verrouille: false, verrouilleJusqua: null, tentativesEchouees: 0 },
      create: {
        societeId: societe.id,
        matricule: `TEST-${c.profil}-${societe.code}`.slice(0, 50),
        nom: c.nom, prenom: 'Test', email: c.email, motDePasse: hash, profilId: profil.id, actif: true,
      },
    });
    resultat.prets.push({ email: c.email, profil: c.profil });
  }
  return resultat;
}
