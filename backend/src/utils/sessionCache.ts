import { AuthRequest } from '../types';

/**
 * Cache mémoire du user authentifié par token, pour éviter de refaire la
 * jointure session→utilisateur→profil→permissions à chaque requête (c'était
 * le principal goulot d'étranglement : 2 allers-retours DB séquentiels par
 * appel API). TTL courte pour borner la fraîcheur des permissions/statut
 * du compte. Un seul process (WEB_CONCURRENCY=1) donc une Map suffit.
 */

const TTL_MS = 45_000;

interface CacheEntry {
  user: AuthRequest['user'];
  sessionExpiresAt: Date;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedUser(token: string): AuthRequest['user'] | null {
  const entry = cache.get(token);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) { cache.delete(token); return null; }
  if (entry.sessionExpiresAt < new Date()) { cache.delete(token); return null; }
  return entry.user;
}

export function setCachedUser(token: string, user: AuthRequest['user'], sessionExpiresAt: Date): void {
  cache.set(token, { user, sessionExpiresAt, cachedAt: Date.now() });
}

export function invalidateSessionCache(token: string): void {
  cache.delete(token);
}
