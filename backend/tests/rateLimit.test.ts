// Plafond volontairement bas pour ce fichier : doit être posé AVANT l'import de l'app.
process.env.AUTH_RATE_LIMIT_MAX = '3';

import request from 'supertest';

describe('Limitation de débit sur les routes d\'authentification', () => {
  it('bloque (429) après le plafond de tentatives de connexion échouées', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const app = require('../src/app').default;
    const statuts: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'inconnu@test.local', motDePasse: 'mauvais' });
      statuts.push(res.status);
    }
    expect(statuts.slice(0, 3).every((s) => s !== 429)).toBe(true);
    expect(statuts[3]).toBe(429);
    expect(statuts[4]).toBe(429);
  });

  it('le plafond est partagé avec l\'inscription et le login plateforme', async () => {
    const app = require('../src/app').default;
    const res = await request(app).post('/api/v1/platform/login').send({ email: 'x@y.z', motDePasse: 'x' });
    expect(res.status).toBe(429);
  });
});
