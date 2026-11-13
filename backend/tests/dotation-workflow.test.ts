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

  it('permet de modifier la dotation tant qu\'elle n\'est pas soumise', async () => {
    const liste = await api().get(`${FIN}/dotations`).set(authHeader(A.token));
    expect(liste.body.data.find((x: any) => x.id === dotationId).modifiable).toBe(true);
    // Le montant doit couvrir les dépenses déjà saisies en brouillon (50 000).
    expect((await api().put(`${FIN}/dotations/${dotationId}`).set(authHeader(A.token)).send({ montant: 40000, motif: 'x' })).status).toBe(400);
    const ok = await api().put(`${FIN}/dotations/${dotationId}`).set(authHeader(A.token)).send({ montant: 100000, motif: 'Frais de port modifié' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.motif).toBe('Frais de port modifié');
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

  it('ne permet plus de modifier ni d\'annuler la dotation une fois soumise', async () => {
    const liste = await api().get(`${FIN}/dotations`).set(authHeader(A.token));
    const d = liste.body.data.find((x: any) => x.id === dotationId);
    expect(d.soumise).toBe(true);
    expect(d.modifiable).toBe(false);
    const res = await api().put(`${FIN}/dotations/${dotationId}`).set(authHeader(A.token)).send({ montant: 120000 });
    expect(res.status).toBe(400);
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


describe('Validation d\'une dotation : dépenses cochées, compte débité, reliquat retourné', () => {
  let A: ContexteSociete;
  let utilisateurId: string;
  let dossierId: string;
  let dotationId: string;
  let caisseX: string;
  let caisseY: string;
  const FINB = '/api/v1/finance';
  const ids: string[] = [];

  beforeAll(async () => {
    A = await creerContexteSociete('Société validation dotation');
    utilisateurId = (await prisma.utilisateur.findFirstOrThrow({ where: { societeId: A.societeId } })).id;
    const client = await creerClient(A, 'Client validation');
    dossierId = (await creerDossier(A, client.id, 'V-01/2026')).id;
    caisseX = (await prisma.caisse.create({ data: { societeId: A.societeId, code: 'CX', libelle: 'Caisse X', solde: 500000 } })).id;
    caisseY = (await prisma.caisse.create({ data: { societeId: A.societeId, code: 'CY', libelle: 'Caisse Y', solde: 0 } })).id;
    const dot = await api().post(`${FINB}/dotations`).set(authHeader(A.token)).send({ montant: 100000, motif: 'Mission', agentId: utilisateurId });
    dotationId = dot.body.data.id;
    // Deux dépenses saisies par l'agent puis soumises, une saisie directement par le comptable.
    for (const [montant, designation] of [[20000, 'Péage'], [30000, 'Transport']] as const) {
      const r = await api().post(`${FINB}/justificatifs`).set(authHeader(A.token)).send({ dotationId, dossierId, montant, designation, categorie: 'DIVERS' });
      expect(r.status).toBe(201);
    }
    expect((await api().post(`${FINB}/justificatifs/soumettre`).set(authHeader(A.token)).send({ dotationId })).status).toBe(200);
    const c = await api().post(`${FINB}/justificatifs/comptable`).set(authHeader(A.token)).send({ dotationId, dossierId, montant: 10000, designation: 'Frais divers', categorie: 'DIVERS' });
    expect(c.status).toBe(201);
    expect(c.body.data.statut).toBe('EN_ATTENTE');
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it('affiche la dotation dans la file avec ses dépenses en attente', async () => {
    const file = await api().get(`${FINB}/justificatifs/file`).set(authHeader(A.token));
    expect(file.status).toBe(200);
    const ligne = file.body.data.find((d: any) => d.id === dotationId);
    expect(ligne.nbEnAttente).toBe(3);
    expect(ligne.montantEnAttente).toBe(60000);
    const detail = await api().get(`${FINB}/justificatifs/dotation/${dotationId}`).set(authHeader(A.token));
    expect(detail.status).toBe(200);
    expect(detail.body.data.dotation.montant).toBe(100000);
    expect(detail.body.data.justificatifs).toHaveLength(3);
    for (const j of detail.body.data.justificatifs) ids.push(j.id);
  });

  const valider = (corps: object) => api().post(`${FINB}/justificatifs/valider-dotation`).set(authHeader(A.token)).send({ dotationId, modePaiement: 'ESPECES', ...corps });

  it('exige le compte de retour quand il reste un reliquat', async () => {
    const res = await valider({ justificatifIds: ids.slice(0, 2), caisseId: caisseX });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/reliquat|retourn/i);
  });

  it('refuse une dépense inconnue', async () => {
    const res = await valider({ justificatifIds: ['00000000-0000-0000-0000-000000000000'], caisseId: caisseX, retour: { caisseId: caisseY } });
    expect(res.status).toBe(400);
  });

  it('valide les dépenses cochées, rejette les autres, débite le compte et retourne le reliquat', async () => {
    const detail = await api().get(`${FINB}/justificatifs/dotation/${dotationId}`).set(authHeader(A.token));
    const par = (d: string) => detail.body.data.justificatifs.find((j: any) => j.designation === d).id;
    const res = await valider({ justificatifIds: [par('Péage'), par('Transport')], caisseId: caisseX, retour: { caisseId: caisseY, beneficiaire: '  KONE Ali  ' } });
    expect(res.status).toBe(200);
    expect(res.body.data.retenues).toBe(2);
    expect(res.body.data.rejetees).toBe(1);
    expect(res.body.data.reliquat).toBe(50000);
    // Caisse X débitée de toute la dotation (50 000 de dépenses + 50 000 remis), Y créditée du reliquat.
    expect(Number((await prisma.caisse.findUniqueOrThrow({ where: { id: caisseX } })).solde)).toBe(400000);
    expect(Number((await prisma.caisse.findUniqueOrThrow({ where: { id: caisseY } })).solde)).toBe(50000);
    const depenses = await prisma.depense.findMany({ where: { dotationId } });
    expect(depenses).toHaveLength(2);
    expect(depenses.every((d) => d.dossierId === dossierId)).toBe(true);
    const rejetee = await prisma.justificatifDotation.findFirstOrThrow({ where: { dotationId, designation: 'Frais divers' } });
    expect(rejetee.statut).toBe('REJETE');
    expect((await prisma.dotation.findUniqueOrThrow({ where: { id: dotationId } })).statut).toBe('SOLDEE');
  });

  it('refuse une seconde validation et toute nouvelle dépense sur la dotation soldée', async () => {
    expect((await valider({ justificatifIds: [], caisseId: caisseX, retour: { caisseId: caisseY } })).status).toBe(400);
    const ajout = await api().post(`${FINB}/justificatifs/comptable`).set(authHeader(A.token)).send({ dotationId, dossierId, montant: 1000, designation: 'Trop tard', categorie: 'DIVERS' });
    expect(ajout.status).toBe(400);
    const modif = await api().patch(`${FINB}/dotations/${dotationId}/annuler`).set(authHeader(A.token));
    expect(modif.status).toBe(400);
  });

  it('range la dotation dans la vue « soldées »', async () => {
    const file = await api().get(`${FINB}/justificatifs/file?vue=SOLDEES`).set(authHeader(A.token));
    expect(file.body.data.some((d: any) => d.id === dotationId)).toBe(true);
    const aValider = await api().get(`${FINB}/justificatifs/file`).set(authHeader(A.token));
    expect(aValider.body.data.some((d: any) => d.id === dotationId)).toBe(false);
  });

  it('expose le reversement du reste : compte crédité, montant, date et bénéficiaire (nom nettoyé)', async () => {
    const res = await api().get(`${FINB}/dotations/${dotationId}`).set(authHeader(A.token));
    expect(res.status).toBe(200);
    const rev = res.body.data.reversement;
    expect(rev.montant).toBe(50000);
    expect(rev.beneficiaire).toBe('KONE Ali');
    expect(rev.compte).toEqual({ type: 'CAISSE', code: 'CY', libelle: 'Caisse Y' });
    expect(rev.date).toBeTruthy();
    // Aussi présent dans la liste des dotations.
    const liste = await api().get(`${FINB}/dotations?numero=${res.body.data.numero}`).set(authHeader(A.token));
    expect(liste.body.data[0].reversement.compte.libelle).toBe('Caisse Y');
  });

  it('permet de corriger « à qui » le reste a été versé, sans toucher aux soldes', async () => {
    const avant = Number((await prisma.caisse.findUniqueOrThrow({ where: { id: caisseY } })).solde);
    const res = await api().patch(`${FINB}/dotations/${dotationId}/reversement`).set(authHeader(A.token)).send({ beneficiaire: 'TRAORE Awa' });
    expect(res.status).toBe(200);
    expect(res.body.data.beneficiaire).toBe('TRAORE Awa');
    expect(Number((await prisma.caisse.findUniqueOrThrow({ where: { id: caisseY } })).solde)).toBe(avant);
    const relu = await api().get(`${FINB}/dotations/${dotationId}`).set(authHeader(A.token));
    expect(relu.body.data.reversement.beneficiaire).toBe('TRAORE Awa');
  });

  it('refuse un bénéficiaire vide ou trop long', async () => {
    for (const beneficiaire of ['', '   ', 'x'.repeat(201)]) {
      const res = await api().patch(`${FINB}/dotations/${dotationId}/reversement`).set(authHeader(A.token)).send({ beneficiaire });
      expect(res.status).toBe(400);
    }
  });

  it('refuse le bénéficiaire sur une dotation sans reversement', async () => {
    const dot = await api().post(`${FINB}/dotations`).set(authHeader(A.token)).send({ montant: 10000, motif: 'Sans reversement', agentId: utilisateurId });
    const res = await api().patch(`${FINB}/dotations/${dot.body.data.id}/reversement`).set(authHeader(A.token)).send({ beneficiaire: 'Personne' });
    expect(res.status).toBe(404);
    const lue = await api().get(`${FINB}/dotations/${dot.body.data.id}`).set(authHeader(A.token));
    expect(lue.body.data.reversement).toBeNull();
  });

  it('isole les sociétés : une autre société ne voit ni ne modifie le reversement', async () => {
    const B = await creerContexteSociete('Société autre reversement');
    expect((await api().get(`${FINB}/dotations/${dotationId}`).set(authHeader(B.token))).status).toBe(404);
    const res = await api().patch(`${FINB}/dotations/${dotationId}/reversement`).set(authHeader(B.token)).send({ beneficiaire: 'Intrus' });
    expect(res.status).toBe(404);
    const relu = await api().get(`${FINB}/dotations/${dotationId}`).set(authHeader(A.token));
    expect(relu.body.data.reversement.beneficiaire).toBe('TRAORE Awa');
  });

  it('prend la personne qui valide comme bénéficiaire quand aucun nom n\'est fourni', async () => {
    const dot = await api().post(`${FINB}/dotations`).set(authHeader(A.token)).send({ montant: 40000, motif: 'Défaut', agentId: utilisateurId });
    const id = dot.body.data.id;
    const j = await api().post(`${FINB}/justificatifs`).set(authHeader(A.token)).send({ dotationId: id, dossierId, montant: 10000, designation: 'Taxi', categorie: 'DIVERS' });
    expect(j.status).toBe(201);
    expect((await api().post(`${FINB}/justificatifs/soumettre`).set(authHeader(A.token)).send({ dotationId: id })).status).toBe(200);
    const res = await api().post(`${FINB}/justificatifs/valider-dotation`).set(authHeader(A.token))
      .send({ dotationId: id, modePaiement: 'ESPECES', justificatifIds: [j.body.data.id], caisseId: caisseX, retour: { caisseId: caisseY } });
    expect(res.status).toBe(200);
    const moi = await prisma.utilisateur.findUniqueOrThrow({ where: { email: A.email } });
    const lue = await api().get(`${FINB}/dotations/${id}`).set(authHeader(A.token));
    expect(lue.body.data.reversement.montant).toBe(30000);
    expect(lue.body.data.reversement.beneficiaire).toBe(`${moi.prenom} ${moi.nom}`.trim());
  });
});
