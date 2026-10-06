/**
 * Integration PawaPay (collecte Mobile Money en Afrique : Orange, MTN, Moov, Wave...).
 *
 * Identifiants : configures depuis l'espace super-admin (Configuration > Fournisseurs de
 * paiement), stockes chiffres en base (cf. utils/secretCrypto.ts). A defaut, on retombe
 * sur les variables d'environnement PAWAPAY_API_TOKEN / PAWAPAY_BASE_URL pour compatibilite
 * avec les deploiements existants.
 *
 * IMPORTANT : les noms de champs ci-dessous suivent la forme documentee publiquement par
 * PawaPay (endpoint /deposits) au moment de l'ecriture. A reverifier sur le tableau de
 * bord / la documentation PawaPay du compte reel avant la mise en production, certains
 * champs (ex. liste des "correspondent" par pays) pouvant evoluer.
 */
import { randomUUID } from 'crypto';
import type { ChampDef, DepotParams, ResultatDepot, ResultatStatut } from './fournisseurs/types';

export const CHAMPS: ChampDef[] = [
  { cle: 'apiToken', label: 'Jeton API', obligatoire: true, secret: true },
  { cle: 'baseUrl', label: 'URL de base (sandbox ou production)', obligatoire: false, secret: false, placeholder: 'https://api.sandbox.pawapay.io' },
];

/** Operateurs mobile money geres en Cote d'Ivoire cote PawaPay. */
export const CORRESPONDANTS_CIV = [
  { code: 'ORANGE_CIV', label: 'Orange Money' },
  { code: 'MTN_MOMO_CIV', label: 'MTN Mobile Money' },
  { code: 'MOOV_CIV', label: 'Moov Money' },
  { code: 'WAVE_CIV', label: 'Wave' },
] as const;

async function pawapayFetch(champs: Record<string, string>, path: string, options: RequestInit = {}) {
  const token = champs.apiToken || process.env.PAWAPAY_API_TOKEN;
  const baseUrl = champs.baseUrl || process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io';
  if (!token) throw new Error('PawaPay non configure : jeton API manquant');
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`PawaPay ${path} a échoué (${res.status}) : ${JSON.stringify(data)}`);
  return data;
}

export async function initierDepot(champs: Record<string, string>, params: DepotParams): Promise<ResultatDepot> {
  const depositId = randomUUID();
  const reponse = await pawapayFetch(champs, '/deposits', {
    method: 'POST',
    body: JSON.stringify({
      depositId,
      amount: String(Math.round(params.montant)),
      currency: params.devise,
      correspondent: params.correspondant,
      payer: { type: 'MSISDN', address: { value: params.telephone } },
      customerTimestamp: new Date().toISOString(),
      statementDescription: params.description.slice(0, 22),
      country: 'CIV',
    }),
  });
  return { referenceExterne: depositId, payloadBrut: reponse };
}

export async function statutDepot(champs: Record<string, string>, referenceExterne: string): Promise<ResultatStatut> {
  const reponse: any = await pawapayFetch(champs, `/deposits/${referenceExterne}`);
  const statutDistant = Array.isArray(reponse) ? reponse[0]?.status : reponse?.status;
  const statut = statutDistant === 'COMPLETED' ? 'REUSSI' : statutDistant === 'FAILED' || statutDistant === 'REJECTED' ? 'ECHEC' : 'EN_ATTENTE';
  return { statut, payloadBrut: reponse };
}
