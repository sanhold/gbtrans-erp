/**
 * Integration CinetPay (agregateur Mobile Money/carte tres utilise en Afrique de
 * l'Ouest francophone : Cote d'Ivoire, Senegal, Mali, Burkina Faso, Togo, Benin, Cameroun).
 *
 * IMPORTANT — A VERIFIER avant mise en production : les noms de champs ci-dessous suivent
 * la documentation publique CinetPay (API Checkout v2) au moment de l'ecriture, mais n'ont
 * PAS ete testes contre un compte CinetPay reel. Revalider les champs exacts (apikey,
 * site_id, format du payment_url, structure de la reponse /payment/check) sur
 * https://docs.cinetpay.com avant d'activer ce fournisseur en production.
 *
 * Contrairement a PawaPay, CinetPay fonctionne par redirection vers une page de paiement
 * hebergee (pas de push USSD direct declenche par l'API) : initierDepot renvoie une
 * urlPaiement vers laquelle l'utilisateur doit etre redirige pour choisir son operateur
 * et confirmer le paiement.
 */
import { randomUUID } from 'crypto';
import type { ChampDef, DepotParams, ResultatDepot, ResultatStatut, CorrespondantDef } from './types';

export const CHAMPS: ChampDef[] = [
  { cle: 'apiKey', label: 'Clé API (apikey)', obligatoire: true, secret: true },
  { cle: 'siteId', label: 'ID du site (site_id)', obligatoire: true, secret: true },
];

export const CORRESPONDANTS: CorrespondantDef[] = [
  { code: 'OM', label: 'Orange Money' },
  { code: 'MOMO', label: 'MTN Mobile Money' },
  { code: 'MOOV', label: 'Moov Money' },
  { code: 'WAVE', label: 'Wave' },
];

const BASE_URL = 'https://api-checkout.cinetpay.com/v2';

export async function initierDepot(champs: Record<string, string>, params: DepotParams): Promise<ResultatDepot> {
  if (!champs.apiKey || !champs.siteId) throw new Error('CinetPay non configuré : clé API ou site_id manquant');
  const transactionId = randomUUID();
  const res = await fetch(`${BASE_URL}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: champs.apiKey,
      site_id: champs.siteId,
      transaction_id: transactionId,
      amount: Math.round(params.montant),
      currency: params.devise,
      description: params.description,
      customer_phone_number: params.telephone,
      channels: 'MOBILE_MONEY',
    }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || data?.code !== '201') throw new Error(`CinetPay a échoué : ${JSON.stringify(data)}`);
  return { referenceExterne: transactionId, payloadBrut: { ...data, urlPaiement: data?.data?.payment_url } };
}

export async function statutDepot(champs: Record<string, string>, referenceExterne: string): Promise<ResultatStatut> {
  const res = await fetch(`${BASE_URL}/payment/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: champs.apiKey, site_id: champs.siteId, transaction_id: referenceExterne }),
  });
  const data: any = await res.json().catch(() => null);
  const code = data?.data?.status;
  const statut = code === 'ACCEPTED' ? 'REUSSI' : code === 'REFUSED' ? 'ECHEC' : 'EN_ATTENTE';
  return { statut, payloadBrut: data };
}
