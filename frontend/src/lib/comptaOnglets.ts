export type OngletCompta = 'generation' | 'ecritures' | 'attente' | 'rejetees' | 'grand-livre' | 'balance' | 'bilan';

export interface DefOnglet { slug: string; onglet: OngletCompta; libelle: string }

/** Pages de Compta Manuelle : chacune a sa propre adresse et son entrée dans le menu latéral. */
export const BASE_REEL = '/compta-reel';
export const ONGLETS_REEL: DefOnglet[] = [
  { slug: 'journal', onglet: 'ecritures', libelle: 'Journal manuel' },
  { slug: 'attente', onglet: 'attente', libelle: 'Pièces à comptabiliser' },
  { slug: 'rejetees', onglet: 'rejetees', libelle: 'Pièces rejetées' },
  { slug: 'grand-livre', onglet: 'grand-livre', libelle: 'Grand Livre' },
  { slug: 'balance', onglet: 'balance', libelle: 'Balance' },
  { slug: 'bilan', onglet: 'bilan', libelle: 'Bilan' },
];

/** Pages de Compta Auto. */
export const BASE_AUTO = '/comptabilite/compta-auto';
export const ONGLETS_AUTO: DefOnglet[] = [
  { slug: 'generation', onglet: 'generation', libelle: 'Génération' },
  { slug: 'journal', onglet: 'ecritures', libelle: 'Journal automatique' },
  { slug: 'grand-livre', onglet: 'grand-livre', libelle: 'Grand Livre' },
  { slug: 'balance', onglet: 'balance', libelle: 'Balance' },
  { slug: 'bilan', onglet: 'bilan', libelle: 'Bilan' },
];

export const sousMenu = (base: string, defs: DefOnglet[]) => defs.map(d => ({ name: d.libelle, href: `${base}/${d.slug}` }));
