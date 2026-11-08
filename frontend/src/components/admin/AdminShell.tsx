'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { platformAuth } from '@/lib/platformApi';
import SplashLoader from '@/components/layout/SplashLoader';
import TableEnhancer from '@/components/tables/TableEnhancer';

type Icone = 'accueil' | 'societes' | 'formules' | 'factures' | 'tresorerie' | 'journal' | 'configuration';

const ICONES: Record<Icone, string> = {
  accueil: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10',
  societes: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01',
  formules: 'M7 7h.01M7 3h5a2 2 0 011.41.59l7 7a2 2 0 010 2.82l-5 5a2 2 0 01-2.82 0l-7-7A2 2 0 013 10V5a2 2 0 012-2z',
  factures: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.59a1 1 0 01.7.29l5.42 5.42a1 1 0 01.29.7V19a2 2 0 01-2 2z',
  tresorerie: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8c1.1 0 2.1.37 2.6 1M12 8V7m0 1v8m0 0v1m0-1c-1.1 0-2.1-.37-2.6-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  journal: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  configuration: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

const GROUPES: { titre: string; items: { href: string; label: string; icone: Icone }[] }[] = [
  { titre: 'Pilotage', items: [
    { href: '/admin', label: 'Tableau de bord', icone: 'accueil' },
    { href: '/admin/societes', label: 'Sociétés clientes', icone: 'societes' },
  ] },
  { titre: 'Facturation', items: [
    { href: '/admin/plans', label: 'Formules', icone: 'formules' },
    { href: '/admin/paiements', label: 'Factures', icone: 'factures' },
    { href: '/admin/tresorerie', label: 'Trésorerie', icone: 'tresorerie' },
  ] },
  { titre: 'Système', items: [
    { href: '/admin/journal', label: "Journal d'activité", icone: 'journal' },
    { href: '/admin/configuration', label: 'Configuration', icone: 'configuration' },
  ] },
];

function Icone({ nom }: { nom: Icone }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONES[nom]} />
    </svg>
  );
}

const estActif = (pathname: string | null, href: string) =>
  href === '/admin' ? pathname === '/admin' : !!pathname && (pathname === href || pathname.startsWith(`${href}/`));

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<any>(null);
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    if (!platformAuth.isAuthenticated()) { router.push('/admin/login'); return; }
    setAdmin(platformAuth.getAdmin());
    setReady(true);
  }, [router]);

  // Ferme le tiroir à chaque changement de page et avec Échap ; bloque le défilement quand il est ouvert.
  useEffect(() => { setMenuOuvert(false); }, [pathname]);
  useEffect(() => {
    if (!menuOuvert) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOuvert(false); };
    document.addEventListener('keydown', surTouche);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', surTouche); document.body.style.overflow = overflow; };
  }, [menuOuvert]);

  if (!ready) return <SplashLoader />;

  const initiales = `${admin?.prenom?.[0] || ''}${admin?.nom?.[0] || ''}`.toUpperCase() || 'SA';
  const deconnexion = () => { platformAuth.logout(); router.push('/admin/login'); };

  const navigation = (
    <nav aria-label="Administration" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {GROUPES.map((g) => (
        <div key={g.titre}>
          <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/40">{g.titre}</p>
          <ul className="space-y-0.5">
            {g.items.map((n) => {
              const actif = estActif(pathname, n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={actif ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${actif ? 'bg-white/15 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                  >
                    <Icone nom={n.icone} />
                    {n.label}
                    {actif && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const pied = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">{initiales}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{admin?.prenom} {admin?.nom}</p>
          <p className="text-[11px] text-white/50 truncate">{admin?.superAdmin ? 'Super-administrateur' : 'Lecture seule'}</p>
        </div>
      </div>
      <button onClick={deconnexion} className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        Déconnexion
      </button>
    </div>
  );

  const marque = (
    <Link href="/admin" className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
      <img src="/brand/logo-icon.png" alt="" className="w-9 h-9 rounded-lg" />
      <div className="leading-tight">
        <p className="font-display font-bold text-white">GBTrans</p>
        <p className="text-[11px] text-white/50">Administration plateforme</p>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-canvas dark:bg-surface-900">
      <TableEnhancer />

      {/* Menu latéral : ordinateur */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-primary-600 z-30">
        {marque}
        {navigation}
        {pied}
      </aside>

      {/* Barre du haut : téléphone et tablette */}
      <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-3 px-4 bg-primary-600 text-white">
        <button
          type="button"
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOuvert}
          className="-ml-2 p-2 rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Link href="/admin" className="flex items-center gap-2 font-display font-bold">
          <img src="/brand/logo-icon.png" alt="" className="w-7 h-7 rounded-md" />
          Administration
        </Link>
        <div className="ml-auto w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold" aria-hidden="true">{initiales}</div>
      </header>

      {/* Tiroir de navigation : téléphone et tablette */}
      {menuOuvert && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu d'administration">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setMenuOuvert(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col bg-primary-600 shadow-elevated animate-slide-up">
            {marque}
            {navigation}
            {pied}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {admin && !admin.superAdmin && (
          <div className="bg-amber-500 text-amber-950 text-center text-xs font-semibold py-1.5">
            Compte en lecture seule : aucune modification possible
          </div>
        )}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
