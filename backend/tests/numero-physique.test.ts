import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerContexteSociete, ContexteSociete } from './helpers/monde';
import { creerClient, creerDossier } from './helpers/fixtures';

/**
 * Le numéro de dossier affiché partout dans l'application est le numéro PHYSIQUE (référence papier).
 * Ces tests vérifient que l'API le renvoie là où l'interface en a besoin.
 */
describe('Numéro physique du dossier : renvoyé partout où l\'interface affiche un dossier', () => {
  let A: ContexteSociete;
  let clientId: string;
  let dossier: { id: string; numero: string };
  const PHYSIQUE = 'I-77/2026';

  beforeAll(async () => {
    A = await creerContexteSociete('Société numéro physique');
    clientId = (await creerClient(A, 'Client numéro physique')).id;
    dossier = await creerDossier(A, clientId, PHYSIQUE);
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it('le numéro système et le numéro physique sont distincts', () => {
    expect(dossier.numero).toMatch(/^DOS\//);
    expect(dossier.numero).not.toBe(PHYSIQUE);
  });

  it('le bilan des dossiers (État facturation dossier) renvoie le numéro physique', async () => {
    const res = await api().get('/api/v1/dossiers/bilan').set(authHeader(A.token));
    expect(res.status).toBe(200);
    const ligne = res.body.data.find((r: any) => r.id === dossier.id);
    expect(ligne.numeroPhysique).toBe(PHYSIQUE);
    expect(ligne.numero).toBe(dossier.numero);
  });

  it('le détail d\'une offre renvoie le numéro physique de son dossier', async () => {
    const creation = await api().post('/api/v1/offres').set(authHeader(A.token)).send({ clientId, dossierId: dossier.id, objet: 'Offre de test', lignes: [] });
    expect(creation.status).toBe(201);
    const res = await api().get(`/api/v1/offres/${creation.body.data.id}`).set(authHeader(A.token));
    expect(res.status).toBe(200);
    expect(res.body.data.dossier.numeroPhysique).toBe(PHYSIQUE);
  });

  it('le message « dossier fermé » cite le numéro physique', async () => {
    const statut = await api().patch(`/api/v1/dossiers/${dossier.id}/statut`).set(authHeader(A.token)).send({ statut: 'ANNULE' });
    expect(statut.status).toBe(200);
    const facture = await api().post('/api/v1/factures').set(authHeader(A.token)).send({
      clientId, dossierId: dossier.id, lignes: [{ designation: 'Prestation', quantite: 1, prixUnitaire: 1000, tauxTVA: 18 }],
    });
    expect(facture.status).toBe(400);
    expect(facture.body.message).toContain(PHYSIQUE);
    expect(facture.body.message).not.toContain(dossier.numero);
  });
});
