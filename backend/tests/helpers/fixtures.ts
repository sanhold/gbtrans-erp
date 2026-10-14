import { api, authHeader } from './http';
import { ContexteSociete } from './monde';

/** Crée un client via l'API (POST /clients) avec le token admin de la société donnée. */
export async function creerClient(ctx: ContexteSociete, raisonSociale = 'Client de test') {
  const res = await api()
    .post('/api/v1/clients')
    .set(authHeader(ctx.token))
    .send({ type: 'ENTREPRISE', raisonSociale });

  if (res.status !== 201) {
    throw new Error(`Échec création client: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id: string; raisonSociale: string; code: string };
}

/** Crée un dossier via l'API (POST /dossiers), nécessite un clientId de la même société. */
export async function creerDossier(ctx: ContexteSociete, clientId: string, numeroPhysique: string) {
  const res = await api()
    .post('/api/v1/dossiers')
    .set(authHeader(ctx.token))
    .send({
      numeroPhysique,
      clientId,
      nature: 'IMPORT',
      type: 'MARITIME',
      designation: 'Marchandise de test',
    });

  if (res.status !== 201) {
    throw new Error(`Échec création dossier: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id: string; numero: string; statut: string };
}

/** Crée une facture BROUILLON via l'API (POST /factures). */
export async function creerFacture(ctx: ContexteSociete, clientId: string, montant = 100000) {
  const res = await api()
    .post('/api/v1/factures')
    .set(authHeader(ctx.token))
    .send({
      clientId,
      objet: 'Facture de test',
      lignes: [
        { designation: 'Prestation de test', quantite: 1, prixUnitaire: montant, tauxTVA: 18 },
      ],
    });

  if (res.status !== 201) {
    throw new Error(`Échec création facture: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id: string; numero: string; statut: string; montantTTC: string; resteAPayer: string };
}

/** Valide une facture BROUILLON -> VALIDEE (nécessaire pour pouvoir y rattacher un paiement). */
export async function validerFacture(ctx: ContexteSociete, factureId: string) {
  const res = await api()
    .patch(`/api/v1/factures/${factureId}/valider`)
    .set(authHeader(ctx.token));

  if (res.status !== 200) {
    throw new Error(`Échec validation facture: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id: string; statut: string };
}

/** Crée une proforma via l'API (POST /proformas). */
export async function creerProforma(ctx: ContexteSociete, clientId: string, montant = 50000) {
  const res = await api()
    .post('/api/v1/proformas')
    .set(authHeader(ctx.token))
    .send({
      clientId,
      titre: 'Proforma de test',
      objet: 'Objet de test',
      lignes: [
        { designation: 'Prestation de test', montant, estTVA: false },
      ],
    });

  if (res.status !== 201) {
    throw new Error(`Échec création proforma: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id: string; numero: string; statut: string };
}
