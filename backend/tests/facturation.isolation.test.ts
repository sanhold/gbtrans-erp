import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';
import { creerClient, creerFacture, validerFacture } from './helpers/fixtures';

describe('Isolation multi-société — Facturation', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;
  let factureA: { id: string; numero: string; montantTTC: string; resteAPayer: string };

  beforeAll(async () => {
    const societes = await creerSocietesAB();
    A = societes.A;
    B = societes.B;
    const clientA = await creerClient(A, 'Client pour facture A');
    factureA = await creerFacture(A, clientA.id, 150000);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('A peut lire sa propre facture (contrôle positif)', async () => {
    const res = await api().get(`/api/v1/factures/${factureA.id}`).set(authHeader(A.token));
    expect(res.status).toBe(200);
  });

  it("B ne peut pas lire la facture de A (GET -> 404)", async () => {
    const res = await api().get(`/api/v1/factures/${factureA.id}`).set(authHeader(B.token));
    expect(res.status).toBe(404);
  });

  it("B ne peut pas valider la facture de A", async () => {
    const res = await api().patch(`/api/v1/factures/${factureA.id}/valider`).set(authHeader(B.token));
    expect(res.status).toBe(400);

    const verif = await api().get(`/api/v1/factures/${factureA.id}`).set(authHeader(A.token));
    expect(verif.body.data.statut).toBe('BROUILLON');
  });

  it("B ne peut pas annuler la facture de A", async () => {
    const res = await api().patch(`/api/v1/factures/${factureA.id}/annuler`).set(authHeader(B.token));
    expect(res.status).toBe(400);

    const verif = await api().get(`/api/v1/factures/${factureA.id}`).set(authHeader(A.token));
    expect(verif.body.data.statut).toBe('BROUILLON');
  });

  it("B ne peut pas ajouter de ligne à la facture de A", async () => {
    const res = await api()
      .post(`/api/v1/factures/${factureA.id}/lignes`)
      .set(authHeader(B.token))
      .send({ designation: 'Ligne injectée par B', montant: 999999 });
    expect(res.status).toBe(404);
  });

  describe('Paiement cross-tenant sur une facture validée', () => {
    let factureValideeId: string;

    beforeAll(async () => {
      const facture = await validerFacture(A, factureA.id);
      factureValideeId = facture.id;
    });

    it("B connaît l'UUID de la facture de A mais ne peut pas y enregistrer un paiement", async () => {
      const res = await api()
        .post(`/api/v1/factures/${factureValideeId}/paiement`)
        .set(authHeader(B.token))
        .send({ montant: 50000, modePaiement: 'ESPECES' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      // La facture de A ne doit avoir subi aucun encaissement suite à cette tentative.
      const verif = await api().get(`/api/v1/factures/${factureValideeId}`).set(authHeader(A.token));
      expect(verif.body.data.statut).toBe('VALIDEE');
      expect(Number(verif.body.data.montantPaye)).toBe(0);
      expect(Number(verif.body.data.resteAPayer)).toBe(Number(factureA.montantTTC));
    });

    it("A peut en revanche payer sa propre facture (contrôle positif) et B ne voit jamais ce paiement", async () => {
      const paiement = await api()
        .post(`/api/v1/factures/${factureValideeId}/paiement`)
        .set(authHeader(A.token))
        .send({ montant: 50000, modePaiement: 'ESPECES' });
      expect(paiement.status).toBe(201);

      const listeB = await api().get('/api/v1/finance/paiements').set(authHeader(B.token));
      expect(listeB.status).toBe(200);
      const idsB = listeB.body.data.map((p: any) => p.id);
      expect(idsB).not.toContain(paiement.body.data.id);

      const listeA = await api().get('/api/v1/finance/paiements').set(authHeader(A.token));
      const idsA = listeA.body.data.map((p: any) => p.id);
      expect(idsA).toContain(paiement.body.data.id);
    });
  });

  it("la liste des factures de B ne contient jamais la facture de A", async () => {
    const res = await api().get('/api/v1/factures').set(authHeader(B.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((f: any) => f.id);
    expect(ids).not.toContain(factureA.id);
  });
});
