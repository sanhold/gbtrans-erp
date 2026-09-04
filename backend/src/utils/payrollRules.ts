/**
 * Règles de paie Côte d'Ivoire (CNPS + ITS).
 *
 * ATTENTION : les taux, plafonds et tranches ci-dessous sont des valeurs
 * courantes pour la Côte d'Ivoire, fournies à titre indicatif pour faire
 * fonctionner le calcul. Les barèmes fiscaux et sociaux évoluent
 * régulièrement — À FAIRE VÉRIFIER par un expert-comptable ou la DGI avant
 * tout usage réel pour la paie. Ce fichier centralise toutes les valeurs
 * pour être facilement corrigé.
 */

export const CNPS_RULES = {
  tauxSalarie: 0.063, // 6.3% — part salariale (retraite)
  tauxPatronalRetraite: 0.077, // 7.7%
  tauxPatronalPrestationsFamiliales: 0.0575, // 5.75%
  tauxPatronalAccidentsTravail: 0.03, // taux moyen indicatif (variable 2% à 5% selon la classe de risque)
  plafondMensuel: 2_700_000, // XOF — plafond mensuel cotisable
};

// Barème ITS mensuel par part (XOF), méthode du quotient familial
export const ITS_BAREME: { min: number; max: number; taux: number }[] = [
  { min: 0, max: 75_000, taux: 0 },
  { min: 75_000, max: 240_000, taux: 0.16 },
  { min: 240_000, max: 800_000, taux: 0.21 },
  { min: 800_000, max: 2_400_000, taux: 0.24 },
  { min: 2_400_000, max: 8_000_000, taux: 0.28 },
  { min: 8_000_000, max: Infinity, taux: 0.32 },
];

export function calculerParts(situationFamiliale: string, nombreEnfants: number): number {
  let parts = 1;
  if (situationFamiliale === 'MARIE') parts += 1;
  parts += Math.min(nombreEnfants, 6) * 0.5;
  return Math.min(parts, 5);
}

export function calculerCnpsSalarie(salaireBrut: number): number {
  const base = Math.min(salaireBrut, CNPS_RULES.plafondMensuel);
  return Math.round(base * CNPS_RULES.tauxSalarie);
}

export function calculerCnpsPatronal(salaireBrut: number): number {
  const base = Math.min(salaireBrut, CNPS_RULES.plafondMensuel);
  const taux =
    CNPS_RULES.tauxPatronalRetraite +
    CNPS_RULES.tauxPatronalPrestationsFamiliales +
    CNPS_RULES.tauxPatronalAccidentsTravail;
  return Math.round(base * taux);
}

export function calculerITS(salaireBrutImposable: number, parts: number): number {
  const quotient = salaireBrutImposable / parts;
  let impotParPart = 0;
  for (const tranche of ITS_BAREME) {
    if (quotient > tranche.min) {
      const borneHaute = Math.min(quotient, tranche.max);
      impotParPart += (borneHaute - tranche.min) * tranche.taux;
    }
  }
  return Math.round(impotParPart * parts);
}

export interface CalculBulletinParams {
  salaireBase: number;
  primes?: number;
  indemnites?: number;
  autresRetenues?: number;
  avance?: number;
  situationFamiliale: string;
  nombreEnfants: number;
}

export function calculerBulletin(params: CalculBulletinParams) {
  const primes = params.primes || 0;
  const indemnites = params.indemnites || 0;
  const autresRetenues = params.autresRetenues || 0;
  const avance = params.avance || 0;

  const salaireBrut = params.salaireBase + primes + indemnites;
  const cnpsSalarie = calculerCnpsSalarie(salaireBrut);
  const cnpsPatronal = calculerCnpsPatronal(salaireBrut);
  const parts = calculerParts(params.situationFamiliale, params.nombreEnfants);
  const baseImposable = Math.max(salaireBrut - cnpsSalarie, 0);
  const itsSalarie = calculerITS(baseImposable, parts);
  const salaireNet = Math.round(salaireBrut - cnpsSalarie - itsSalarie - autresRetenues - avance);
  const coutTotalEmployeur = Math.round(salaireBrut + cnpsPatronal);

  return { salaireBrut, cnpsSalarie, cnpsPatronal, itsSalarie, salaireNet, coutTotalEmployeur, parts };
}
