/**
 * Integration PawaPay (collecte Mobile Money en Afrique : Orange, MTN, Moov, Wave...).
 *
 * Variables d'environnement requises (a renseigner sur Render une fois le compte
 * PawaPay actif) :
 *   PAWAPAY_API_TOKEN     jeton d'API (sandbox ou production, cf. tableau de bord PawaPay)
 *   PAWAPAY_BASE_URL      https://api.sandbox.pawapay.io (tests) ou https://api.pawapay.io (production)
 *
 * IMPORTANT : les noms de champs ci-dessous suivent la forme documentee publiquement par
 * PawaPay (endpoint /deposits) au moment de l'ecriture. A reverifier sur le tableau de
 * bord / la documentation PawaPay du compte reel avant la mise en production, certains
 * champs (ex. liste des "correspondent" par pays) pouvant evoluer.
 */
import { randomUUID } from 'crypto';

const BASE_URL = process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io';
const API_TOKEN = process.env.PAWAPAY_API_TOKEN;

export const PAWAPAY_CONFIGURE = !!API_TOKEN;

/** Operateurs mobile money geres en Cote d'Ivoire cote PawaPay. */
export const CORRESPONDANTS_CIV = [
  { code: 'ORANGE_CIV', label: 'Orange Money' },
  { code: 'MTN_MOMO_CIV', label: 'MTN Mobile Money' },
  { code: 'MOOV_CIV', label: 'Moov Money' },
  { code: 'WAVE_CIV', label: 'Wave' },
] as const;

async function pawapayFetch(path: string, options: RequestInit = {}) {
  if (!API_TOKEN) throw new Error('PawaPay non configure : variable PAWAPAY_API_TOKEN manquante');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`PawaPay ${path} a échoué (${res.status}) : ${JSON.stringify(data)}`);
  return data;
}

export interface InitierDepotParams {
  depositId: string;
  montant: number;
  devise: string;
  correspondant: string; // ex: ORANGE_CIV
  telephone: string; // format international sans '+', ex: 2250700000000
  description: string;
}

export async function initierDepot(params: InitierDepotParams) {
  return pawapayFetch('/deposits', {
    method: 'POST',
    body: JSON.stringify({
      depositId: params.depositId,
      amount: String(Math.round(params.montant)),
      currency: params.devise,
      correspondent: params.correspondant,
      payer: { type: 'MSISDN', address: { value: params.telephone } },
      customerTimestamp: new Date().toISOString(),
      statementDescription: params.description.slice(0, 22), // limite imposee par les operateurs mobile money
      country: 'CIV',
    }),
  });
}

export async function statutDepot(depositId: string) {
  return pawapayFetch(`/deposits/${depositId}`);
}

export function nouvelIdentifiantDepot(): string {
  return randomUUID();
}
