/**
 * Crée (ou met à jour) les 5 comptes de test d'UNE société existante, avec le profil correspondant
 * (Administrateur, Transitaire, Comptable, Commercial, Consultation) et un mot de passe commun.
 * Le mot de passe n'est jamais écrit dans le code : il vient de la variable NOUVEAU_MOT_DE_PASSE.
 *
 * Usage (PowerShell), depuis le dossier backend :
 *   $env:DATABASE_URL="<celle de Render>"; $env:SOCIETE_CODE="TEST"; $env:NOUVEAU_MOT_DE_PASSE="..."
 *   npx tsx scripts/creer-comptes-test.ts
 *
 * Sans SOCIETE_CODE, le script liste les sociétés disponibles et s'arrête (rien n'est modifié).
 * Conseil : utilisez une société dédiée aux tests (créée via la page d'inscription), pas votre
 * société réelle : le compte « Administrateur » de test a tous les droits.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { COMPTES_TEST, creerComptesTest } from '../src/utils/comptesTest';

const prisma = new PrismaClient();

async function main() {
  const host = (process.env.DATABASE_URL || '').replace(/^[^@]*@/, '').split('/')[0];
  console.log(`Base visée : ${host}`);

  const code = (process.env.SOCIETE_CODE || '').trim();
  if (!code) {
    const societes = await prisma.societe.findMany({ select: { code: true, raisonSociale: true }, orderBy: { createdAt: 'asc' }, take: 50 });
    console.log('SOCIETE_CODE non renseigné. Sociétés disponibles :');
    societes.forEach((s) => console.log(` - ${s.code}  (${s.raisonSociale})`));
    return;
  }

  const motDePasse = process.env.NOUVEAU_MOT_DE_PASSE || '';
  if (!motDePasse) throw new Error('NOUVEAU_MOT_DE_PASSE est obligatoire.');

  const societe = await prisma.societe.findUnique({ where: { code } });
  if (!societe) throw new Error(`Société "${code}" introuvable. Relancez sans SOCIETE_CODE pour lister les codes.`);

  const r = await creerComptesTest(prisma, societe, motDePasse);
  r.prets.forEach((c) => console.log(` ✓ ${c.email}  (${c.profil})`));
  r.ignores.forEach((c) => console.log(` ! ${c.email} ignoré : ${c.raison}`));
  console.log(`${r.prets.length}/${COMPTES_TEST.length} compte(s) prêt(s) dans la société ${societe.code} (${societe.raisonSociale}).`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
