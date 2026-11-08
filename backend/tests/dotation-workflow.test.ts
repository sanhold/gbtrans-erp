import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerContexteSociete, ContexteSociete } from './helpers/monde';
import { creerClient, creerDossier } from './helpers/fixtures';

const FIN = '/api/v1/finance';

describe('Dotation : saisie par l\'agent, soumission, validation par la trésorerie, résultat du dossier', () => {
  let A: ContexteSociete;
  let utilisateurId: string;
  let dossierId: string;
  let dotationId: string;
  let caisseId: string;
  const ids: { brouillon1?: string; brouillon2?: string } = {};

  beforeAll(async () => {
    A = await creerContexteSociete('Société dotation');
    utilisateurId = (await prisma.utilisateur.findFirstOrThrow({ where: { societeId: A.societeId } })).id;
    const client = await creerClient(A, 'Client dotation');
    dossierId = (await creerDossier(A, client.id, 'D-01/2026')).id;
    const caisse = await prisma.caisse.create({ data: { societeId: A.societeId, code: 'CAI1', libelle: 'Caisse principale', solde: 500000 } });
    caisseId = caisse.id;
    const dot = await api().post(`${FIN}/dotations`).set(authHeader(A.token)).send({ montant: 100000, motif: 'Frais de port', agentId: utilisateurId });
    expect(dot.status).toBe(201);
    dotationId = dot.body.data.id;
  });

  afterAll(async () => { await prisma.$disconnect(); });

  const saisir = (corps: object) => api().post(`${FIN}/justificatifs`).set(authHeader(A.token)).send({ dotationId, designation: 'Manutention', categorie: 'DIVERS', ...corps });

  it('exige le dossier pour chaque dépense', async () => {
    const res = await saisir({ montant: 20000 });
    expect(res.status).toBe(400);
  });

  it('enregistre la dépense en brouillon', async () => {
    const r1 = await saisir({ montant: 20000, dossierId });
    expect(r1.status).toBe(201);
    expect(r1.body.data.statut).toBe('BROUILLON');
    ids.brouillon1 = r1.body.data.id;
    const r2 = await saisir({ montant: 30000, dossierId, designation: 'Transport' });
    expect(r2.status).toBe(201);
    ids.brouillon2 = r2.body.data.id;
  });

  it('refuse une dépense qui dépasse le reste de la dotation (brouillons compris)', async () => {
    const res = await saisir({ montant: 60000, dossierId });
    expect(res.status).toBe(400);
  });

  it('n\'affiche pas les brouillons dans la file de la trésorerie', async () => {
    const res = await api().get(`${FIN}/justificatifs`).set(authHeader(A.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    const tous = await api().get(`${FIN}/justificatifs?statut=TOUS`).set(authHeader(A.token));
    expect(tous.body.data).toHaveLength(0);
  });

  it('ne valide pas un brouillon non soumis', async () => {
    const res = await api().post(`${FIN}/justificatifs/${ids.brouillon1}/valider`).set(authHeader(A.token)).send({ caisseId, modePaiement: 'ESPECES' });
    expect(res.status).toBe(400);
  });

  it('montre au agent le brouillon et le reste disponible', async () => {
    const res = await api().get(`${FIN}/justificatifs/mes-dotations`).set(authHeader(A.token));
    const d = res.body.data.find((x: any) => x.id === dotationId);
    expect(d.nbBrouillon).toBe(2);
    expect(d.montantBrouillon).toBe(50000);
    expect(d.montantRestant).toBe(50000);
  });

  it('refuse la soumission sans dotation, et sans dépense en brouillon sur une autre dotation', async () => {
    expect((await api().post(`${FIN}/justificatifs/soumettre`).set(authHeader(A.token)).send({})).status).toBe(400);
  });

  it('soumet l\'état : les dépenses arrivent dans la file de la trésorerie', async () => {
    const res = await api().post(`${FIN}/justificatifs/soumettre`).set(authHeader(A.token)).send({ dotationId });
    expect(res.status).toBe(200);
    expect(res.body.data.soumises).toBe(2);
    const file = await api().get(`${FIN}/justificatifs`).set(authHeader(A.token));
    expect(file.body.data).toHaveLength(2);
    expect(file.body.data.every((j: any) => j.statut === 'EN_ATTENTE')).toBe(true);
    // Une seconde soumission n'a plus rien à envoyer.
    expect((await api().post(`${FIN}/justificatifs/soumettre`).set(authHeader(A.token)).send({ dotationId })).status).toBe(400);
  });

  it('ne permet plus de supprimer une dépense déjà soumise', async () => {
    const res = await api().delete(`${FIN}/justificatifs/${ids.brouillon1}`).set(authHeader(A.token));
    expect(res.status).toBe(400);
  });

  it('valide une dépense sur un compte de trésorerie : dépense imputée au dossier et caisse débitée', async () => {
    const res = await api().post(`${FIN}/justificatifs/${ids.brouillon1}/valider`).set(authHeader(A.token)).send({ caisseId, modePaiement: 'ESPECES' });
    expect(res.status).toBe(200);
    const depense = await prisma.depense.findFirstOrThrow({ where: { societeId: A.societeId, dossierId } });
    expect(Number(depense.montant)).toBe(20000);
    expect(depense.dotationId).toBe(dotationId);
    const caisse = await prisma.caisse.findUniqueOrThrow({ where: { id: caisseId } });
    expect(Number(caisse.solde)).toBe(480000);
  });

  it('le résultat du dossier = payé - dépensé (dépenses annulées exclues)', async () => {
    const dossier = await prisma.dossier.findUniqueOrThrow({ where: { id: dossierId } });
    await prisma.facture.create({
      data: {
        societeId: A.societeId, numero: `F-TEST-${Date.now()}`, clientId: dossier.clientId, dossierId, statut: 'PAYEE',
        montantHT: 100000, montantTVA: 0, montantTTC: 100000, montantPaye: 100000, resteAPayer: 0,
        dateEcheance: new Date(), createurId: utilisateurId,
      } as any,
    });
    // Une dépense annulée ne doit pas compter.
    await prisma.depense.create({
      data: {
        societeId: A.societeId, numero: `DEP-ANN-${Date.now()}`, dossierId, caisseId, categorie: 'DIVERS', designation: 'Annulée',
        montant: 5000, modePaiement: 'ESPECES', statut: 'ANNULEE',
      } as any,
    });
    const res = await api().get('/api/v1/dossiers/bilan').set(authHeader(A.token));
    expect(res.status).toBe(200);
    const ligne = res.body.data.find((d: any) => d.id === dossierId);
    expect(ligne.montantPaye).toBe(100000);
    expect(ligne.montantDepense).toBe(20000);
    expect(ligne.resultat).toBe(80000);
  });
});
