import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';
import { creerClient, creerProforma } from './helpers/fixtures';

describe('Isolation multi-société — Proformas', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;
  let proformaA: { id: string; numero: string };

  beforeAll(async () => {
    const societes = await creerSocietesAB();
    A = societes.A;
    B = societes.B;
    const clientA = await creerClient(A, 'Client pour proforma A');
    proformaA = await creerProforma(A, clientA.id, 75000);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('A peut lire sa propre proforma (contrôle positif)', async () => {
    const res = await api().get(`/api/v1/proformas/${proformaA.id}`).set(authHeader(A.token));
    expect(res.status).toBe(200);
  });

  it("B ne peut pas lire la proforma de A (GET -> 404)", async () => {
    const res = await api().get(`/api/v1/proformas/${proformaA.id}`).set(authHeader(B.token));
    expect(res.status).toBe(404);
  });

  it("B ne peut pas modifier la proforma de A (PUT) et la proforma de A reste inchangée", async () => {
    const res = await api()
      .put(`/api/v1/proformas/${proformaA.id}`)
      .set(authHeader(B.token))
      .send({ titre: 'MODIFIE PAR B' });

    expect(res.status).toBe(404);

    const verif = await api().get(`/api/v1/proformas/${proformaA.id}`).set(authHeader(A.token));
    expect(verif.body.data.titre).toBe('Proforma de test');
  });

  it("B ne peut pas valider la proforma de A", async () => {
    const res = await api().patch(`/api/v1/proformas/${proformaA.id}/valider`).set(authHeader(B.token));
    expect(res.status).toBe(404);

    const verif = await api().get(`/api/v1/proformas/${proformaA.id}`).set(authHeader(A.token));
    expect(verif.body.data.statut).toBe('BROUILLON');
  });

  it("B ne peut pas transformer en facture la proforma de A, même en connaissant son UUID", async () => {
    const res = await api()
      .post(`/api/v1/proformas/${proformaA.id}/transformer-facture`)
      .set(authHeader(B.token));

    expect(res.status).toBe(404);

    // La proforma de A ne doit pas avoir été transformée ni liée à une facture.
    const verif = await api().get(`/api/v1/proformas/${proformaA.id}`).set(authHeader(A.token));
    expect(verif.body.data.statut).toBe('BROUILLON');
    expect(verif.body.data.factureId).toBeNull();

    // Aucune facture parasite ne doit apparaître côté B suite à cette tentative.
    const facturesB = await api().get('/api/v1/factures').set(authHeader(B.token));
    const numerosB = facturesB.body.data.map((f: any) => f.numero);
    expect(numerosB.every((n: string) => !n.includes(proformaA.numero))).toBe(true);
  });

  it("B ne peut pas supprimer la proforma de A (DELETE), elle existe toujours ensuite", async () => {
    const res = await api().delete(`/api/v1/proformas/${proformaA.id}`).set(authHeader(B.token));
    expect(res.status).toBe(404);

    const verif = await api().get(`/api/v1/proformas/${proformaA.id}`).set(authHeader(A.token));
    expect(verif.status).toBe(200);
  });

  it("la liste des proformas de B ne contient jamais la proforma de A", async () => {
    const res = await api().get('/api/v1/proformas').set(authHeader(B.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((p: any) => p.id);
    expect(ids).not.toContain(proformaA.id);
  });

  it("la liste des proformas de A contient bien sa propre proforma", async () => {
    const res = await api().get('/api/v1/proformas').set(authHeader(A.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((p: any) => p.id);
    expect(ids).toContain(proformaA.id);
  });
});
