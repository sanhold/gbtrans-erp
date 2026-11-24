export type OngletCompta = 'generation' | 'ecritures' | 'attente' | 'rejetees' | 'grand-livre' | 'balance' | 'bilan' | 'a-decider' | 'traitees' | 'corbeille';

export interface DefOnglet { slug: string; onglet: OngletCompta; libelle: string; desc: string; icone: string; groupe: string }

const I = {
  journal: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  attente: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  rejetees: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  livre: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  balance: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  bilan: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  generation: 'M13 10V3L4 14h7v7l9-11h-7z',
  plan: 'M4 6h16M4 10h16M4 14h16M4 18h16',
};

/** Pages de Compta Manuelle : chacune a sa propre adresse et son entrée dans le menu latéral. */
export const BASE_REEL = '/compta-reel';
export const ONGLETS_REEL: DefOnglet[] = [
  { slug: 'journal', onglet: 'ecritures', libelle: 'Journal manuel', desc: 'Saisir et valider vos écritures comptables.', icone: I.journal, groupe: 'Saisie' },
  { slug: 'attente', onglet: 'attente', libelle: 'Pièces à comptabiliser', desc: 'Factures, paiements et dépenses en attente d’écriture.', icone: I.attente, groupe: 'Saisie' },
  { slug: 'rejetees', onglet: 'rejetees', libelle: 'Pièces rejetées', desc: 'Pièces écartées de la comptabilité, avec leur motif.', icone: I.rejetees, groupe: 'Saisie' },
  { slug: 'grand-livre', onglet: 'grand-livre', libelle: 'Grand Livre', desc: 'Mouvements détaillés de chaque compte.', icone: I.livre, groupe: 'États' },
  { slug: 'balance', onglet: 'balance', libelle: 'Balance', desc: 'Totaux et soldes de tous les comptes.', icone: I.balance, groupe: 'États' },
  { slug: 'bilan', onglet: 'bilan', libelle: 'Bilan', desc: 'Actif, passif, charges, produits et résultat.', icone: I.bilan, groupe: 'États' },
];

/** Pages de Compta Auto. */
export const BASE_AUTO = '/comptabilite/compta-auto';
export const ONGLETS_AUTO: DefOnglet[] = [
  { slug: 'generation', onglet: 'generation', libelle: 'Génération', desc: 'Générer les écritures depuis les factures, paiements et dépenses.', icone: I.generation, groupe: 'Écritures' },
  { slug: 'journal', onglet: 'ecritures', libelle: 'Journal automatique', desc: 'Écritures générées automatiquement (lecture seule).', icone: I.journal, groupe: 'Écritures' },
  { slug: 'grand-livre', onglet: 'grand-livre', libelle: 'Grand Livre', desc: 'Mouvements détaillés de chaque compte.', icone: I.livre, groupe: 'États' },
  { slug: 'balance', onglet: 'balance', libelle: 'Balance', desc: 'Totaux et soldes de tous les comptes.', icone: I.balance, groupe: 'États' },
  { slug: 'bilan', onglet: 'bilan', libelle: 'Bilan', desc: 'Actif, passif, charges, produits et résultat.', icone: I.bilan, groupe: 'États' },
];

/** Facture FNE Comptabilité : file de décision en trois pages. */
export const BASE_FNE = '/comptabilite/facture-fne';
export const ONGLETS_FNE: DefOnglet[] = [
  { slug: 'a-decider', onglet: 'a-decider', libelle: 'À décider', desc: 'Transactions en attente : facture normalisée, comptabilité réelle ou corbeille.', icone: I.attente, groupe: 'File de décision' },
  { slug: 'traitees', onglet: 'traitees', libelle: 'Décidées', desc: 'Transactions déjà traitées, avec leur décision et leur numéro FNE.', icone: I.livre, groupe: 'File de décision' },
  { slug: 'corbeille', onglet: 'corbeille', libelle: 'Corbeille', desc: 'Transactions écartées, restaurables à tout moment.', icone: I.rejetees, groupe: 'File de décision' },
];

export const ENTREE_PLAN = { href: '/comptabilite/plan-comptable', libelle: 'Plan comptable', desc: 'Comptes, journaux et exercices communs à Compta Auto et Compta Manuelle.', icone: I.plan, groupe: 'Paramétrage' };

export const sousMenu = (base: string, defs: DefOnglet[]) => defs.map(d => ({ name: d.libelle, href: `${base}/${d.slug}` }));
