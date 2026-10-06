/**
 * Integration FedaPay (agregateur beninois actif en Cote d'Ivoire, Mobile Money/carte).
 *
 * IMPORTANT — A VERIFIER avant mise en production : les noms de champs ci-dessous suivent
 * la documentation publique FedaPay (API v1) au moment de l'ecriture, mais n'ont PAS ete
 * testes contre un compte FedaPay reel. Revalider les champs exacts (cle secrete,
 * structure de /v1/transactions et /v1/transactions/{id}/token, format de la reponse de
 * statut) sur https://docs.fedapay.com avant d'activer ce fournisseur en production.
 *
 * Comme CinetPay, FedaPay fonctionne par redirection vers une page de paiement hebergee :
 * initierDepot renvoie une urlPaiement vers laquelle rediriger l'utilisateur.
 */
import type { ChampDef, DepotParams, ResultatDepot, ResultatStatut, CorrespondantDef } from './types';

export const CHAMPS: ChampDef[] = [
  { cle: 'apiKey', label: 'Clé secrète API', obligatoire: true, secret: true },
  { cle: 'environnement', label: 'Environnement (sandbox ou live)', obligatoire: false, secret: false, placeholder: 'sandbox' },
];

export const CORRESPONDANTS: CorrespondantDef[] = [
  { code: 'mtn_ci', label: 'MTN Mobile Money' },
  { code: 'moov_ci', label: 'Moov Money' },
];

function baseUrl(champs: Record<string, string>) {
  return (champs.environnement || 'sandbox') === 'live' ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com';
}

export async function initierDepot(champs: Record<string, string>, params: DepotParams): Promise<ResultatDepot> {
  if (!champs.apiKey) throw new Error('FedaPay non configuré : clé API manquante');
  const url = baseUrl(champs);
  const headers = { Authorization: `Bearer ${champs.apiKey}`, 'Content-Type': 'application/json' };

  const resTx = await fetch(`${url}/v1/transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      description: params.description,
      amount: Math.round(params.montant),
      currency: { iso: params.devise },
      customer: { phone_number: { number: params.telephone, country: 'ci' } },
    }),
  });
  const tx: any = await resTx.json().catch(() => null);
  if (!resTx.ok) throw new Error(`FedaPay (création transaction) a échoué : ${JSON.stringify(tx)}`);
  const transactionId = tx?.['v1/transaction']?.id || tx?.id;

  const resToken = await fetch(`${url}/v1/transactions/${transactionId}/token`, { method: 'POST', headers });
  const token: any = await resToken.json().catch(() => null);
  if (!resToken.ok) throw new Error(`FedaPay (génération du lien) a échoué : ${JSON.stringify(token)}`);

  return { referenceExterne: String(transactionId), payloadBrut: { tx, token, urlPaiement: token?.url } };
}

export async function statutDepot(champs: Record<string, string>, referenceExterne: string): Promise<ResultatStatut> {
  const url = baseUrl(champs);
  const res = await fetch(`${url}/v1/transactions/${referenceExterne}`, {
    headers: { Authorization: `Bearer ${champs.apiKey}` },
  });
  const data: any = await res.json().catch(() => null);
  const statutDistant = data?.['v1/transaction']?.status || data?.status;
  const statut = statutDistant === 'approved' ? 'REUSSI' : statutDistant === 'declined' || statutDistant === 'canceled' ? 'ECHEC' : 'EN_ATTENTE';
  return { statut, payloadBrut: data };
}
