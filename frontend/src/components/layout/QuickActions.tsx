'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

/** Feuille qui monte du bas (téléphone) avec les actions les plus fréquentes. */
export default function QuickActions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const actions = useActionsRapides();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Actions rapides">
      <div className="absolute inset-0 bg-black/45 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-surface-800 rounded-t-3xl px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl animate-slide-up">
        <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-surface-600 mx-auto mb-3" />
        <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Action rapide</p>
        {actions.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Aucune action disponible pour votre profil.</p>}
        {actions.map((a) => (
          <button key={a.id} onClick={() => { onClose(); router.push(a.href); }}
            className="w-full flex items-center gap-4 px-1 min-h-[64px] border-b last:border-0 border-gray-100 dark:border-surface-700 text-left text-[16px] text-gray-900 dark:text-white active:bg-gray-50 dark:active:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg">
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${a.teinte}`} aria-hidden="true">{a.emoji}</span>
            {a.nom}
          </button>
        ))}
      </div>
    </div>
  );
}
