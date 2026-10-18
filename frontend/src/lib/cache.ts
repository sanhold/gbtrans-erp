'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Petit cache client (sans dépendance) :
 *  - dédoublonnage des requêtes en vol (même clé => une seule requête réseau)
 *  - stale-while-revalidate : les données en cache sont servies immédiatement,
 *    puis rafraîchies en arrière-plan si elles sont plus vieilles que `ttl`
 *  - invalidation globale après toute mutation (cf. intercepteur dans api.ts)
 */
interface Entry<T = any> {
  data?: T;
  ts: number;
  promise?: Promise<T>;
  gen: number;
}

const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
let generation = 0;

export const TTL = { court: 15_000, normal: 60_000, reference: 5 * 60_000 };

/** Invalide les entrées dont la clé commence par `prefix` (tout si absent). */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    generation++;
    store.clear();
  } else {
    Array.from(store.keys()).forEach((k) => {
      if (k.startsWith(prefix)) store.delete(k);
    });
  }
  listeners.forEach((l) => l());
}

export function peekCache<T = any>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

export function isFresh(key: string, ttl: number) {
  const e = store.get(key);
  return !!e && e.data !== undefined && Date.now() - e.ts < ttl;
}

/** Retourne les données en cache si fraîches, sinon lance (ou rejoint) la requête. */
export function cachedGet<T>(key: string, fetcher: () => Promise<T>, ttl: number = TTL.normal): Promise<T> {
  const e = store.get(key);
  if (e) {
    if (e.data !== undefined && Date.now() - e.ts < ttl) return Promise.resolve(e.data as T);
    if (e.promise) return e.promise as Promise<T>;
  }
  const gen = generation;
  const promise = fetcher().then(
    (data) => {
      // une mutation a eu lieu pendant le vol : ne pas figer une donnée périmée
      if (gen === generation) store.set(key, { data, ts: Date.now(), gen });
      else if (store.get(key)?.promise === promise) store.delete(key);
      return data;
    },
    (err) => {
      const cur = store.get(key);
      if (cur?.promise === promise) {
        if (cur.data !== undefined) store.set(key, { data: cur.data, ts: cur.ts, gen: cur.gen });
        else store.delete(key);
      }
      throw err;
    }
  );
  store.set(key, { data: e?.data, ts: e?.ts ?? 0, promise, gen });
  return promise;
}

/**
 * Hook : affiche immédiatement le cache (même périmé) puis rafraîchit.
 * `loading` n'est vrai que s'il n'y a encore aucune donnée à afficher.
 */
export function useCachedFetch<T>(key: string | null, fetcher: () => Promise<T>, ttl: number = TTL.normal) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [data, setData] = useState<T | undefined>(() => (key ? peekCache<T>(key) : undefined));
  const [loading, setLoading] = useState<boolean>(() => !!key && peekCache(key) === undefined);
  const [error, setError] = useState<any>(null);

  const run = useCallback(
    (force = false) => {
      if (!key) return Promise.resolve();
      if (force) invalidateCacheKey(key);
      return cachedGet<T>(key, () => fetcherRef.current(), ttl)
        .then((d) => { setData(d); setError(null); })
        .catch((e) => setError(e))
        .finally(() => setLoading(false));
    },
    [key, ttl]
  );

  useEffect(() => {
    if (!key) return;
    const cached = peekCache<T>(key);
    setData(cached);
    setLoading(cached === undefined);
    run();
    // après une mutation, recharger les données affichées
    const l = () => { run(); };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, [key, run]);

  return { data, loading, error, reload: () => run(true) };
}

function invalidateCacheKey(key: string) {
  store.delete(key);
}
