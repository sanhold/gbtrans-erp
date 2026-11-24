'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

const TONS = {
  primaire: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700',
  danger: 'border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700',
  neutre: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200',
} as const;

interface Props {
  titre: string;
  onClick?: () => void;
  /** Si renseigné, le bouton est un lien (navigation). */
  href?: string;
  ton?: keyof typeof TONS;
  disabled?: boolean;
  children: ReactNode;
}

/** Petit bouton carré à icône, toujours visible, avec info-bulle : action de ligne d'un tableau de bureau. */
export default function BoutonIcone({ titre, onClick, href, ton = 'neutre', disabled, children }: Props) {
  const classes = `inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${TONS[ton]}`;
  if (href) return <Link href={href} title={titre} aria-label={titre} onClick={(e) => e.stopPropagation()} className={classes}>{children}</Link>;
  return (
    <button
      type="button"
      title={titre}
      aria-label={titre}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={classes}
    >
      {children}
    </button>
  );
}

const svg = (d: string) => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
);
export const IconeModifier = () => svg('M15.232 5.232l3.536 3.536M9 13l6.768-6.768a2 2 0 112.828 2.828L11.828 15.83a2 2 0 01-.89.514L7 17l.657-3.94A2 2 0 018.172 12.2z');
export const IconeSupprimer = () => svg('M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3');
export const IconeTelecharger = () => svg('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4');
export const IconeVoir = () => svg('M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z');
export const IconeValider = () => svg('M5 13l4 4L19 7');
export const IconeEnvoyer = () => svg('M12 19l9 2-9-18-9 18 9-2zm0 0v-8');
export const IconeArchiver = () => svg('M5 8h14M5 8a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 8v10a2 2 0 002 2h14a2 2 0 002-2V8m-9 4h4');
