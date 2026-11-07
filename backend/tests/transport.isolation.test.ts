import prisma from '../src/config/database';
import { api, authHeader, connecter } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';
import { creerProfilSansPermission, creerUtilisateurAvecProfil } from './helpers/seed';

describe('Transport — véhicules et chauffeurs (isolation multi-société et permissions)', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;
  let vehiculeA: { id: string; immatriculation: string };
  let chauffeurA: { id: string };
  let tokenSansPermission: string;

  beforeAll(async () => {
    ({ A, B } = await creerSocietesAB());

    const v = await api().post('/api/v1/transport/vehicules').set(authHeader(A.token))
      .send({ immatriculation: '1234 AB 01', marque: 'Renault', type: 'CAMION', kilometrage: 1000 });
    expect(v.status).toBe(201);
    vehiculeA = v.body.data;

    const c = await api().post('/api/v1/transport/chauffeurs').set(authHeader(A.token))
      .send({ nom: 'KONE', prenom: 'Ibrahim', numeroPermis: 'P-001' });
    expect(c.status).toBe(201);
    chauffeurA = c.body.data;

    const profil = await creerProfilSansPermission(A.societeId, 'Sans transport');
    const { email } = await creerUtilisateurAvecProfil(A.societeId, profil.id, 'SansTransport');
    tokenSansPermission = await connecter(email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Véhicules', () => {
    it('A lit son véhicule (contrôle positif)', async () => {
      const res = await api().get(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(authHeader(A.token));
      expect(res.status).toBe(200);
      expect(res.body.data.immatriculation).toBe('1234 AB 01');
    });

    it('B ne peut pas lire le véhicule de A (404)', async () => {
      const res = await api().get(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(authHeader(B.token));
      expect(res.status).toBe(404);
    });

    it('B ne peut pas modifier le véhicule de A, qui reste inchangé', async () => {
      const res = await api().put(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(authHeader(B.token))
        .send({ marque: 'PIRATE', kilometrage: 1 });
      expect(res.status).toBe(404);

      const verif = await api().get(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(authHeader(A.token));
      expect(verif.body.data.marque).toBe('Renault');
      expect(verif.body.data.kilometrage).toBe(1000);
    });

    it('B ne peut pas supprimer le véhicule de A, qui existe toujours', async () => {
      const res = await api().delete(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(authHeader(B.token));
      expect(res.status).toBe(404);
      const verif = await api().get(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(authHeader(A.token));
      expect(verif.status).toBe(200);
    });

    it('la liste de B ne contient jamais le véhicule de A', async () => {
      const res = await api().get('/api/v1/transport/vehicules').set(authHeader(B.token));
      expect(res.status).toBe(200);
      expect(res.body.data.map((v: any) => v.id)).not.toContain(vehiculeA.id);
    });

    it('l\'immatriculation est unique par société, mais B peut utiliser la même que A', async () => {
      const doublon = await api().post('/api/v1/transport/vehicules').set(authHeader(A.token))
        .send({ immatriculation: '1234 AB 01' });
      expect(doublon.status).toBe(400);

      const chezB = await api().post('/api/v1/transport/vehicules').set(authHeader(B.token))
        .send({ immatriculation: '1234 AB 01' });
      expect(chezB.status).toBe(201);
    });

    it('l\'immatriculation est obligatoire', async () => {
      const res = await api().post('/api/v1/transport/vehicules').set(authHeader(A.token)).send({ marque: 'X' });
      expect(res.status).toBe(400);
    });
  });

  describe('Chauffeurs', () => {
    it('B ne peut pas lire ni modifier le chauffeur de A', async () => {
      const lire = await api().get(`/api/v1/transport/chauffeurs/${chauffeurA.id}`).set(authHeader(B.token));
      expect(lire.status).toBe(404);

      const modifier = await api().put(`/api/v1/transport/chauffeurs/${chauffeurA.id}`).set(authHeader(B.token))
        .send({ nom: 'PIRATE' });
      expect(modifier.status).toBe(404);

      const verif = await api().get(`/api/v1/transport/chauffeurs/${chauffeurA.id}`).set(authHeader(A.token));
      expect(verif.body.data.nom).toBe('KONE');
    });

    it('nom et prénom sont obligatoires', async () => {
      const res = await api().post('/api/v1/transport/chauffeurs').set(authHeader(A.token)).send({ nom: 'SEUL' });
      expect(res.status).toBe(400);
    });
  });

  describe('Permissions', () => {
    it('un profil sans droits TRANSPORT reçoit 403 en lecture, création, modification et suppression', async () => {
      const h = authHeader(tokenSansPermission);
      expect((await api().get('/api/v1/transport/vehicules').set(h)).status).toBe(403);
      expect((await api().post('/api/v1/transport/vehicules').set(h).send({ immatriculation: 'ZZ' })).status).toBe(403);
      expect((await api().put(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(h).send({ marque: 'X' })).status).toBe(403);
      expect((await api().delete(`/api/v1/transport/vehicules/${vehiculeA.id}`).set(h)).status).toBe(403);
      expect((await api().post('/api/v1/transport/chauffeurs').set(h).send({ nom: 'A', prenom: 'B' })).status).toBe(403);
    });

    it('sans token, l\'accès est refusé (401)', async () => {
      const res = await api().get('/api/v1/transport/vehicules');
      expect(res.status).toBe(401);
    });
  });
});
