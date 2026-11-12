'use client';

import Link from 'next/link';
import { clsx } from 'clsx';

interface FABProps {
  label: string;
  onClick?: () => void;
  href?: string;
  /** Icône personnalisée (SVG) ; "+" par défaut. */
  icon?: React.ReactNode;
  /** Affiche aussi le libellé à côté de l'icône. */
  extended?: boolean;
  /** Visible aussi sur bureau (masqué >=1024px par défaut : les actions y sont dans l'en-tête de page). */
  showOnDesktop?: boolean;
  className?: string;
}

/** Bouton d'action flottante, posé au-dessus de la bottom nav (safe-area incluse). */
export default function FAB({ label, onClick, href, icon, extended = false, showOnDesktop = false, className }: FABProps) {
  const cls = clsx(
    'fab fixed right-4 z-30 flex items-center justify-center gap-2 h-14 min-w-[56px] rounded-full',
    'bg-primary-600 text-white shadow-elevated active:scale-95 transition-transform select-none',
    'hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    extended ? 'px-5' : 'px-0',
    !showOnDesktop && 'lg:hidden',
    className,
  );
  const content = (
    <>
      {icon ?? (
        <svg aria-hidden="true" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      )}
      {extended ? <span className="text-sm font-semibold">{label}</span> : <span className="sr-only">{label}</span>}
    </>
  );
  if (href) return <Link href={href} aria-label={label} className={cls}>{content}</Link>;
  return <button type="button" onClick={onClick} aria-label={label} className={cls}>{content}</button>;
}
