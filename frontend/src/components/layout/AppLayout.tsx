'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { getRequiredModule } from '@/lib/permissions';
import Sidebar from './Sidebar';
import Header, { getModuleName } from './Header';
import BottomNav from './BottomNav';
import SplashLoader from './SplashLoader';
import TableEnhancer from '@/components/tables/TableEnhancer';

// Chaque page enveloppe son contenu dans AppLayout (remonté à chaque navigation) :
// on mémorise que le profil est déjà chargé pour ne plus afficher le splash.
let layoutReady = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadProfile, hasPermission } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(layoutReady);

  useEffect(() => {
    loadProfile().then(() => { layoutReady = true; setReady(true); });
  }, [loadProfile]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return <SplashLoader />;
  }

  if (!isAuthenticated) return null;

  const requiredModule = getRequiredModule(pathname || '');
  const authorized = !requiredModule || hasPermission(`${requiredModule}:LIRE`);

  return (
    <div className="app-shell min-h-dvh flex flex-col bg-canvas dark:bg-surface-900">
      <TableEnhancer />
      <Header />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <nav aria-label="Fil d'Ariane" className="hidden lg:flex items-center gap-2 px-5 py-2.5 border-b border-gray-200 dark:border-surface-700 text-[11.5px] text-primary-600 dark:text-primary-300">
            <button onClick={() => router.push('/dashboard')} className="hover:underline" title="Accueil">⌂</button>
            <span className="text-gray-400">›</span>
            <span>{getModuleName(pathname)}</span>
          </nav>
          <main className="app-main flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
            <div className="page-enter h-full">
              {authorized ? children : (
                <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Accès refusé</h2>
                  <p className="text-sm text-gray-500 max-w-sm">Votre profil ne dispose pas des permissions nécessaires pour accéder à cette section. Contactez un administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.</p>
                  <button onClick={() => router.push('/dashboard')} className="btn-primary mt-2">Retour à l&apos;accueil</button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
