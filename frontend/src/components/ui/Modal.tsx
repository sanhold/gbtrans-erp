'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Zone d'actions collée en bas (boutons Annuler / Enregistrer...). */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Pile des fenêtres ouvertes : Échap ne ferme que la plus récente (ex : le catalogue ouvert depuis un formulaire).
const pile: object[] = [];

const LARGEURS = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/**
 * Fenêtre modale commune : fermeture par Échap ou clic sur le fond, défilement de la page
 * bloqué, focus rendu à l'élément d'origine. Sur téléphone elle s'ouvre en bas de l'écran
 * (feuille), plus facile à atteindre au pouce ; sur ordinateur elle est centrée.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panneau = useRef<HTMLDivElement>(null);
  const precedent = useRef<HTMLElement | null>(null);
  // onClose est souvent une fonction recréée à chaque rendu : on la garde en référence pour que
  // l'effet ci-dessous ne se relance pas (et ne vole pas le focus du champ en cours de saisie).
  const fermer = useRef(onClose);
  fermer.current = onClose;

  useEffect(() => {
    if (!open) return;
    precedent.current = document.activeElement as HTMLElement | null;
    const moi = {};
    pile.push(moi);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panneau.current?.focus();

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pile[pile.length - 1] === moi) fermer.current();
    };
    document.addEventListener('keydown', surTouche);
    return () => {
      const i = pile.indexOf(moi);
      if (i >= 0) pile.splice(i, 1);
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = overflow;
      precedent.current?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${LARGEURS[size]} max-h-[92vh] max-h-[92dvh] flex flex-col bg-white dark:bg-surface-800
                    rounded-t-2xl sm:rounded-xl shadow-elevated animate-slide-up outline-none`}
      >
        <div className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-surface-600" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 px-5 pt-4 sm:pt-5 pb-3 border-b border-gray-100 dark:border-surface-700">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 -mt-1 p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-surface-700 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-surface-700 bg-gray-50/60 dark:bg-surface-900/30 rounded-b-xl flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
