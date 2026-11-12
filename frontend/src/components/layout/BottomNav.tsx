'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { clsx } from 'clsx';
import { useNav } from './navConfig';

// La feuille "Plus" n'est téléchargée qu'à la première ouverture.
const MobileMenuSheet = dynamic(() => import('./MobileMenuSheet'), { ssr: false });

interface Tab { key: string; label: string; href: string; icon: string; match: string[] }

// Entrées candidates (hors Accueil), par ordre de priorité ; on en garde 3 visibles selon activité / permissions.
const CANDIDATES: Tab[] = [
  { key: 'dossiers', label: 'Dossiers', href: '/dossiers', icon: 'M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', match: ['/dossiers', '/at', '/cautions'] },
  { key: 'transport', label: 'Transport', href: '/transport/courses', icon: 'M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13M5 13h14v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5z', match: ['/transport'] },
  { key: 'facturation', label: 'Facturation', href: '/facturation', icon: 'M9 14l6-6M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', match: ['/facturation', '/proformas'] },
  { key: 'finance', label: 'Finance', href: '/finance', icon: 'M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.2-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.6 2.5-1.6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', match: ['/finance', '/transactions', '/mes-dotations'] },
];
const HOME: Tab = { key: 'home', label: 'Accueil', href: '/dashboard', icon: 'M3 11l9-8 9 8M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5', match: ['/dashboard'] };
const MORE_ICON = 'M5 12h.01M12 12h.01M19 12h.01';

/** Barre d'onglets mobile (<1024px) : Accueil + 3 entrées selon permissions / activité + "Plus" (menu complet en bottom sheet). */
export default function BottomNav() {
  const { groups, pathname } = useNav();
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreLoaded, setMoreLoaded] = useState(false);

  const visible = new Set(groups.flatMap((g) => g.items.map((i) => i.href)));
  const available = CANDIDATES.filter((c) => (c.key === 'transport'
    ? visible.has('/transport/courses') || visible.has('/transport/devis')
    : visible.has(c.href)));
  const tabs = [HOME, ...available.slice(0, 3)];

  const isOn = (t: Tab) => t.match.some((m) => pathname === m || pathname?.startsWith(m + '/'));
  const moreActive = !tabs.some(isOn);

  const item = 'relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] font-medium select-none transition-colors active:bg-gray-100 dark:active:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500';
  const Ico = ({ d, active }: { d: string; active: boolean }) => (
    <svg aria-hidden="true" className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
  const marker = <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary-600 dark:bg-primary-300" aria-hidden="true" />;

  return (
    <>
      <nav
        aria-label="Navigation mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-surface-800/95 backdrop-blur border-t border-gray-200 dark:border-surface-700 pb-[env(safe-area-inset-bottom)] select-none"
      >
        <div className="flex h-[var(--bottom-nav-h)]">
          {tabs.map((t) => {
            const active = isOn(t);
            return (
              <Link key={t.key} href={t.href} aria-current={active ? 'page' : undefined} className={clsx(item, active ? 'text-primary-600 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400')}>
                {active && marker}
                <Ico d={t.icon} active={active} />
                <span className="truncate max-w-full px-1">{t.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => { setMoreLoaded(true); setMoreOpen(true); }}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={clsx(item, moreActive || moreOpen ? 'text-primary-600 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400')}
          >
            {(moreActive || moreOpen) && marker}
            <svg aria-hidden="true" className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d={MORE_ICON} /></svg>
            <span>Plus</span>
          </button>
        </div>
      </nav>
      {moreLoaded && <MobileMenuSheet open={moreOpen} onClose={() => setMoreOpen(false)} />}
    </>
  );
}
