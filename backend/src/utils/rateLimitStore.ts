/**
 * Magasin partagé pour express-rate-limit via l'API REST d'Upstash Redis.
 * Sur Vercel (serverless), chaque instance a sa propre mémoire : sans magasin partagé,
 * la limite des tentatives de connexion serait contournable. Si UPSTASH_REDIS_REST_URL et
 * UPSTASH_REDIS_REST_TOKEN sont absents, on retombe sur la mémoire (comportement historique).
 * En cas d'erreur Redis, on laisse passer (fail-open) plutôt que de bloquer la connexion.
 */
import type { Store, Options, IncrementResponse } from 'express-rate-limit';

export function upstashDisponible(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function commande(args: (string | number)[]): Promise<any> {
  const rep = await fetch(`${(process.env.UPSTASH_REDIS_REST_URL as string).replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([args]),
  });
  if (!rep.ok) throw new Error(`Upstash ${rep.status}`);
  const json = (await rep.json()) as Array<{ result?: unknown; error?: string }>;
  if (json[0]?.error) throw new Error(json[0].error);
  return json[0]?.result;
}

export class UpstashStore implements Store {
  private windowMs = 15 * 60 * 1000;
  constructor(private prefixe: string) {}

  init(options: Options): void { this.windowMs = options.windowMs; }

  private cle(k: string) { return `rl:${this.prefixe}:${k}`; }

  async increment(key: string): Promise<IncrementResponse> {
    const resetTime = new Date(Date.now() + this.windowMs);
    try {
      const total = Number(await commande(['INCR', this.cle(key)]));
      let ttl = Number(await commande(['PTTL', this.cle(key)]));
      if (total === 1 || ttl < 0) {
        await commande(['PEXPIRE', this.cle(key), this.windowMs]);
        ttl = this.windowMs;
      }
      return { totalHits: total, resetTime: new Date(Date.now() + ttl) };
    } catch {
      return { totalHits: 1, resetTime };
    }
  }

  async decrement(key: string): Promise<void> {
    try { await commande(['DECR', this.cle(key)]); } catch { /* ignoré */ }
  }

  async resetKey(key: string): Promise<void> {
    try { await commande(['DEL', this.cle(key)]); } catch { /* ignoré */ }
  }
}
