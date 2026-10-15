'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const MODULE_NAMES: { prefix: string; name: string }[] = [
  { prefix: '/dashboard', name: 'Accueil' },
  { prefix: '/dossiers/suivi', name: 'Suivi des dossiers' },
  { prefix: '/transport/devis', name: 'Devis transport' },
  { prefix: '/transport/vehicules', name: 'Véhicules' },
  { prefix: '/transport/chauffeurs', name: 'Chauffeurs' },
  { prefix: '/transport/courses', name: 'Courses' },
  { prefix: '/transport/maintenance', name: 'Maintenance' },
  { prefix: '/transport/statistiques', name: 'Statistiques transport' },
  { prefix: '/transport', name: 'Transport' },
  { prefix: '/rh/employes', name: 'Employés' },
  { prefix: '/rh/paie', name: 'Paie' },
  { prefix: '/rh', name: 'Ressources humaines' },
  { prefix: '/mon-compte', name: 'Mon compte' },
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
  { prefix: '/comptabilite/plan-comptable', name: 'Plan comptable' },
  { prefix: '/comptabilite/compta-auto', name: 'Compta Auto' },
  { prefix: '/comptabilite', name: 'Comptabilité' },
  { prefix: '/compta-reel', name: 'Compta Manuelle' },
  { prefix: '/statistiques', name: 'Statistique' },
  { prefix: '/clients', name: 'Clients' },
  { prefix: '/prospects', name: 'Prospects' },
  { prefix: '/fournisseurs', name: 'Fournisseurs' },
  { prefix: '/parametres', name: 'Paramètres' },
];

export function getModuleName(pathname: string | null): string {
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
    <header className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 h-[46px] bg-primary-600 text-white sticky top-0 z-30 flex-shrink-0">
      <button
        onClick={onToggleSidebar}
        title="Menu"
        className="lg:hidden w-9 h-9 flex-shrink-0 rounded-sm flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/brand/logo-icon.png" alt="GBTrans" className="w-7 h-7 rounded flex-shrink-0" />
        <span className="font-display font-extrabold text-[18px] leading-none">GBTrans</span>
        <span className="hidden md:inline text-[12px] text-white/70 truncate">Gestion Bureau de Transit</span>
      </div>

      <div className="ml-auto flex items-center gap-4 text-[12px]">
        <button onClick={toggleDarkMode} title="Mode sombre" className="hidden sm:inline hover:underline">
          {darkMode ? 'Mode clair' : 'Mode sombre'}
        </button>
        <span className="hidden sm:inline text-white/40">|</span>
        <button title="Aide" className="hover:underline">Aide</button>
        <span className="text-white/40">|</span>
        <button title="Notifications" className="relative hover:underline">
          Notifications
          <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-500" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="flex items-center gap-2 pl-3 border-l border-white/25 hover:text-white/90"
          >
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center font-bold text-[11px]">{initials}</span>
            <span className="hidden md:block text-left leading-tight">
              <span className="block text-[12px] font-semibold">{user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}</span>
              <span className="block text-[10.5px] text-white/65">{user?.profil?.nom || 'Administrateur'}</span>
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-surface-800 text-gray-900 dark:text-white rounded-sm shadow-lg border border-gray-300 dark:border-surface-700 py-1 z-50">
              <div className="px-3.5 py-2 border-b border-gray-100 dark:border-surface-700">
                <p className="text-sm font-medium">{user ? `${user.prenom} ${user.nom}` : ''}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowProfile(false); router.push('/mon-compte'); }}
                className="w-full text-left px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-700"
              >
                Mon compte
              </button>
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
