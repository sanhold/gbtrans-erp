import { UpstashStore } from '../../src/utils/rateLimitStore';
import { enregistrerFichier, lireFichier } from '../../src/utils/stockage';

const fetchOrig = global.fetch;
afterEach(() => { global.fetch = fetchOrig; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_KEY; });

describe('UpstashStore', () => {
  beforeEach(() => { process.env.UPSTASH_REDIS_REST_URL = 'https://x.upstash.io'; process.env.UPSTASH_REDIS_REST_TOKEN = 't'; });

  it('incrémente et pose l\'expiration au premier appel', async () => {
    const appels: any[] = [];
    global.fetch = jest.fn(async (_u: any, init: any) => {
      const cmd = JSON.parse(init.body)[0];
      appels.push(cmd);
      const r = cmd[0] === 'INCR' ? 1 : cmd[0] === 'PTTL' ? -1 : 1;
      return { ok: true, json: async () => [{ result: r }] } as any;
    }) as any;
    const store = new UpstashStore('auth'); store.init({ windowMs: 1000 } as any);
    const rep = await store.increment('1.2.3.4');
    expect(rep.totalHits).toBe(1);
    expect(appels.map((a) => a[0])).toEqual(['INCR', 'PTTL', 'PEXPIRE']);
    expect(appels[0][1]).toBe('rl:auth:1.2.3.4');
  });

  it('laisse passer si Redis est indisponible (fail-open)', async () => {
    global.fetch = jest.fn(async () => { throw new Error('réseau'); }) as any;
    const rep = await new UpstashStore('auth').increment('ip');
    expect(rep.totalHits).toBe(1);
  });
});

describe('stockage distant (Supabase Storage)', () => {
  beforeEach(() => { process.env.SUPABASE_URL = 'https://p.supabase.co'; process.env.SUPABASE_SERVICE_KEY = 'cle'; });

  it('envoie le fichier vers le bucket avec la clé de service', async () => {
    const f = jest.fn(async () => ({ ok: true, status: 200 }));
    global.fetch = f as any;
    await enregistrerFichier('documents/s1/a b.pdf', Buffer.from('x'), 'application/pdf');
    const [url, init] = f.mock.calls[0] as any;
    expect(url).toBe('https://p.supabase.co/storage/v1/object/documents/documents/s1/a%20b.pdf');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer cle');
  });

  it('retourne null si le fichier est absent', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 })) as any;
    expect(await lireFichier('documents/s1/x.pdf')).toBeNull();
  });

  it('lève une erreur si l\'envoi échoue', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as any;
    await expect(enregistrerFichier('a/b', Buffer.from('x'), 'text/plain')).rejects.toThrow();
  });
});
