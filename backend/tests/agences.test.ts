import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';

describe('Agences — liste de référence', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;

  beforeAll(async () => {
    const societes = await creerSocietesAB();
    A = societes.A;
    B = societes.B;
    const suffixe = Date.now().toString(36).slice(-5).toUpperCase();
    await prisma.agence.create({ data: { societeId: A.societeId, code: `A${suffixe}`, nom: 'Agence Abidjan A' } });
    await prisma.agence.create({ data: { societeId: A.societeId, code: `I${suffixe}`, nom: 'Agence inactive A', actif: false } });
    await prisma.agence.create({ data: { societeId: B.societeId, code: `B${suffixe}`, nom: 'Agence de B' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('refuse sans authentification', async () => {
    const res = await api().get('/api/v1/agences');
    expect(res.status).toBe(401);
  });

  it("renvoie uniquement les agences actives de la société de l'utilisateur", async () => {
    const res = await api().get('/api/v1/agences').set(authHeader(A.token));
    expect(res.status).toBe(200);
    const noms = res.body.data.map((a: { nom: string }) => a.nom);
    expect(noms).toContain('Agence Abidjan A');
    expect(noms).not.toContain('Agence inactive A');
    expect(noms).not.toContain('Agence de B');
  });
});
