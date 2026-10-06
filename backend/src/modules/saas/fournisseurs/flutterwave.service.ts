/**
 * Integration Flutterwave (agregateur panafricain, Mobile Money/carte/virement).
 *
 * IMPORTANT — A VERIFIER avant mise en production : les noms de champs ci-dessous suivent
 * la documentation publique Flutterwave (API v3, charge "mobile_money_franco" pour
 * l'Afrique francophone) au moment de l'ecriture, mais n'ont PAS ete testes contre un
 * compte Flutterwave reel. Revalider les champs exacts sur https://developer.flutterwave.com
 * avant d'activer ce fournisseur en production.
 *
 * Comme PawaPay, cette charge mobile money francophone declenche un push direct vers le
 * telephone (pas de redirection vers une page hebergee).
 */
import { randomUUID } from 'crypto';
import type { ChampDef, DepotParams, ResultatDepot, ResultatStatut, CorrespondantDef } from './types';

export const CHAMPS: ChampDef[] = [
  { cle: 'secretKey', label: 'Clé secrète (Secret Key)', obligatoire: true, secret: true },
];

export const CORRESPONDANTS: CorrespondantDef[] = [
  { code: 'ORANGE', label: 'Orange Money' },
  { code: 'MTN', label: 'MTN Mobile Money' },
  { code: 'MOOV', label: 'Moov Money' },
];

const BASE_URL = 'https://api.flutterwave.com/v3';

export async function initierDepot(champs: Record<string, string>, params: DepotParams): Promise<ResultatDepot> {
  if (!champs.secretKey) throw new Error('Flutterwave non configuré : clé secrète manquante');
  const txRef = randomUUID();
  const res = await fetch(`${BASE_URL}/charges?type=mobile_money_franco`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${champs.secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: Math.round(params.montant),
      currency: params.devise,
      phone_number: params.telephone,
      network: params.correspondant,
      email: 'facturation@gbtrans.app',
      fullname: 'Abonnement GBTRANS',
    }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || data?.status !== 'success') throw new Error(`Flutterwave a échoué : ${JSON.stringify(data)}`);
  return { referenceExterne: String(data?.data?.id || txRef), payloadBrut: data };
}

export async function statutDepot(champs: Record<string, string>, referenceExterne: string): Promise<ResultatStatut> {
  const res = await fetch(`${BASE_URL}/transactions/${referenceExterne}/verify`, {
    headers: { Authorization: `Bearer ${champs.secretKey}` },
  });
  const data: any = await res.json().catch(() => null);
  const statutDistant = data?.data?.status;
  const statut = statutDistant === 'successful' ? 'REUSSI' : statutDistant === 'failed' ? 'ECHEC' : 'EN_ATTENTE';
  return { statut, payloadBrut: data };
}
