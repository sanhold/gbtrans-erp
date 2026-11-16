/** Utilitaires partagés par les scripts ETL (lecture Excel, normalisation). */
import * as XLSX from 'xlsx';
import * as path from 'path';

export type Row = Record<string, any>;

export const str = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
};
export const num = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = str(v);
  if (!s) return 0;
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
/** Date calendaire (minuit UTC). SheetJS renvoie l'heure locale du classeur avec une petite dérive : on lit les composantes locales. */
export const date = (v: any): Date | null => {
  let d: Date | null = null;
  if (v instanceof Date) d = isNaN(v.getTime()) ? null : v;
  else { const s = str(v); if (s) { const x = new Date(s); d = isNaN(x.getTime()) ? null : x; } }
  if (!d) return null;
  const x = new Date(d.getTime() + 30 * 60000);
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
};
export const norm = (s: string | null) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
export const cut = (s: string | null, n: number): string | null => (s === null ? null : s.length > n ? s.slice(0, n) : s);
export const estTotal = (v: any) => ['COMPTEUR', 'SOMME', 'MONTANT TOTAL', 'TOTAL'].includes((str(v) ?? '').toUpperCase());
export const ajouterJours = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function lire(dir: string, fichier: string): Row[] {
  const wb = XLSX.readFile(path.join(dir, `${fichier}.xlsx`), { cellDates: true });
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: true });
}

export function normaliserNumeroDossier(brut: string) {
  const s = brut.trim().toUpperCase().replace(/\/{2,}/g, '/').replace(/^0-/, 'O-');
  const m = s.match(/^([A-Z])-(\d{1,4})\/(\d{4})(-[A-Z]+)?$/);
  return { numero: s, annee: m ? Number(m[3]) : null, standard: !!m, prefixe: s[0] };
}

export const STATUT_DOSSIER: Record<string, string> = {
  '1 NOUVEAU': 'NOUVEAU', '2 EN COURS': 'EN_COURS', '3 TERMINER': 'TERMINE', '4 ARCHIVE': 'ARCHIVE',
};
export const TYPE_TRANSPORT: Record<string, string> = {
  MARITIME: 'MARITIME', AERIEN: 'AERIEN', TERRESTE: 'TERRESTRE', TERRESTRE: 'TERRESTRE',
};
export function natureDossier(brut: string | null, prefixe: string): string {
  const k = norm(brut);
  if (k === 'IMPORT' || k === 'EXPORT') return k;
  if (k === 'TRANSPORT') return 'TRANSIT';
  if (prefixe === 'I') return 'IMPORT';
  if (prefixe === 'E') return 'EXPORT';
  return 'TRANSIT'; // préfixe O- : à confirmer (signalé dans le rapport)
}
export function modePaiement(v: any): string {
  const k = norm(str(v));
  return ({ ESPECE: 'ESPECES', CHEQUE: 'CHEQUE', VIREMENT: 'VIREMENT', TRAITE: 'TRAITE' } as Record<string, string>)[k] ?? 'ESPECES';
}
/** Identifiant de connexion normalisé d'un utilisateur de l'ancien logiciel. */
export function loginDe(v: string): string {
  const l = norm(v).replace(/ /g, '.').toLowerCase();
  return ({ edoukou: 'edoukou.sandrine' } as Record<string, string>)[l] ?? l;
}

/**
 * Corrections validées sur des lignes du journal sans type de compte (clé : N° d'enregistrement).
 * N° 46310 et 48768 : moitié « compte client » d'un virement bancaire (budgets des dossiers I-224/2025 et I-132/2025),
 * restée sans compte : elle crédite COASTWIN (CL2025197). N° 47170 : ressaisie de 46310 (même montant, même motif),
 * écartée comme doublon.
 */
export const COMPTE_CLIENT_IMPOSE: Record<string, string> = { '46310': 'CL2025197', '48768': 'CL2025197' };
export const DOUBLON_DE: Record<string, string> = { '47170': '46310' };
/**
 * Entrées bancaires « paiement suivant budget » sans moitié compte client dans le journal (clé : N° d'enregistrement de
 * l'entrée bancaire) : une entrée de régularisation crédite la provision du client du dossier, sans toucher à la banque.
 * N° 45210 : dossier I-183/2025, EKDS NOUVELLE. N° 47344 : dossier I-286/2025, TATA AFRICA CI.
 */
