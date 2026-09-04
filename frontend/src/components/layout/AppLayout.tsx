'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { getRequiredModule } from '@/lib/permissions';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadProfile, hasPermission } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadProfile().then(() => setReady(true));
  }, [loadProfile]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const requiredModule = getRequiredModule(pathname || '');
  const authorized = !requiredModule || hasPermission(`${requiredModule}:LIRE`);

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7">
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
        </main>
      </div>
    </div>
  );
}
