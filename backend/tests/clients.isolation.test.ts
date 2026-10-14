import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';
import { creerClient } from './helpers/fixtures';

describe('Isolation multi-société — Clients', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;
  let clientA: { id: string; raisonSociale: string };

  beforeAll(async () => {
    const societes = await creerSocietesAB();
    A = societes.A;
    B = societes.B;
    clientA = await creerClient(A, 'Client Confidentiel A');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('A peut lire son propre client (contrôle positif)', async () => {
    const res = await api().get(`/api/v1/clients/${clientA.id}`).set(authHeader(A.token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(clientA.id);
  });

  it("B ne peut pas lire le client de A (GET -> 404)", async () => {
    const res = await api().get(`/api/v1/clients/${clientA.id}`).set(authHeader(B.token));
    expect(res.status).toBe(404);
  });

  it("B ne peut pas modifier le client de A (PUT) et le client de A reste inchangé", async () => {
    const res = await api()
      .put(`/api/v1/clients/${clientA.id}`)
      .set(authHeader(B.token))
      .send({ raisonSociale: 'MODIFIE PAR B' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const verif = await api().get(`/api/v1/clients/${clientA.id}`).set(authHeader(A.token));
    expect(verif.body.data.raisonSociale).toBe('Client Confidentiel A');
  });

  it("B ne peut pas bloquer le client de A", async () => {
    const res = await api()
      .patch(`/api/v1/clients/${clientA.id}/bloquer`)
      .set(authHeader(B.token))
      .send({ motif: 'tentative malveillante' });

    expect(res.status).toBe(400);

    const verif = await api().get(`/api/v1/clients/${clientA.id}`).set(authHeader(A.token));
    expect(verif.body.data.bloque).toBe(false);
  });

  it("B ne peut pas archiver le client de A", async () => {
    const res = await api()
      .patch(`/api/v1/clients/${clientA.id}/archiver`)
      .set(authHeader(B.token));

    expect(res.status).toBe(400);

    const verif = await api().get(`/api/v1/clients/${clientA.id}`).set(authHeader(A.token));
    expect(verif.body.data.archive).toBe(false);
  });

  // NB: le module clients n'expose pas de route DELETE /:id (suppression logique uniquement
  // via /bloquer et /archiver, déjà couvertes ci-dessus).

  it("la liste des clients de B ne contient jamais le client de A", async () => {
    const res = await api().get('/api/v1/clients').set(authHeader(B.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((c: any) => c.id);
    expect(ids).not.toContain(clientA.id);
  });

  it("la liste des clients de A contient bien son propre client", async () => {
    const res = await api().get('/api/v1/clients').set(authHeader(A.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((c: any) => c.id);
    expect(ids).toContain(clientA.id);
  });
});
