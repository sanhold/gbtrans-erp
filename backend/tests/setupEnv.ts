import dotenv from 'dotenv';
import path from 'path';

// Charge .env.test AVANT tout import de code source (config/index.ts, config/database.ts,
// Prisma Client...). dotenv.config() ne remplace pas une variable d'environnement déjà
// présente dans process.env par défaut : { override: true } est indispensable ici pour
// garantir que les valeurs de .env.test priment, y compris si un .env.test.local ou une
// variable d'environnement système traîne.
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

process.env.NODE_ENV = 'test';

// Garde-fou non négociable : on n'exécute JAMAIS les tests contre une base distante
// (notamment la base de production Supabase référencée par backend/.env). Seule une
// base locale (localhost/127.0.0.1) est autorisée pour la suite de tests.
const databaseUrl = process.env.DATABASE_URL || '';
const cibleAutorisee = /^(postgres(ql)?:\/\/)[^@]+@(localhost|127\.0\.0\.1)[:/]/i.test(databaseUrl);

if (!cibleAutorisee) {
  throw new Error(
    `Garde-fou sécurité tests : DATABASE_URL doit pointer vers une base locale (localhost/127.0.0.1). ` +
    `Valeur actuelle (tronquée) : "${databaseUrl.replace(/:\/\/[^@]+@/, '://***@')}". ` +
    `Vérifiez backend/.env.test — les tests ne doivent jamais toucher la base de production.`
  );
}

if (databaseUrl.includes('supabase')) {
  throw new Error('Garde-fou sécurité tests : DATABASE_URL contient "supabase" — exécution bloquée.');
}
