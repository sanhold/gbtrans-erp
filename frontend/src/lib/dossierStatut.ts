// Statuts valides d'un dossier (workflow simplifié à 4 étapes + Annulé à part).
export const STATUTS_DOSSIER = ['NOUVEAU', 'EN_COURS', 'TERMINE', 'ANNULE', 'ARCHIVE'];

export const WORKFLOW_STEPS_DOSSIER = ['NOUVEAU', 'EN_COURS', 'TERMINE', 'ARCHIVE'];

export const STATUTS_DOSSIER_FERME = ['TERMINE', 'ANNULE', 'ARCHIVE'];

export function dossierEstFerme(statut: string) {
  return STATUTS_DOSSIER_FERME.includes(statut);
}

// Les clés ATTENTE_CLIENT/ATTENTE_DOUANE/LIQUIDATION/PAIEMENT/MAIN_LEVEE/LIVRAISON/CLOTURE
// n'existent plus comme statuts sélectionnables mais restent nécessaires pour afficher
// correctement l'historique des dossiers (HistoriqueDossier.statutAvant/statutApres,
// valeurs libres non typées qui conservent les anciens statuts d'avant simplification).
export const statutColors: Record<string, string> = {
  NOUVEAU: 'badge-info',
  EN_COURS: 'badge-warning',
  TERMINE: 'badge-success',
  ANNULE: 'badge-danger',
  ARCHIVE: 'badge-gray',
  ATTENTE_CLIENT: 'badge-gray',
  ATTENTE_DOUANE: 'badge-gray',
  LIQUIDATION: 'badge-warning',
  PAIEMENT: 'badge-info',
  MAIN_LEVEE: 'badge-info',
  LIVRAISON: 'badge-success',
  CLOTURE: 'badge-success',
};

export const statutLabels: Record<string, string> = {
  NOUVEAU: 'Nouveau',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
  ARCHIVE: 'Archivé',
  ATTENTE_CLIENT: 'Attente Client',
  ATTENTE_DOUANE: 'Attente Douane',
  LIQUIDATION: 'Liquidation',
  PAIEMENT: 'Paiement',
  MAIN_LEVEE: 'Main levée',
  LIVRAISON: 'Livraison',
  CLOTURE: 'Clôturé',
};
