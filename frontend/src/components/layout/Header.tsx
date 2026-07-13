'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const MODULE_NAMES: { prefix: string; name: string }[] = [
  { prefix: '/dashboard', name: 'Accueil' },
  { prefix: '/dossiers/nouveau', name: 'Nouveau Dossier' },
  { prefix: '/dossiers', name: 'Dossiers' },
  { prefix: '/at/historique', name: 'Historique AT' },
  { prefix: '/at', name: 'Gestion AT' },
  { prefix: '/cautions', name: 'Gestion Caution' },
  { prefix: '/courriers', name: 'Courrier' },
  { prefix: '/archives', name: 'Archives numériques' },
  { prefix: '/offres', name: 'Offres' },
  { prefix: '/proformas/nouveau', name: 'Nouvelle Proforma' },
  { prefix: '/proformas', name: 'Proforma' },
  { prefix: '/facturation-fournisseurs', name: 'Facturation Fournisseur' },
  { prefix: '/facturation', name: 'Facturation' },
  { prefix: '/finance/creances-clients', name: 'Créances Clients' },
  { prefix: '/finance/dettes-fournisseurs', name: 'Dettes Fournisseurs' },
  { prefix: '/finance/comptes-clients', name: 'Comptes Clients' },
  { prefix: '/finance/comptes-fournisseurs', name: 'Comptes Fournisseurs' },
  { prefix: '/finance/comptes-bancaires/historique', name: 'Historique Comptes Désactivés' },
  { prefix: '/finance/comptes-bancaires', name: 'Comptes Bancaires' },
  { prefix: '/finance/comptes-tiers', name: 'Comptes Tiers' },
  { prefix: '/finance/caisses', name: 'Caisses' },
  { prefix: '/finance/dotation', name: 'Dotation' },
  { prefix: '/finance/depenses', name: 'Dépenses' },
  { prefix: '/finance/paiements', name: 'Paiements' },
  { prefix: '/finance/rapprochement', name: 'Rapprochement Bancaire' },
  { prefix: '/finance/etat-facturation-dossier', name: 'État Facturation Dossier' },
  { prefix: '/finance', name: 'Finance' },
  { prefix: '/transactions', name: 'Transactions' },
  { prefix: '/comptabilite', name: 'Comptabilité' },
  { prefix: '/statistiques', name: 'Statistique' },
  { prefix: '/clients', name: 'Clients' },
  { prefix: '/prospects', name: 'Prospects' },
  { prefix: '/fournisseurs', name: 'Fournisseurs' },
  { prefix: '/parametres', name: 'Paramètres' },
];

function getModuleName(pathname: string | null): string {
  if (!pathname) return 'GBTRANS ERP';
  const match = MODULE_NAMES
    .filter((m) => pathname === m.prefix || pathname.startsWith(m.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.name || 'GBTRANS ERP';
}

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar = () => {} }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const moduleName = getModuleName(pathname);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    setShowProfile(false);
    await logout();
    router.push('/auth/login');
  };

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <header className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 lg:px-8 py-3 bg-white/85 dark:bg-surface-800/85 backdrop-blur-sm border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
      <button
        onClick={onToggleSidebar}
        title="Menu"
        className="lg:hidden w-11 h-11 flex-shrink-0 rounded-[11px] border border-surface-100 dark:border-surface-600 bg-white dark:bg-surface-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-surface-600 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
      >
        <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Module courant */}
      <div className="flex-1 flex items-center min-w-0">
        <h1 className="text-[15.5px] font-bold text-gray-900 dark:text-white truncate">{moduleName}</h1>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          title="Mode sombre"
          className="w-10 h-10 rounded-[11px] border border-surface-100 dark:border-surface-600 bg-white dark:bg-surface-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-surface-600 hover:text-primary-700 dark:hover:text-primary-300 hover:border-primary-100 transition-colors"
        >
          <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {darkMode ? (
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
            ) : (
              <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9.003 9.003 0 0 0 8.354-5.646z" />
            )}
          </svg>
        </button>

        <button title="Aide" className="w-10 h-10 rounded-[11px] border border-surface-100 dark:border-surface-600 bg-white dark:bg-surface-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-surface-600 hover:text-primary-700 dark:hover:text-primary-300 hover:border-primary-100 transition-colors">
          <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" />
            <path d="M12 17h.01" />
          </svg>
        </button>

        <button title="Notifications" className="relative w-10 h-10 rounded-[11px] border border-surface-100 dark:border-surface-600 bg-white dark:bg-surface-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-surface-600 hover:text-primary-700 dark:hover:text-primary-300 hover:border-primary-100 transition-colors">
          <span className="absolute top-[9px] right-[10px] w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-surface-700" />
          <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-surface-100 dark:border-surface-600 bg-white dark:bg-surface-700 hover:bg-primary-50 dark:hover:bg-surface-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-[13px] font-semibold text-gray-900 dark:text-white leading-none">
                {user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{user?.profil?.nom || 'Administrateur'}</div>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-400 hidden md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-surface-800 text-gray-900 dark:text-white rounded-xl shadow-lg border border-surface-100 dark:border-surface-700 py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-gray-100 dark:border-surface-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user ? `${user.prenom} ${user.nom}` : ''}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
