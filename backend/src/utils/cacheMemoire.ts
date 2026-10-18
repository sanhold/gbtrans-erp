/**
 * Petit cache mémoire TTL, cloisonné par societeId, avec invalidation simple.
 * Un seul process (WEB_CONCURRENCY=1) : une Map suffit. Les entrées expirées sont
 * purgées paresseusement + un balayage périodique (unref, n'empêche pas l'arrêt).
 *
 * Usage :
 *   const data = await cacheSociete('dashboard:stats', societeId, 30_000, () => calcul(), String(annee));
 *   invaliderSociete(societeId, 'dashboard:');   // ou invaliderSociete(societeId) pour tout
 */

interface Entree {
  valeur: unknown;
  expireA: number;
}

const cache = new Map<string, Entree>();
// Requêtes en cours : évite que 5 appels simultanés à froid recalculent 5 fois (anti "stampede").
const enCours = new Map<string, Promise<unknown>>();

const cleComplete = (societeId: string, espace: string, params = '') => `${societeId}|${espace}|${params}`;

export function lireCache<T>(societeId: string, espace: string, params = ''): T | undefined {
  const cle = cleComplete(societeId, espace, params);
  const e = cache.get(cle);
  if (!e) return undefined;
  if (e.expireA < Date.now()) { cache.delete(cle); return undefined; }
  return e.valeur as T;
}

export function ecrireCache<T>(societeId: string, espace: string, ttlMs: number, valeur: T, params = ''): void {
  cache.set(cleComplete(societeId, espace, params), { valeur, expireA: Date.now() + ttlMs });
}

/** Retourne la valeur en cache ou la calcule (une seule fois même en cas d'appels concurrents). */
export async function cacheSociete<T>(
  espace: string,
  societeId: string,
  ttlMs: number,
  calcul: () => Promise<T>,
  params = '',
): Promise<T> {
  const present = lireCache<T>(societeId, espace, params);
  if (present !== undefined) return present;

  const cle = cleComplete(societeId, espace, params);
  const existant = enCours.get(cle) as Promise<T> | undefined;
  if (existant) return existant;

  const p = calcul()
    .then((v) => { ecrireCache(societeId, espace, ttlMs, v, params); return v; })
    .finally(() => { enCours.delete(cle); });
  enCours.set(cle, p);
  return p;
}

/** Invalide les entrées d'une société, éventuellement limitées à un préfixe d'espace. */
export function invaliderSociete(societeId: string, prefixeEspace = ''): void {
  const debut = `${societeId}|${prefixeEspace}`;
  for (const cle of cache.keys()) {
    if (cle.startsWith(debut)) cache.delete(cle);
  }
}

const balayage = setInterval(() => {
  const now = Date.now();
  for (const [cle, e] of cache) if (e.expireA < now) cache.delete(cle);
}, 60_000);
balayage.unref();