export const REGULARISATION_CLIENT: Record<string, { client: string; dossier: string }> = {
  '45210': { client: 'CL202120', dossier: 'I-183/2025' },
  '47344': { client: 'CL2023132', dossier: 'I-286/2025' },
};

/**
 * Allocation des règlements d'une facture, par ordre chronologique, dans la limite de son TTC.
 * Un règlement en trop (doublon de saisie probable) est renvoyé avec son excédent : il ne doit pas être imputé à la facture.
 * `ttc` : TTC par numéro de facture (majuscules), factures normales seulement. Résultat : par n° d'enregistrement, la part
 * imputable et l'excédent, uniquement pour les lignes touchées par un dépassement.
 */
export function allouerReglements(reglements: Row[], ttc: Map<string, number>): Map<string, { facture: string; alloue: number; excedent: number }> {
  const parFacture = new Map<string, Row[]>();
  for (const r of reglements) {
    if (num(r.supprimer) === 1 || num(r['MontantReglé']) <= 0) continue;
    const p = (str(r.NumCheque) ?? '').toUpperCase();
    if (p.startsWith('FACT') && (ttc.get(p) ?? 0) > 0) parFacture.set(p, [...(parFacture.get(p) ?? []), r]);
  }
  const res = new Map<string, { facture: string; alloue: number; excedent: number }>();
  for (const [facture, rows] of parFacture) {
    const plafond = ttc.get(facture)!;
    if (rows.reduce((a, r) => a + num(r['MontantReglé']), 0) <= plafond + 1) continue;
    rows.sort((a, b) => (date(a['DateRèglement'])?.getTime() ?? 0) - (date(b['DateRèglement'])?.getTime() ?? 0) || num(a['N° Enr.']) - num(b['N° Enr.']));
    let cumul = 0;
    for (const r of rows) {
      const e = num(r['MontantReglé']); const alloue = Math.max(0, Math.min(e, plafond - cumul)); cumul += alloue;
      res.set(String(r['N° Enr.']), { facture, alloue, excedent: e - alloue });
    }
  }
  return res;
}

/** Fusion des clients en double (même NCC, ou même raison sociale) ; le survivant est celui qui a le plus de dossiers. */
export function calculerFusionClients(clients: Row[], dossiers: Row[]): Map<string, string> {
  const nbDossiers = new Map<string, number>();
  dossiers.forEach((r) => { const c = str(r.NumInterneClient); if (c) nbDossiers.set(c, (nbDossiers.get(c) ?? 0) + 1); });
  const fusion = new Map<string, string>();
  const traiter = (rows: Row[]) => {
    if (rows.length < 2) return;
    const tri = [...rows].sort((a, b) =>
      (nbDossiers.get(String(b['N° Client'])) ?? 0) - (nbDossiers.get(String(a['N° Client'])) ?? 0) || Number(a.id) - Number(b.id));
    const survivant = fusion.get(String(tri[0]['N° Client'])) ?? String(tri[0]['N° Client']);
    for (const r of tri.slice(1)) { const c = String(r['N° Client']); if (!fusion.has(c)) fusion.set(c, survivant); }
  };
  const parNcc = new Map<string, Row[]>(); const parRs = new Map<string, Row[]>();
  clients.forEach((r) => {
    // NCC comparé sans espaces ni ponctuation (« 1503333 Z » et « 1503333Z » sont le même numéro)
    const ncc = str(r['N° CC']); const kn = ncc ? norm(ncc).replace(/ /g, '') : ''; if (ncc) parNcc.set(kn, [...(parNcc.get(kn) ?? []), r]);
    const k = norm(str(r['Raison Sociale'])); parRs.set(k, [...(parRs.get(k) ?? []), r]);
  });
  parNcc.forEach(traiter); parRs.forEach(traiter);
  return fusion;
}
