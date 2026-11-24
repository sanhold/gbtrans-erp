'use client';

import { useAuthStore } from '@/stores/authStore';
import { peutAcceder, peutCreer } from './navAcces';

export interface ActionRapide { id: string; nom: string; href: string; emoji: string; teinte: string; module: string; creer: boolean; activite?: 'TRANSIT' | 'TRANSPORT' }

export const ACTIONS_RAPIDES: ActionRapide[] = [
  { id: 'dossier', nom: 'Nouveau dossier', href: '/dossiers/nouveau', emoji: '📁', teinte: 'bg-primary-50 dark:bg-primary-500/20', module: 'DOSSIERS', creer: true, activite: 'TRANSIT' },
  { id: 'facture', nom: 'Nouvelle facture', href: '/facturation/nouveau', emoji: '🧾', teinte: 'bg-amber-50 dark:bg-amber-500/20', module: 'FACTURATION', creer: true },
  { id: 'etape', nom: 'Valider une étape', href: '/dossiers/suivi', emoji: '✅', teinte: 'bg-green-50 dark:bg-green-500/20', module: 'DOSSIERS', creer: false, activite: 'TRANSIT' },
  { id: 'client', nom: 'Nouveau client', href: '/clients', emoji: '👤', teinte: 'bg-purple-50 dark:bg-purple-500/20', module: 'CLIENTS', creer: true },
];

/** Liste des actions rapides autorisées pour le profil connecté. */
export function useActionsRapides(): ActionRapide[] {
  const { user, hasPermission } = useAuthStore();
  return ACTIONS_RAPIDES.filter((a) =>
    peutAcceder(a.href, user, hasPermission, a.activite) && (!a.creer || peutCreer(a.module, hasPermission)));
}
