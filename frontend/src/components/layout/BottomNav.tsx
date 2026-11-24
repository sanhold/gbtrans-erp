'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { peutAcceder } from './navAcces';

interface Onglet { nom: string; href: string; icone: string; activite?: 'TRANSIT' | 'TRANSPORT' }

const ICONES = {
  accueil: 'M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z',
  dossiers: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  courses: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  facturation: 'M7 3h10v18l-3-2-2 2-2-2-3 2zM10 8h4M10 12h4',
  finance: 'M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
};

/** Barre de navigation du bas (téléphone) : les onglets principaux, répartis sur toute la largeur. */
export default function BottomNav() {
  const pathname = usePathname() || '';
  const { user, hasPermission } = useAuthStore();

  const transit = user?.societe?.activiteTransit !== false;
  const candidats: Onglet[] = [
    { nom: 'Accueil', href: '/dashboard', icone: ICONES.accueil },
    transit
      ? { nom: 'Dossiers', href: '/dossiers', icone: ICONES.dossiers, activite: 'TRANSIT' }
      : { nom: 'Courses', href: '/transport/courses', icone: ICONES.courses, activite: 'TRANSPORT' },
    { nom: 'Facturation', href: '/facturation', icone: ICONES.facturation },
    { nom: 'Finance', href: '/finance', icone: ICONES.finance },
  ];
  const onglets = candidats.filter((o) => peutAcceder(o.href, user, hasPermission, o.activite));

  const actif = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const rendu = (o: Onglet) => (
    <Link key={o.href} href={o.href} aria-current={actif(o.href) ? 'page' : undefined}
      className={clsx('flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[10.5px] relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg',
        actif(o.href) ? 'text-primary-700 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400')}>
      {actif(o.href) && <span className="absolute top-0 w-7 h-[3px] rounded-full bg-[#e8832a]" />}
      <svg aria-hidden="true" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={o.icone} /></svg>
      {o.nom}
    </Link>
  );

  return (
    <nav aria-label="Navigation rapide" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
      {onglets.map(rendu)}
    </nav>
  );
}
