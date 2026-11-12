'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { platformAuth } from '@/lib/platformApi';
import SplashLoader from '@/components/layout/SplashLoader';
import TableEnhancer from '@/components/tables/TableEnhancer';

const NAV = [
  { href: '/admin', label: 'Tableau de bord' },
  { href: '/admin/societes', label: 'Sociétés' },
  { href: '/admin/plans', label: 'Formules' },
  { href: '/admin/paiements', label: 'Factures' },
  { href: '/admin/tresorerie', label: 'Trésorerie' },
  { href: '/admin/journal', label: 'Journal' },
  { href: '/admin/configuration', label: 'Configuration' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    if (!platformAuth.isAuthenticated()) { router.push('/admin/login'); return; }
    setAdmin(platformAuth.getAdmin());
    setReady(true);
  }, [router]);

  if (!ready) return <SplashLoader />;

  return (
    <div className="min-h-dvh bg-white dark:bg-surface-900">
      <TableEnhancer />
      {admin && !admin.superAdmin && (
        <div className="bg-amber-500 text-amber-950 text-center text-xs font-semibold py-1.5">
          Compte de démonstration — lecture seule, aucune modification possible
        </div>
      )}
      <header className="bg-primary-600 text-white pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-5 h-[46px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-display font-bold flex items-center gap-2">
              <img src="/brand/logo-icon.png" alt="GBTrans" className="w-7 h-7 rounded" />
              Administration
            </Link>
            <nav className="hidden sm:flex items-stretch gap-0.5">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} className={`px-3 h-[46px] flex items-center text-[12.5px] font-medium transition-colors border-b-[3px] ${pathname === n.href ? 'border-amber-500 bg-white/10 text-white font-bold' : 'border-transparent text-white/75 hover:text-white hover:bg-white/10'}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80 hidden sm:inline">{admin?.prenom} {admin?.nom}</span>
            <button type="button" onClick={() => { platformAuth.logout(); router.push('/admin/login'); }} className="min-h-[44px] px-2 text-sm text-white/80 hover:text-white">Déconnexion</button>
          </div>
        </div>
        {/* Navigation mobile : défilement horizontal (la navigation bureau est masquée sous 640px) */}
        <nav aria-label="Administration" className="sm:hidden border-t border-white/15 overflow-x-auto [scrollbar-width:none]">
          <ul className="flex px-3 min-w-max">
            {NAV.map(n => (
              <li key={n.href}>
                <Link href={n.href} aria-current={pathname === n.href ? 'page' : undefined} className={`flex items-center min-h-[44px] px-3 text-[13px] font-medium whitespace-nowrap border-b-[3px] ${pathname === n.href ? 'border-amber-500 text-white font-bold' : 'border-transparent text-white/80'}`}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-5 sm:py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
