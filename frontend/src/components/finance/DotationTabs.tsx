'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const ONGLETS = [
  { href: '/finance/dotation', label: 'Dotations', module: 'FINANCE' },
  { href: '/finance/justificatifs', label: 'À valider', module: 'FINANCE' },
  { href: '/mes-dotations', label: 'Mes dotations', module: null },
];

/** Onglets communs du module Dotation : attribution, file de validation de la trésorerie, espace de l'agent. */
export default function DotationTabs() {
  const pathname = usePathname() || '';
  const { hasPermission } = useAuthStore();
  const visibles = ONGLETS.filter(o => !o.module || hasPermission(`${o.module}:LIRE`));
  if (visibles.length < 2) return null;

  return (
    <nav aria-label="Sections du module Dotation" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-surface-700 -mx-1 px-1 mb-3 sm:mb-4">
      {visibles.map(o => {
        const actif = pathname === o.href || pathname.startsWith(o.href + '/');
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? 'page' : undefined}
            className={`whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px] sm:min-h-0
              ${actif
                ? 'border-primary-500 text-primary-600 dark:text-primary-300 dark:border-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-white'}`}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
