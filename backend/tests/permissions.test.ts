import prisma from '../src/config/database';
import { api, authHeader, connecter } from './helpers/http';
import { creerContexteSociete, ContexteSociete } from './helpers/monde';
import { creerProfilSansPermission, creerUtilisateurAvecProfil } from './helpers/seed';

describe('Permissions — profil sans droit CREER', () => {
  let A: ContexteSociete;
  let tokenSansPermission: string;

  beforeAll(async () => {
    A = await creerContexteSociete('Société Permissions');

    const profilRestreint = await creerProfilSansPermission(A.societeId, 'Lecture seule');
    const { email } = await creerUtilisateurAvecProfil(A.societeId, profilRestreint.id, 'UtilisateurRestreint');
    tokenSansPermission = await connecter(email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("un utilisateur sans CLIENTS:CREER reçoit 403 sur POST /clients", async () => {
    const res = await api()
      .post('/api/v1/clients')
      .set(authHeader(tokenSansPermission))
      .send({ type: 'ENTREPRISE', raisonSociale: 'Client interdit' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("un utilisateur sans DOSSIERS:CREER reçoit 403 sur POST /dossiers", async () => {
    const res = await api()
      .post('/api/v1/dossiers')
      .set(authHeader(tokenSansPermission))
      .send({ numeroPhysique: 'X-01/2026', clientId: 'inexistant', nature: 'IMPORT', type: 'MARITIME' });

    expect(res.status).toBe(403);
  });

  it("un utilisateur sans FACTURATION:CREER reçoit 403 sur POST /factures", async () => {
    const res = await api()
      .post('/api/v1/factures')
      .set(authHeader(tokenSansPermission))
      .send({ clientId: 'inexistant', objet: 'Test', lignes: [] });

    expect(res.status).toBe(403);
  });

  it("l'admin de la même société (estAdmin: true) peut en revanche créer un client (contrôle positif)", async () => {
    const res = await api()
      .post('/api/v1/clients')
      .set(authHeader(A.token))
      .send({ type: 'ENTREPRISE', raisonSociale: 'Client autorisé pour admin' });

    expect(res.status).toBe(201);
  });
});
