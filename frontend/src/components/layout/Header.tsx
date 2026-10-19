'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { parametresApi, dashboardApi } from '@/lib/api';
import { cachedGet, useCachedFetch, TTL } from '@/lib/cache';

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
  { prefix: '/finance/justificatifs', name: 'Justificatifs de dotation' },
  { prefix: '/mes-dotations', name: 'Mes dotations' },
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
  const [query, setQuery] = useState('');
  const [now, setNow] = useState('');
  const { data: alertesRes } = useCachedFetch('dashboard:alertes', () => dashboardApi.alertes(), TTL.normal);
  const al = alertesRes?.data?.data;
  const nbAlertes = (al?.facturesEnRetard?.length || 0) + (al?.atExpirationProche?.length || 0) + (al?.cautionsCourrierEnAttente?.length || 0);
  const iconBtn = 'w-11 h-11 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70';
  const [identite, setIdentite] = useState<{ raisonSociale?: string; logo?: string | null } | null>(null);

  useEffect(() => {
    cachedGet('ref:identite', () => parametresApi.societe.identite(), TTL.reference)
      .then((r) => setIdentite(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const jour = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setNow(`${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${date} · ${heure}`);
    };
    fmt();
    const t = setInterval(fmt, 30000);
    return () => clearInterval(t);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/dossiers?search=${encodeURIComponent(q)}` : '/dossiers');
  };

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
    <header className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 h-14 bg-primary-600 dark:bg-primary-700 text-white sticky top-0 z-30 flex-shrink-0">
      <button
        onClick={onToggleSidebar}
        title="Menu"
        aria-label="Ouvrir le menu"
        className="lg:hidden w-11 h-11 flex-shrink-0 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-2.5 min-w-0 lg:w-[210px] flex-shrink-0">
        <img src={identite?.logo || '/brand/logo-icon.png'} alt="Logo" className="h-9 w-9 p-0.5 object-contain rounded-lg bg-white flex-shrink-0" />
        <span className="hidden sm:block min-w-0 leading-tight">
          <span className="block font-display font-extrabold text-[15px] truncate">{identite?.raisonSociale || user?.societe?.raisonSociale || 'GBTrans'}</span>
          <span className="block text-[11px] text-white/65 truncate">Gestion Bureau de Transit</span>
        </span>
      </div>

      <form onSubmit={handleSearch} role="search" className="flex-1 min-w-0 max-w-xl relative">
        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un dossier"
          placeholder="Rechercher un dossier, client, facture…"
          className="w-full h-10 rounded-lg bg-white/10 border border-white/10 pl-9 pr-3 text-[13px] text-white placeholder:text-white/55 focus:outline-none focus:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2 text-[12px]">
        <span className="hidden xl:inline text-[12.5px] text-white/85 whitespace-nowrap mr-2" suppressHydrationWarning>{now}</span>
        <button onClick={toggleDarkMode} title="Mode sombre" aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'} className={iconBtn}>
          {darkMode ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          )}
        </button>
        <button title="Aide" aria-label="Aide" onClick={() => router.push('/mon-compte')} className={`${iconBtn} hidden sm:flex`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01" /></svg>
        </button>
        <button title="Notifications" aria-label={`Notifications${nbAlertes ? `, ${nbAlertes} alertes` : ''}`} onClick={() => router.push('/dashboard')} className={`${iconBtn} relative`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
          {nbAlertes > 0 && (
            <span className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{nbAlertes > 99 ? '99+' : nbAlertes}</span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfile((v) => !v)}
            aria-label="Menu du profil"
            aria-expanded={showProfile}
            className="flex items-center gap-2 pl-2 sm:pl-3 sm:ml-1 min-h-[44px] sm:border-l border-white/25 hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-md"
          >
            <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center font-bold text-[11px]">{initials}</span>
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
