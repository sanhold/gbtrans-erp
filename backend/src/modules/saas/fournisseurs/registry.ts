import prisma from '../../../config/database';
import { chiffrer, dechiffrer } from '../../../utils/secretCrypto';
import type { ChampDef, DepotParams, ResultatDepot, ResultatStatut, CorrespondantDef } from './types';
import * as pawapay from '../pawapay.service';
import * as cinetpay from './cinetpay.service';
import * as fedapay from './fedapay.service';
import * as flutterwave from './flutterwave.service';

interface ModuleFournisseur {
  CHAMPS: ChampDef[];
  CORRESPONDANTS: readonly CorrespondantDef[];
  initierDepot(champs: Record<string, string>, params: DepotParams): Promise<ResultatDepot>;
  statutDepot(champs: Record<string, string>, referenceExterne: string): Promise<ResultatStatut>;
}

export const MODULES: Record<string, ModuleFournisseur> = {
  PAWAPAY: { CHAMPS: pawapay.CHAMPS, CORRESPONDANTS: pawapay.CORRESPONDANTS_CIV, initierDepot: pawapay.initierDepot, statutDepot: pawapay.statutDepot },
  CINETPAY: cinetpay,
  FEDAPAY: fedapay,
  FLUTTERWAVE: flutterwave,
};

export function dechiffrerChamps(champsStockes: any): Record<string, string> {
  const resultat: Record<string, string> = {};
  if (!champsStockes) return resultat;
  for (const [cle, valeur] of Object.entries(champsStockes)) {
    if (typeof valeur !== 'string') continue;
    try { resultat[cle] = dechiffrer(valeur); } catch { /* champ corrompu ou cle de chiffrement changee : ignore */ }
  }
  return resultat;
}

export function chiffrerChamps(champsClairs: Record<string, string>): Record<string, string> {
  const resultat: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(champsClairs)) {
    if (valeur) resultat[cle] = chiffrer(valeur);
  }
  return resultat;
}

/** Le fournisseur de paiement actuellement actif pour la plateforme (un seul a la fois). */
export async function fournisseurActif(): Promise<{ code: string; module: ModuleFournisseur; champs: Record<string, string> } | null> {
  const row = await prisma.fournisseurPaiement.findFirst({ where: { actif: true } });
  if (!row) return null;
  const module = MODULES[row.code];
  if (!module) return null;
  return { code: row.code, module, champs: dechiffrerChamps(row.champs) };
}

export function champsConfigures(def: ChampDef[], champs: Record<string, string>): boolean {
  return def.filter(c => c.obligatoire).every(c => !!champs[c.cle]);
}
