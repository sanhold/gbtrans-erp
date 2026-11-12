'use client';

import { clsx } from 'clsx';

/**
 * Barre d'actions : ligne normale sur bureau (>=1024px) ; sur mobile / tablette, barre collante posée
 * au-dessus de la bottom nav (safe-area incluse), défilable horizontalement si besoin.
 * Pense à réserver la place en bas de page avec <StickyActionSpacer />.
 */
export default function StickyActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'flex gap-2 items-center',
        'max-lg:fixed max-lg:bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] max-lg:left-0 max-lg:right-0 max-lg:z-30 max-lg:px-3 max-lg:py-2 max-lg:overflow-x-auto',
        'max-lg:bg-white/95 max-lg:dark:bg-surface-800/95 max-lg:backdrop-blur max-lg:border-t max-lg:border-gray-200 max-lg:dark:border-surface-700',
        'max-lg:[&>*]:flex-shrink-0 max-lg:[&>*]:whitespace-nowrap lg:flex-wrap',
        className,
      )}
      data-sticky-actions
    >
      {children}
    </div>
  );
}

/** Espace réservé sous le contenu pour que la barre collante ne masque rien (mobile uniquement). */
export function StickyActionSpacer() {
  return <div className="lg:hidden h-16" aria-hidden="true" />;
}
