'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import type { DefOnglet } from '@/lib/comptaOnglets';

/**
 * Menu de la rubrique, affiché en haut de la page sur téléphone : toutes les pages sont visibles d'un coup
 * (pas de défilement caché) et un toucher ouvre directement la page voulue.
 */
export default function MenuRubriqueCompta({ base, defs, titre }: { base: string; defs: DefOnglet[]; titre: string }) {
  const pathname = usePathname();
  const liens = [
    ...defs.map(d => ({ href: `${base}/${d.slug}`, libelle: d.libelle })),
    { href: '/comptabilite/plan-comptable', libelle: 'Plan comptable' },
  ];
  return (
    <nav aria-label={`Menu ${titre}`} className="lg:hidden">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{titre}</p>
      <ul className="grid grid-cols-2 gap-2">
        {liens.map(l => {
          const actif = pathname === l.href || pathname?.startsWith(l.href + '/');
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif ? 'page' : undefined}
                className={clsx(
                  'flex min-h-[44px] items-center justify-center rounded-xl border px-2 py-2 text-center text-[13px] font-medium leading-tight transition-colors',
                  actif
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200'
                )}
              >
                {l.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
