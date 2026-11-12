export interface LigneProforma {
  categorie: string;
  codePrestation: string;
  designation: string;
  tauxTVA: number;
  montant: number;
  estTVA: boolean;
}

export interface ProformaFormState {
  clientId: string;
  dossierId: string;
  titre: string;
  objet: string;
  observations: string;
  fobUnitaire: string;
  fretUnitaire: string;
  assurance: string;
  fraisDivers: string;
  nombreUnites: string;
  afficherSignature: boolean;
}

export const CAT_COLORS: Record<string, string> = {
  'DOUANE': '#059669',
  'DOUANE & COMPAGNIE': '#059669',
  'DEBOURS DOUANE': '#0d9488',
  'DEBOURS DOUANE & COMPAGNIE': '#0d9488',
  'DOUANE ELIBU-NOE-E': '#65a30d',
  'COMPAGNIE MARITIME': '#2563eb',
  'FRAIS PORTUAIRES': '#0891B2',
  'GUICHET UNIQUE': '#4f46e5',
  'GUICHET UNIQUE/IMMATRICULATION': '#4f46e5',
  'EXPORT ET FRET': '#7c3aed',
  'TRANSPORT': '#7C3AED',
  'PENALITES PORTUAIRES': '#dc2626',
  'AUTRES FRAIS': '#D97706',
  'DIVERS': '#6b7280',
};

// Saisie des montants : espaces comme séparateurs de milliers à l'écran, valeur « brute » (ex. 1234.5) dans l'état.
export const nettoyerNombre = (v: string) => {
  const t = v.replace(/[^\d.,]/g, '').replace(',', '.');
  const i = t.indexOf('.');
  return i === -1 ? t : t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '');
};
export const fmtSaisie = (v: string | number | null | undefined) => {
  if (v === '' || v == null) return '';
  const [ent, dec] = String(v).split('.');
  const milliers = (ent || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec !== undefined ? `${milliers}.${dec}` : milliers;
};
export const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

export function suggestCode(catalogue: any[], categorie: string): string {
  const codes = catalogue.filter(p => p.categorie === categorie).map(p => p.code as string).filter(Boolean);
  const parsed = codes
    .map(c => { const m = c.match(/^([A-Za-zÀ-ÿ-]*)(\d+)$/); return m ? { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length } : null; })
    .filter((p): p is { prefix: string; num: number; width: number } => !!p);
  if (parsed.length > 0) {
    const counts: Record<string, number> = {};
    parsed.forEach(p => { counts[p.prefix] = (counts[p.prefix] || 0) + 1; });
    const bestPrefix = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const group = parsed.filter(p => p.prefix === bestPrefix);
    const maxNum = Math.max(...group.map(p => p.num));
    const width = Math.max(...group.map(p => p.width));
    return `${bestPrefix}${String(maxNum + 1).padStart(width, '0')}`;
  }
  const initials = (categorie.match(/[A-Za-zÀ-ÿ]+/g) || []).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'PR';
  return `${initials}01`;
}
