'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import Sheet from './Sheet';

export interface PageHeaderAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  /** Style destructif (texte rouge). */
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Actions principales (toujours visibles), ex. bouton "Nouveau". */
  actions?: React.ReactNode;
  /** Actions secondaires : boutons sur bureau, repliées dans un menu "⋯" (bottom sheet) sur mobile. */
  secondaryActions?: PageHeaderAction[];
  /** Masque le titre sur mobile (déjà affiché dans la barre d'application). */
  hideTitleOnMobile?: boolean;
  className?: string;
}

/** En-tête de page : titre + actions ; les actions secondaires se replient en menu sur mobile. */
export default function PageHeader({ title, subtitle, actions, secondaryActions = [], hideTitleOnMobile = false, className }: PageHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const secondary = secondaryActions.filter((a) => !a.hidden);

  const desktopBtn = (a: PageHeaderAction) => {
    const cls = clsx('btn-secondary gap-1.5', a.danger && '!text-red-600', a.disabled && 'opacity-50 pointer-events-none');
    return a.href
      ? <Link key={a.label} href={a.href} className={cls}>{a.icon}{a.label}</Link>
      : <button key={a.label} type="button" onClick={a.onClick} disabled={a.disabled} className={cls}>{a.icon}{a.label}</button>;
  };

  return (
    <div className={clsx('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4', className)}>
      <div className={clsx('min-w-0 flex-1', hideTitleOnMobile && 'hidden lg:block')}>
        <h1 className="font-display font-bold text-xl lg:text-2xl text-gray-900 dark:text-white leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      {(actions || secondary.length > 0) && (
        <div className={clsx('flex items-center gap-2', hideTitleOnMobile && 'max-lg:w-full max-lg:justify-end')}>
          {secondary.length > 0 && (
            <>
              <div className="hidden lg:flex items-center gap-2">{secondary.map(desktopBtn)}</div>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Plus d'actions"
                aria-haspopup="dialog"
                className="lg:hidden w-11 h-11 rounded-lg border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-800 flex items-center justify-center active:bg-gray-100 dark:active:bg-surface-700"
              >
                <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
              </button>
            </>
          )}
          {actions}
        </div>
      )}

      {secondary.length > 0 && (
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} size="sm" ariaLabel="Actions">
          <ul className="py-2 overflow-y-auto">
            {secondary.map((a) => {
              const cls = clsx(
                'flex items-center gap-3 w-full px-5 min-h-[52px] text-[15px] font-medium text-left active:bg-gray-100 dark:active:bg-surface-700 disabled:opacity-50',
                a.danger ? 'text-red-600' : 'text-gray-800 dark:text-gray-100',
              );
              return (
                <li key={a.label}>
                  {a.href
                    ? <Link href={a.href} onClick={() => setMenuOpen(false)} className={cls}>{a.icon}{a.label}</Link>
                    : <button type="button" disabled={a.disabled} onClick={() => { setMenuOpen(false); a.onClick?.(); }} className={cls}>{a.icon}{a.label}</button>}
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
    </div>
  );
}
