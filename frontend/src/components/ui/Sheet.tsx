'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

/**
 * Feuille adaptative :
 *  - mobile (<768px) : bottom sheet avec poignée, fermeture par glissé vers le bas (poignée / en-tête),
 *    fond ou Échap ; option plein écran.
 *  - >=768px : modale centrée classique.
 * Focus piégé, focus restauré à la fermeture, défilement de la page verrouillé.
 */
export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Titre : si fourni, Sheet affiche un en-tête (titre + bouton fermer) et un corps défilant. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Plein écran sur mobile (sans coins arrondis) ; reste une modale centrée sur >=768px. */
  fullScreen?: boolean;
  /** Largeur max de la modale sur >=768px. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  /** Fermer en cliquant sur le fond (true par défaut). */
  closeOnBackdrop?: boolean;
  /** Classes ajoutées au panneau. */
  className?: string;
  /** z-index personnalisé (par défaut 60). */
  zIndexClass?: string;
  ariaLabel?: string;
}

const SIZES: Record<NonNullable<SheetProps['size']>, string> = {
  sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-lg', xl: 'md:max-w-xl',
  '2xl': 'md:max-w-2xl', '3xl': 'md:max-w-3xl', '4xl': 'md:max-w-4xl', '5xl': 'md:max-w-5xl',
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Pile des feuilles ouvertes : seule la plus récente réagit à Échap / Tab
const sheetStack: string[] = [];
let lockCount = 0;
function lockScroll() {
  if (lockCount++ === 0) {
    document.documentElement.dataset.sheetOpen = 'true';
    document.body.style.overflow = 'hidden';
  }
}
function unlockScroll() {
  if (--lockCount <= 0) {
    lockCount = 0;
    delete document.documentElement.dataset.sheetOpen;
    document.body.style.overflow = '';
  }
}

export default function Sheet({
  open, onClose, title, description, children, fullScreen = false, size = 'lg',
  closeOnBackdrop = true, className, zIndexClass = 'z-[60]', ariaLabel,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const drag = useRef<{ startY: number; startT: number; active: boolean } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useRef(`sheet-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => setMounted(true), []);

  // Verrouillage du scroll + focus initial / restauration
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    sheetStack.push(titleId);
    lockScroll();
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const first = panel.querySelector<HTMLElement>('[data-autofocus],input:not([type="hidden"]),textarea,select');
      (first || panel).focus({ preventScroll: true });
    }, 30);
    return () => {
      clearTimeout(t);
      const i = sheetStack.indexOf(titleId);
      if (i >= 0) sheetStack.splice(i, 1);
      unlockScroll();
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, titleId]);

  // Échap + piège du focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (sheetStack[sheetStack.length - 1] !== titleId) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { e.preventDefault(); panelRef.current.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, titleId]);

  useEffect(() => { if (!open) setDragY(0); }, [open]);

  // Glissé vers le bas (poignée / en-tête, mobile uniquement)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (window.innerWidth >= 768) return;
    drag.current = { startY: e.clientY, startT: Date.now(), active: true };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current?.active) return;
    setDragY(Math.max(0, e.clientY - drag.current.startY));
  }, []);
  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!drag.current?.active) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    const velocity = dy / Math.max(1, Date.now() - drag.current.startT);
    drag.current = null;
    if (dy > 110 || (dy > 40 && velocity > 0.6)) onCloseRef.current();
    else setDragY(0);
  }, []);

  if (!open || !mounted) return null;

  const dragProps = { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag };

  return createPortal(
    <div
      className={clsx('fixed inset-0 flex items-end md:items-center justify-center md:p-4 sheet-backdrop', zIndexClass)}
      style={{ backgroundColor: `rgba(0,0,0,${Math.max(0.15, 0.5 - dragY / 700)})` }}
      onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        className={clsx(
          'sheet-panel relative w-full flex flex-col min-h-0 bg-white dark:bg-surface-800 text-gray-900 dark:text-gray-100 shadow-elevated outline-none',
          'md:rounded-xl md:max-h-[90vh] md:h-auto',
          fullScreen ? 'h-[100dvh] rounded-none max-md:pt-[env(safe-area-inset-top)]' : 'max-h-[92dvh] rounded-t-2xl',
          SIZES[size],
          className,
        )}
      >
        {/* Poignée (mobile) */}
        <div {...dragProps} className="md:hidden flex-shrink-0 flex justify-center pt-2.5 pb-1.5 cursor-grab touch-none select-none" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-surface-700" />
        </div>

        {title ? (
          <>
            <div {...dragProps} className="flex items-start justify-between gap-3 px-4 pt-1 md:pt-4 pb-3 border-b border-gray-200 dark:border-surface-700 flex-shrink-0">
              <div className="min-w-0">
                <h3 id={titleId} className="font-display font-bold text-lg leading-tight">{title}</h3>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer" onPointerDown={(e) => e.stopPropagation()} className="w-10 h-10 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-700 flex-shrink-0">
                <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
          </>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] md:pb-0">{children}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
