import crypto from 'crypto';
import { chiffrer, chiffrementConfigure, dechiffrer } from '../../src/utils/secretCrypto';

describe('secretCrypto (AES-256-GCM)', () => {
  const ancienne = process.env.ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  });
  afterAll(() => {
    if (ancienne === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = ancienne;
  });

  it('déchiffre ce qu\'il a chiffré', () => {
    expect(dechiffrer(chiffrer('secret-API-123 éè'))).toBe('secret-API-123 éè');
  });
  it('produit un chiffré différent à chaque appel (IV aléatoire)', () => {
    expect(chiffrer('abc')).not.toBe(chiffrer('abc'));
  });
  it('ne contient pas le texte clair', () => {
    expect(Buffer.from(chiffrer('motdepasse-visible'), 'base64').toString('utf8')).not.toContain('motdepasse-visible');
  });
  it('rejette un chiffré altéré', () => {
    const buf = Buffer.from(chiffrer('abc'), 'base64');
    buf[buf.length - 1] ^= 0xff;
    expect(() => dechiffrer(buf.toString('base64'))).toThrow();
  });
  it('ne déchiffre pas avec une autre clé', () => {
    const c = chiffrer('abc');
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    expect(() => dechiffrer(c)).toThrow();
  });
  it('exige une clé présente et de 32 octets', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(chiffrementConfigure()).toBe(false);
    expect(() => chiffrer('x')).toThrow(/ENCRYPTION_KEY manquante/);
    process.env.ENCRYPTION_KEY = Buffer.from('trop-court').toString('base64');
    expect(() => chiffrer('x')).toThrow(/32 octets/);
  });
});
