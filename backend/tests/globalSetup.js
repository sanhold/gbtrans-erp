// Jest globalSetup : exécuté UNE SEULE FOIS avant toute la suite, dans un processus
// séparé des workers de test. Volontairement en CommonJS (pas de transform ts-jest
// nécessaire) pour rester simple et robuste.
//
// Rôle :
//  1. Charger backend/.env.test (jamais backend/.env) et vérifier que DATABASE_URL
//     cible bien une base locale.
//  2. Réinitialiser entièrement le schéma de la base de test (prisma migrate reset
//     --force) pour garantir un état propre et déterministe à chaque exécution de
//     `npm test`, même après un run précédent en échec.
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

module.exports = async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
  process.env.NODE_ENV = 'test';

  const databaseUrl = process.env.DATABASE_URL || '';
  const cibleAutorisee = /^(postgres(ql)?:\/\/)[^@]+@(localhost|127\.0\.0\.1)[:/]/i.test(databaseUrl);

  if (!cibleAutorisee || databaseUrl.includes('supabase')) {
    throw new Error(
      'Garde-fou sécurité tests : DATABASE_URL (.env.test) doit pointer vers une base locale ' +
      '(localhost/127.0.0.1) et ne jamais contenir "supabase". Exécution interrompue AVANT ' +
      'toute opération destructrice sur une base de données.'
    );
  }

  const backendDir = path.resolve(__dirname, '..');

  // eslint-disable-next-line no-console
  console.log('[globalSetup] Réinitialisation de la base de test (prisma migrate reset --force)...');
  execSync('npx prisma migrate reset --force --skip-seed', {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env,
  });
  // eslint-disable-next-line no-console
  console.log('[globalSetup] Base de test prête.');
};
