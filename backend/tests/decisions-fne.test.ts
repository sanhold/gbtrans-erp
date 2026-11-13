import prisma from '../src/config/database';
import { api, authHeader, connecter } from './helpers/http';
import { creerSocietesAB, ContexteSociete } from './helpers/monde';
import { creerClient, creerFacture, validerFacture } from './helpers/fixtures';
import { creerProfilSansPermission, creerUtilisateurAvecProfil } from './helpers/seed';

const BASE = '/api/v1/comptabilite/decisions';

describe('File de décision (facture normalisée / comptabilité réelle / corbeille)', () => {
  let A: ContexteSociete;
  let B: ContexteSociete;
  let factureValidee: { id: string; numero: string };
  let factureBrouillon: { id: string };
  let depenseId: string;
  let paiementId: string;
  let tokenSansPermission: string;

  const liste = async (ctx: ContexteSociete, vue: string, extra = '') => {
    const r = await api().get(`${BASE}?vue=${vue}${extra}`).set(authHeader(ctx.token));
    expect(r.status).toBe(200);
    return r.body.data as { items: any[]; total: number; compteurs: any };
  };
  const decider = (ctx: ContexteSociete, body: unknown) => api().post(`${BASE}/decider`).set(authHeader(ctx.token)).send(body as object);

  beforeAll(async () => {
    ({ A, B } = await creerSocietesAB());
    const client = await creerClient(A, 'Client FNE');
    factureBrouillon = await creerFacture(A, client.id, 50000);
    const f = await creerFacture(A, client.id, 100000);
    await validerFacture(A, f.id);
    factureValidee = f;
    const dep = await prisma.depense.create({
      data: { societeId: A.societeId, numero: `DEP-${Date.now()}`, categorie: 'CARBURANT', designation: 'Carburant', montant: 25000, modePaiement: 'ESPECES', statut: 'VALIDE' },
    });
    depenseId = dep.id;
    const pai = await prisma.paiement.create({
      data: { numero: `PAI-${Date.now()}`, clientId: client.id, montant: 30000, modePaiement: 'ESPECES', statut: 'VALIDE' },
    });
    paiementId = pai.id;

    const profil = await creerProfilSansPermission(A.societeId);
    const { email } = await creerUtilisateurAvecProfil(A.societeId, profil.id, 'SansDecision');
    tokenSansPermission = await connecter(email);
  });

  it('liste dans « à décider » les transactions valides, sans les brouillons ni celles des autres sociétés', async () => {
    const a = await liste(A, 'a-decider');
    const cles = a.items.map(i => i.cle);
    expect(cles).toContain(`FACTURE:${factureValidee.id}`);
    expect(cles).toContain(`DEPENSE:${depenseId}`);
    expect(cles).toContain(`PAIEMENT:${paiementId}`);
    expect(cles).not.toContain(`FACTURE:${factureBrouillon.id}`);
    expect(a.compteurs.aDecider).toBeGreaterThanOrEqual(3);
    const b = await liste(B, 'a-decider');
    expect(b.items).toHaveLength(0);
  });

  it('refuse la décision sans la permission COMPTABILITE:DECIDER', async () => {
    const r = await api().post(`${BASE}/decider`).set(authHeader(tokenSansPermission)).send({ items: [{ source: 'DEPENSE', id: depenseId }], decision: 'RECEVABLE' });
    expect(r.status).toBe(403);
  });

  it('refuse la facture normalisée pour autre chose qu\'une facture client', async () => {
    const r = await decider(A, { items: [{ source: 'DEPENSE', id: depenseId }], decision: 'FACTURE_NORMALISEE' });
    expect(r.status).toBe(400);
  });

  it('une société ne peut pas décider des transactions d\'une autre société', async () => {
    const r = await decider(B, { items: [{ source: 'FACTURE', id: factureValidee.id }], decision: 'RECEVABLE' });
    expect(r.status).toBe(200);
    expect(r.body.data.traitees).toBe(0);
    expect(r.body.data.ignorees).toHaveLength(1);
    expect(await prisma.decisionFne.count({ where: { factureId: factureValidee.id } })).toBe(0);
  });

  it('facture normalisée : numéro FNE enregistré, sortie de la file, pièce à comptabiliser créée automatiquement', async () => {
    const r = await decider(A, { items: [{ source: 'FACTURE', id: factureValidee.id }], decision: 'FACTURE_NORMALISEE', numeroFne: 'FNE-2026-0001' });
    expect(r.status).toBe(200);
    expect(r.body.data.traitees).toBe(1);

    expect((await liste(A, 'a-decider')).items.map(i => i.cle)).not.toContain(`FACTURE:${factureValidee.id}`);
    const traitees = await liste(A, 'traitees');
    const ligne = traitees.items.find(i => i.numero === factureValidee.numero);
    expect(ligne.decision.statut).toBe('FACTURE_NORMALISEE');
    expect(ligne.decision.numeroFne).toBe('FNE-2026-0001');

    const attente = await api().get('/api/v1/comptabilite/ecritures-attente').set(authHeader(A.token));
    expect(attente.body.data.some((e: any) => e.factureId === factureValidee.id && e.statut === 'EN_ATTENTE')).toBe(true);

    // une transaction déjà décidée ne peut pas l'être deux fois
    const encore = await decider(A, { items: [{ source: 'FACTURE', id: factureValidee.id }], decision: 'CORBEILLE' });
    expect(encore.body.data.traitees).toBe(0);
  });

  it('corrige le numéro FNE d\'une facture normalisée', async () => {
    const d = await prisma.decisionFne.findFirstOrThrow({ where: { factureId: factureValidee.id } });
    const r = await api().patch(`${BASE}/${d.id}/fne`).set(authHeader(A.token)).send({ numeroFne: 'FNE-2026-0002' });
    expect(r.status).toBe(200);
    expect((await prisma.decisionFne.findUniqueOrThrow({ where: { id: d.id } })).numeroFne).toBe('FNE-2026-0002');
  });

  it('comptabilité réelle : paiement recevable => pièce à comptabiliser, sans numéro FNE', async () => {
    const r = await decider(A, { items: [{ source: 'PAIEMENT', id: paiementId }], decision: 'RECEVABLE' });
    expect(r.body.data.traitees).toBe(1);
    const d = await prisma.decisionFne.findFirstOrThrow({ where: { paiementId } });
    expect(d.statut).toBe('RECEVABLE');
    expect(d.numeroFne).toBeNull();
    expect(await prisma.ecritureEnAttente.count({ where: { paiementId, statut: 'EN_ATTENTE' } })).toBe(1);
  });

  it('corbeille : la transaction quitte la file sans créer de pièce, puis peut être restaurée', async () => {
    const r = await decider(A, { items: [{ source: 'DEPENSE', id: depenseId }], decision: 'CORBEILLE', motif: 'Doublon' });
    expect(r.body.data.traitees).toBe(1);
    expect(await prisma.ecritureEnAttente.count({ where: { depenseId } })).toBe(0);
    expect((await liste(A, 'a-decider')).items.map(i => i.cle)).not.toContain(`DEPENSE:${depenseId}`);

    const corbeille = await liste(A, 'corbeille');
    const ligne = corbeille.items.find(i => i.numero.startsWith('DEP-'));
    expect(ligne.decision.motif).toBe('Doublon');

    const rest = await api().post(`${BASE}/restaurer`).set(authHeader(A.token)).send({ items: [{ kind: 'DECISION', id: ligne.id }] });
    expect(rest.body.data.restaures).toBe(1);
    expect((await liste(A, 'a-decider')).items.map(i => i.cle)).toContain(`DEPENSE:${depenseId}`);
  });

  it('une décision recevable ne peut pas être « restaurée » (seule la corbeille l\'est)', async () => {
    const d = await prisma.decisionFne.findFirstOrThrow({ where: { paiementId } });
    const rest = await api().post(`${BASE}/restaurer`).set(authHeader(A.token)).send({ items: [{ kind: 'DECISION', id: d.id }] });
    expect(rest.body.data.restaures).toBe(0);
    expect(await prisma.decisionFne.count({ where: { id: d.id } })).toBe(1);
  });

  it('les pièces rejetées apparaissent dans la corbeille et peuvent être restaurées', async () => {
    const pieces = await api().get('/api/v1/comptabilite/ecritures-attente').set(authHeader(A.token));
    const piece = pieces.body.data.find((e: any) => e.paiementId === paiementId);
    const rej = await api().post(`/api/v1/comptabilite/ecritures-attente/${piece.id}/rejeter`).set(authHeader(A.token)).send({ motif: 'Erreur de saisie' });
    expect(rej.status).toBe(200);

    const corbeille = await liste(A, 'corbeille');
    const ligne = corbeille.items.find(i => i.kind === 'REJET' && i.id === piece.id);
    expect(ligne.decision.motif).toBe('Erreur de saisie');

    const rest = await api().post(`${BASE}/restaurer`).set(authHeader(A.token)).send({ items: [{ kind: 'REJET', id: piece.id }] });
    expect(rest.body.data.restaures).toBe(1);
    expect((await prisma.ecritureEnAttente.findUniqueOrThrow({ where: { id: piece.id } })).statut).toBe('EN_ATTENTE');
  });
});
