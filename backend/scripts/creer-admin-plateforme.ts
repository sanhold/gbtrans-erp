/**
 * Crée (ou met à jour) un administrateur de la plateforme (table platform_admins).
 *
 * Usage (PowerShell) :
 *   $env:ADMIN_EMAIL="adresse@exemple.com"; $env:ADMIN_PASSWORD="motdepasse-solide"; npx tsx scripts/creer-admin-plateforme.ts
 *
 * Variables optionnelles : ADMIN_NOM, ADMIN_PRENOM, ADMIN_SUPER (false = lecture seule).
 * La base visée est celle de DATABASE_URL (.env) : vérifiez-la avant de lancer.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const motDePasse = process.env.ADMIN_PASSWORD || '';
  if (!email || !motDePasse) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires.');
  }

  const hash = await bcrypt.hash(motDePasse, 12);
  const superAdmin = process.env.ADMIN_SUPER !== 'false';
  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    update: { motDePasse: hash, actif: true, superAdmin },
    create: {
      email,
      motDePasse: hash,
      nom: process.env.ADMIN_NOM || 'Admin',
      prenom: process.env.ADMIN_PRENOM || 'Plateforme',
      superAdmin,
    },
  });
  console.log(`Administrateur plateforme prêt : ${admin.email} (superAdmin=${admin.superAdmin})`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
