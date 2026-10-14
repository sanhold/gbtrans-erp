import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';
import { creerClient, creerDossier } from './helpers/fixtures';

describe('Isolation multi-société — Dossiers', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;
  let dossierA: { id: string; numero: string };

  beforeAll(async () => {
    const societes = await creerSocietesAB();
    A = societes.A;
    B = societes.B;
    const clientA = await creerClient(A, 'Client pour dossier A');
    dossierA = await creerDossier(A, clientA.id, 'I-01/2026');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('A peut lire son propre dossier (contrôle positif)', async () => {
    const res = await api().get(`/api/v1/dossiers/${dossierA.id}`).set(authHeader(A.token));
    expect(res.status).toBe(200);
  });

  it("B ne peut pas lire le dossier de A (GET -> 404)", async () => {
    const res = await api().get(`/api/v1/dossiers/${dossierA.id}`).set(authHeader(B.token));
    expect(res.status).toBe(404);
  });

  it("B ne peut pas modifier le dossier de A (PUT) et le dossier de A reste inchangé", async () => {
    const res = await api()
      .put(`/api/v1/dossiers/${dossierA.id}`)
      .set(authHeader(B.token))
      .send({ designation: 'MODIFIE PAR B' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const verif = await api().get(`/api/v1/dossiers/${dossierA.id}`).set(authHeader(A.token));
    expect(verif.body.data.designation).toBe('Marchandise de test');
  });

  it("B ne peut pas changer le statut du dossier de A", async () => {
    const res = await api()
      .patch(`/api/v1/dossiers/${dossierA.id}/statut`)
      .set(authHeader(B.token))
      .send({ statut: 'ANNULE' });

    expect(res.status).toBe(400);

    const verif = await api().get(`/api/v1/dossiers/${dossierA.id}`).set(authHeader(A.token));
    expect(verif.body.data.statut).toBe('NOUVEAU');
  });

  it("B ne peut pas supprimer le dossier de A (DELETE), le dossier existe toujours ensuite", async () => {
    const res = await api().delete(`/api/v1/dossiers/${dossierA.id}`).set(authHeader(B.token));
    expect(res.status).toBe(400);

    const verif = await api().get(`/api/v1/dossiers/${dossierA.id}`).set(authHeader(A.token));
    expect(verif.status).toBe(200);
    expect(verif.body.data.id).toBe(dossierA.id);
  });

  it("la liste des dossiers de B ne contient jamais le dossier de A", async () => {
    const res = await api().get('/api/v1/dossiers').set(authHeader(B.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((d: any) => d.id);
    expect(ids).not.toContain(dossierA.id);
  });

  it("la liste des dossiers de A contient bien son propre dossier", async () => {
    const res = await api().get('/api/v1/dossiers').set(authHeader(A.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((d: any) => d.id);
    expect(ids).toContain(dossierA.id);
  });
});
