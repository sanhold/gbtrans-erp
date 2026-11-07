import prisma from '../src/config/database';
import { api, authHeader, connecter } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';
import { creerProfilSansPermission, creerUtilisateurAvecProfil } from './helpers/seed';

const BASE = '/api/v1/comptabilite';

async function creerCompte(ctx: ContexteSociete, numero: string, libelle: string, nature = 'ACTIF') {
  const res = await api().post(`${BASE}/comptes`).set(authHeader(ctx.token))
    .send({ numero, libelle, classe: parseInt(numero[0], 10), type: 'BILAN', nature });
  if (res.status !== 201) throw new Error(`compte ${numero}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data as { id: string; numero: string };
}

describe('Comptabilité — règles de saisie, validation, clôture et isolation', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;
  let compte521: { id: string };
  let compte706: { id: string };
  let exercice: { id: string };
  let journal: { id: string };
  let tokenSansPermission: string;

  const ecriture = (overrides: Record<string, unknown> = {}) => ({
    exerciceId: exercice.id,
    journalId: journal.id,
    dateEcriture: '2026-03-15',
    libelle: 'Vente comptant',
    mouvements: [
      { compteId: compte521.id, debit: 118000, credit: 0 },
      { compteId: compte706.id, debit: 0, credit: 118000 },
    ],
    ...overrides,
  });

  beforeAll(async () => {
    ({ A, B } = await creerSocietesAB());
    compte521 = await creerCompte(A, '521000', 'Banque');
    compte706 = await creerCompte(A, '706000', 'Prestations de services', 'PRODUIT');

    const ex = await api().post(`${BASE}/exercices`).set(authHeader(A.token))
      .send({ code: '2026', libelle: 'Exercice 2026', dateDebut: '2026-01-01', dateFin: '2026-12-31' });
    expect(ex.status).toBe(201);
    exercice = ex.body.data;

    const j = await api().post(`${BASE}/journaux`).set(authHeader(A.token))
      .send({ code: 'bq', libelle: 'Banque', type: 'BANQUE' });
    expect(j.status).toBe(201);
    expect(j.body.data.code).toBe('BQ'); // le code est normalisé en majuscules
    journal = j.body.data;

    const profil = await creerProfilSansPermission(A.societeId, 'Sans compta');
    const { email } = await creerUtilisateurAvecProfil(A.societeId, profil.id, 'SansCompta');
    tokenSansPermission = await connecter(email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Plan comptable et exercices', () => {
    it('refuse un compte sans champs obligatoires', async () => {
      const res = await api().post(`${BASE}/comptes`).set(authHeader(A.token)).send({ numero: '999' });
      expect(res.status).toBe(400);
    });

    it('refuse un numéro de compte en doublon dans la même société', async () => {
      const res = await api().post(`${BASE}/comptes`).set(authHeader(A.token))
        .send({ numero: '521000', libelle: 'Doublon', classe: 5, type: 'BILAN', nature: 'ACTIF' });
      expect(res.status).toBe(400);
    });

    it('autorise le même numéro de compte dans une autre société', async () => {
      const c = await creerCompte(B, '521000', 'Banque B');
      expect(c.numero).toBe('521000');
    });

    it('refuse un exercice dont la date de fin précède le début', async () => {
      const res = await api().post(`${BASE}/exercices`).set(authHeader(A.token))
        .send({ code: 'X', libelle: 'X', dateDebut: '2027-06-01', dateFin: '2027-01-01' });
      expect(res.status).toBe(400);
    });

    it('refuse un exercice qui chevauche un exercice existant', async () => {
      const res = await api().post(`${BASE}/exercices`).set(authHeader(A.token))
        .send({ code: '2026B', libelle: 'Chevauchement', dateDebut: '2026-06-01', dateFin: '2027-05-31' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/chevauche/i);
    });

    it('verrouille puis déverrouille un compte ; un compte verrouillé ne peut pas être supprimé', async () => {
      const c = await creerCompte(A, '471000', 'Compte d\'attente', 'ACTIF');
      expect((await api().patch(`${BASE}/comptes/${c.id}/verrouiller`).set(authHeader(A.token))).status).toBe(200);
      expect((await api().delete(`${BASE}/comptes/${c.id}`).set(authHeader(A.token))).status).toBe(400);
      expect((await api().patch(`${BASE}/comptes/${c.id}/deverrouiller`).set(authHeader(A.token))).status).toBe(200);
      expect((await api().delete(`${BASE}/comptes/${c.id}`).set(authHeader(A.token))).status).toBe(200);
    });
  });

  describe('Saisie des écritures', () => {
    it('refuse une écriture déséquilibrée', async () => {
      const res = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({
        mouvements: [
          { compteId: compte521.id, debit: 1000, credit: 0 },
          { compteId: compte706.id, debit: 0, credit: 900 },
        ],
      }));
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/équilibrée/i);
    });

    it('refuse une écriture de moins de 2 lignes', async () => {
      const res = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({
        mouvements: [{ compteId: compte521.id, debit: 1000, credit: 0 }],
      }));
      expect(res.status).toBe(400);
    });

    it('refuse une écriture dont tous les montants sont nuls', async () => {
      const res = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({
        mouvements: [
          { compteId: compte521.id, debit: 0, credit: 0 },
          { compteId: compte706.id, debit: 0, credit: 0 },
        ],
      }));
      expect(res.status).toBe(400);
    });

    it('refuse une date hors de l\'exercice', async () => {
      const res = await api().post(`${BASE}/ecritures`).set(authHeader(A.token))
        .send(ecriture({ dateEcriture: '2027-02-01' }));
      expect(res.status).toBe(400);
    });

    it('refuse un compte inexistant', async () => {
      const res = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({
        mouvements: [
          { compteId: 'inexistant', debit: 100, credit: 0 },
          { compteId: compte706.id, debit: 0, credit: 100 },
        ],
      }));
      expect(res.status).toBe(400);
    });

    it('crée une écriture équilibrée et lui attribue un numéro', async () => {
      const res = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture());
      expect(res.status).toBe(201);
      expect(res.body.data.numero).toBeTruthy();
      expect(res.body.data.validee).toBe(false);
      expect(res.body.data.mouvements).toHaveLength(2);
    });
  });

  describe('Validation, modification, suppression, clôture', () => {
    it('une écriture validée ne peut plus être modifiée ni supprimée', async () => {
      const cree = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({ libelle: 'À valider' }));
      const id = cree.body.data.id;

      expect((await api().patch(`${BASE}/ecritures/${id}/valider`).set(authHeader(A.token))).status).toBe(200);
      expect((await api().patch(`${BASE}/ecritures/${id}/valider`).set(authHeader(A.token))).status).toBe(400);
      expect((await api().put(`${BASE}/ecritures/${id}`).set(authHeader(A.token)).send({ libelle: 'Modifiée' })).status).toBe(400);
      expect((await api().delete(`${BASE}/ecritures/${id}`).set(authHeader(A.token))).status).toBe(400);
    });

    it('une écriture non validée peut être modifiée puis supprimée', async () => {
      const cree = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({ libelle: 'Brouillon' }));
      const id = cree.body.data.id;

      const maj = await api().put(`${BASE}/ecritures/${id}`).set(authHeader(A.token)).send({ libelle: 'Brouillon corrigé' });
      expect(maj.status).toBe(200);
      expect(maj.body.data.libelle).toBe('Brouillon corrigé');

      expect((await api().delete(`${BASE}/ecritures/${id}`).set(authHeader(A.token))).status).toBe(200);
    });

    it('la modification refuse de déséquilibrer une écriture', async () => {
      const cree = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({ libelle: 'À déséquilibrer' }));
      const res = await api().put(`${BASE}/ecritures/${cree.body.data.id}`).set(authHeader(A.token)).send({
        mouvements: [
          { compteId: compte521.id, debit: 500, credit: 0 },
          { compteId: compte706.id, debit: 0, credit: 400 },
        ],
      });
      expect(res.status).toBe(400);
    });

    it('un compte avec mouvements ne peut pas être supprimé', async () => {
      const res = await api().delete(`${BASE}/comptes/${compte521.id}`).set(authHeader(A.token));
      expect(res.status).toBe(400);
    });

    it('clôture : refusée s\'il reste des écritures non validées, puis écritures bloquées une fois clôturé', async () => {
      // Exercice dédié pour ne pas perturber les autres tests
      const ex = await api().post(`${BASE}/exercices`).set(authHeader(A.token))
        .send({ code: '2030', libelle: 'Exercice 2030', dateDebut: '2030-01-01', dateFin: '2030-12-31' });
      expect(ex.status).toBe(201);
      const exId = ex.body.data.id;

      const e = await api().post(`${BASE}/ecritures`).set(authHeader(A.token))
        .send(ecriture({ exerciceId: exId, dateEcriture: '2030-05-05', libelle: 'Écriture 2030' }));
      expect(e.status).toBe(201);

      const refus = await api().patch(`${BASE}/exercices/${exId}/cloturer`).set(authHeader(A.token));
      expect(refus.status).toBe(400);
      expect(refus.body.message).toMatch(/non validée/i);

      await api().patch(`${BASE}/ecritures/${e.body.data.id}/valider`).set(authHeader(A.token));
      expect((await api().patch(`${BASE}/exercices/${exId}/cloturer`).set(authHeader(A.token))).status).toBe(200);
      expect((await api().patch(`${BASE}/exercices/${exId}/cloturer`).set(authHeader(A.token))).status).toBe(400);

      const apres = await api().post(`${BASE}/ecritures`).set(authHeader(A.token))
        .send(ecriture({ exerciceId: exId, dateEcriture: '2030-06-06' }));
      expect(apres.status).toBe(400);
      expect(apres.body.message).toMatch(/clôturé/i);

      expect((await api().patch(`${BASE}/exercices/${exId}/rouvrir`).set(authHeader(A.token))).status).toBe(200);
    });
  });

  describe('Balance', () => {
    it('la balance de A est équilibrée (total débit = total crédit)', async () => {
      const res = await api().get(`${BASE}/balance`).set(authHeader(A.token));
      expect(res.status).toBe(200);
      const { totaux, lignes } = res.body.data;
      expect(lignes.length).toBeGreaterThanOrEqual(2);
      expect(totaux.debit).toBeGreaterThan(0);
      expect(totaux.debit).toBeCloseTo(totaux.credit, 2);
      expect(totaux.soldeDebiteur).toBeCloseTo(totaux.soldeCrediteur, 2);
    });
  });

  describe('Isolation multi-société', () => {
    let ecritureAId: string;

    beforeAll(async () => {
      const r = await api().post(`${BASE}/ecritures`).set(authHeader(A.token)).send(ecriture({ libelle: 'Confidentielle A' }));
      ecritureAId = r.body.data.id;
    });

    it('B ne voit aucune écriture, aucun compte de A', async () => {
      const ecritures = await api().get(`${BASE}/ecritures`).set(authHeader(B.token));
      expect(ecritures.status).toBe(200);
      expect(ecritures.body.data.map((e: any) => e.id)).not.toContain(ecritureAId);

      const comptes = await api().get(`${BASE}/comptes`).set(authHeader(B.token));
      const idsB = JSON.stringify(comptes.body.data);
      expect(idsB).not.toContain(compte706.id);
    });

    it('B ne peut ni valider, ni modifier, ni supprimer l\'écriture de A', async () => {
      expect((await api().patch(`${BASE}/ecritures/${ecritureAId}/valider`).set(authHeader(B.token))).status).toBe(404);
      expect((await api().put(`${BASE}/ecritures/${ecritureAId}`).set(authHeader(B.token)).send({ libelle: 'PIRATE' })).status).toBe(404);
      expect((await api().delete(`${BASE}/ecritures/${ecritureAId}`).set(authHeader(B.token))).status).toBe(404);
    });

    it('B ne peut pas poster une écriture sur le journal, l\'exercice ou les comptes de A', async () => {
      const res = await api().post(`${BASE}/ecritures`).set(authHeader(B.token)).send(ecriture());
      expect(res.status).toBe(404);
    });

    it('B ne peut pas clôturer l\'exercice de A', async () => {
      const res = await api().patch(`${BASE}/exercices/${exercice.id}/cloturer`).set(authHeader(B.token));
      expect(res.status).toBe(404);
    });

    it('la balance de B ne contient aucun mouvement de A', async () => {
      const res = await api().get(`${BASE}/balance`).set(authHeader(B.token));
      expect(res.status).toBe(200);
      expect(res.body.data.totaux.debit).toBe(0);
    });
  });

  describe('Permissions', () => {
    it('un profil sans droits COMPTABILITE reçoit 403', async () => {
      const h = authHeader(tokenSansPermission);
      expect((await api().get(`${BASE}/comptes`).set(h)).status).toBe(403);
      expect((await api().post(`${BASE}/ecritures`).set(h).send(ecriture())).status).toBe(403);
      expect((await api().patch(`${BASE}/exercices/${exercice.id}/cloturer`).set(h)).status).toBe(403);
      expect((await api().get(`${BASE}/balance`).set(h)).status).toBe(403);
    });
  });
});
