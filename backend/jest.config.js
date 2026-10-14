/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // Charge backend/.env.test et vérifie le garde-fou anti-production AVANT tout import
  // de code source par chaque fichier de test.
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  // Réinitialise le schéma de la base de test une seule fois avant toute la suite.
  globalSetup: '<rootDir>/tests/globalSetup.js',
  // Exécution séquentielle : simple, déterministe, évite de saturer le pool de
  // connexions de l'instance PostgreSQL locale avec plusieurs PrismaClient en parallèle.
  maxWorkers: 1,
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
};
