'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { platformAuth } from '@/lib/platformApi';
import SplashLoader from '@/components/layout/SplashLoader';

const NAV = [
  { href: '/admin/societes', label: 'Sociétés' },
  { href: '/admin/plans', label: 'Formules' },
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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {admin && !admin.superAdmin && (
        <div className="bg-amber-500 text-amber-950 text-center text-xs font-semibold py-1.5">
          Compte de démonstration — lecture seule, aucune modification possible
        </div>
      )}
      <header className="bg-surface-900 text-white">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin/societes" className="font-display font-bold flex items-center gap-2">
              <img src="/brand/logo-icon.png" alt="GBTrans" className="w-7 h-7 rounded-lg" />
              Administration
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === n.href ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60 hidden sm:inline">{admin?.prenom} {admin?.nom}</span>
            <button onClick={() => { platformAuth.logout(); router.push('/admin/login'); }} className="text-sm text-white/60 hover:text-white">Déconnexion</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
