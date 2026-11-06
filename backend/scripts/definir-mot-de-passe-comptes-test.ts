/**
 * Définit le mot de passe des comptes de test (admin@, transitaire@, comptable@, commercial@,
 * consultation@gbtrans.ci) et les déverrouille. Le mot de passe n'est jamais écrit dans le code.
 *
 * Usage (PowerShell) :
 *   $env:NOUVEAU_MOT_DE_PASSE="..."; npx tsx scripts/definir-mot-de-passe-comptes-test.ts
 *
 * Variable optionnelle : COMPTES_TEST="a@x.ci,b@x.ci" pour cibler d'autres adresses.
 * La base visée est celle de DATABASE_URL (.env) : vérifiez-la avant de lancer.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPTES_PAR_DEFAUT = [
  'admin@gbtrans.ci',
  'transitaire@gbtrans.ci',
  'comptable@gbtrans.ci',
  'commercial@gbtrans.ci',
  'consultation@gbtrans.ci',
];

async function main() {
  const motDePasse = process.env.NOUVEAU_MOT_DE_PASSE || '';
  if (!motDePasse) throw new Error('NOUVEAU_MOT_DE_PASSE est obligatoire.');

  const emails = (process.env.COMPTES_TEST ? process.env.COMPTES_TEST.split(',') : COMPTES_PAR_DEFAUT)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const hash = await bcrypt.hash(motDePasse, 12);
  const host = (process.env.DATABASE_URL || '').replace(/^[^@]*@/, '').split('/')[0];
  console.log(`Base visée : ${host}`);

  const res = await prisma.utilisateur.updateMany({
    where: { email: { in: emails } },
    data: { motDePasse: hash, verrouille: false, verrouilleJusqua: null, tentativesEchouees: 0 },
  });
  console.log(`${res.count} compte(s) mis à jour sur ${emails.length} demandé(s).`);
  if (res.count < emails.length) {
    const trouves = await prisma.utilisateur.findMany({ where: { email: { in: emails } }, select: { email: true } });
    const set = new Set(trouves.map((u) => u.email));
    console.log('Introuvables :', emails.filter((e) => !set.has(e)).join(', '));
  }
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
