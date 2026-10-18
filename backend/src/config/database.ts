import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Seuil de journalisation des requêtes lentes (ms) : plus bas en développement.
// Surchargable par SLOW_QUERY_MS.
const SEUIL_REQUETE_LENTE_MS = Number(process.env.SLOW_QUERY_MS) || (process.env.NODE_ENV === 'production' ? 300 : 150);

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > SEUIL_REQUETE_LENTE_MS) {
    logger.warn(`Requête lente (${e.duration}ms > ${SEUIL_REQUETE_LENTE_MS}ms): ${e.query.slice(0, 500)}`);
  }
});

/** Nombre de connexions du pool, lu dans DATABASE_URL (connection_limit), 10 par défaut. */
export function tailleDuPool(): number {
  try {
    const n = Number(new URL(process.env.DATABASE_URL || '').searchParams.get('connection_limit'));
    if (Number.isFinite(n) && n > 0) return Math.min(n, 50);
  } catch { /* URL absente ou invalide */ }
  return 10;
}

/** Ouvre toutes les connexions du pool en parallèle (évite 1 à 20 s à la première requête réelle). */
export async function prechaufferPool(): Promise<number> {
  const n = tailleDuPool();
  await Promise.all(Array.from({ length: n }, () => prisma.$queryRaw`SELECT 1`));
  return n;
}

let minuterieKeepAlive: NodeJS.Timeout | null = null;

/**
 * Maintient les connexions ouvertes (Supabase/pgbouncer/pare-feu coupent les connexions inactives).
 * Un `select 1` en parallèle sur toutes les connexions toutes les ~25 s. unref : n'empêche pas l'arrêt du process.
 */
export function demarrerKeepAlive(intervalleMs = 25_000): void {
  if (minuterieKeepAlive) return;
  minuterieKeepAlive = setInterval(() => {
    // 3 pings seulement : laisse le reste du pool libre pour les requêtes réelles
    Promise.all([1, 2, 3].map(() => prisma.$queryRaw`SELECT 1`)).catch((err) => logger.warn('Keep-alive base de données échoué:', err?.message || err));
  }, intervalleMs);
  minuterieKeepAlive.unref();
}

export default prisma;
