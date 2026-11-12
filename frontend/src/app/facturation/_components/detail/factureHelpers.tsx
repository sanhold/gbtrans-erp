export const CAT_COLORS: Record<string, string> = {
  'DOUANE': '#059669', 'DOUANE & COMPAGNIE': '#059669',
  'DEBOURS DOUANE': '#0d9488', 'DEBOURS DOUANE & COMPAGNIE': '#0d9488',
  'DOUANE ELIBU-NOE-E': '#65a30d',
  'COMPAGNIE MARITIME': '#2563eb',
  'FRAIS PORTUAIRES': '#0891b2',
  'GUICHET UNIQUE': '#4f46e5', 'GUICHET UNIQUE/IMMATRICULATION': '#4f46e5',
  'EXPORT ET FRET': '#7c3aed',
  'TRANSPORT': '#9333ea',
  'PENALITES PORTUAIRES': '#dc2626',
  'AUTRES FRAIS': '#d97706',
  'DIVERS': '#6b7280',
};

export const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', TRAITE: 'Traite',
  MOBILE_MONEY: 'Mobile Money', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money',
  WAVE: 'Wave', MOOV_MONEY: 'Moov Money', CARTE_BANCAIRE: 'Carte bancaire', COMPENSATION: 'Compensation',
};

export const STATUT_COLORS: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  PARTIELLEMENT_PAYEE: 'badge-warning', PAYEE: 'badge-success',
  EN_RETARD: 'badge-danger', ANNULEE: 'badge-danger', CONTENTIEUX: 'badge-danger',
};

export const CI_FLAG = (
  <span className="inline-flex ml-1.5 align-middle shadow-[0_0_0_1px_#dbe2e8] rounded-[1px] overflow-hidden">
    <span className="w-2 h-2.5 bg-[#f77f00]" />
    <span className="w-2 h-2.5 bg-white" />
    <span className="w-2 h-2.5 bg-[#009e60]" />
  </span>
);

export const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

export interface GroupeFacture { categorie: string; lignes: any[]; sousTotal: number }

/** Regroupe les lignes par catégorie (ordre d'apparition) avec sous-totaux sur le prix unitaire (comme avant). */
export function grouperLignes(lignes: any[]): GroupeFacture[] {
  const categories = [...new Set(lignes.map((l: any) => l.categorie))].filter(Boolean) as string[];
  return categories.map(cat => ({
    categorie: cat,
    lignes: lignes.filter((l: any) => l.categorie === cat),
    sousTotal: lignes.filter((l: any) => l.categorie === cat).reduce((s: number, l: any) => s + Number(l.prixUnitaire || 0), 0),
  }));
}
