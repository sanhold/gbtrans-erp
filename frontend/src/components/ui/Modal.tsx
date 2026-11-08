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

const LARGEURS = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/**
 * Fenêtre modale commune : fermeture par Échap ou clic sur le fond, défilement de la page
 * bloqué, focus rendu à l'élément d'origine. Sur téléphone elle s'ouvre en bas de l'écran
 * (feuille), plus facile à atteindre au pouce ; sur ordinateur elle est centrée.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panneau = useRef<HTMLDivElement>(null);
  const precedent = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    precedent.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panneau.current?.focus();

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = overflow;
      precedent.current?.focus?.();
    };
  }, [open, onClose]);

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
        className={`relative w-full ${LARGEURS[size]} max-h-[92vh] flex flex-col bg-white dark:bg-surface-800
                    rounded-t-2xl sm:rounded-xl shadow-elevated animate-slide-up outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
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
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-surface-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
