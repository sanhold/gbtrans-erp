'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { dashboardApi } from '@/lib/api';
import { getRequiredModule } from '@/lib/permissions';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badgeKey?: 'dossiers' | 'courriers';
  sectionLabel?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Général',
    items: [
      { name: 'Accueil', href: '/dashboard', icon: 'M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { name: 'Dossiers', href: '/dossiers', icon: 'M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', badgeKey: 'dossiers' },
      { name: 'Suivi des dossiers', href: '/dossiers/suivi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4' },
      { name: 'Gestion AT', href: '/at', icon: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
      { name: 'Gestion Caution', href: '/cautions', icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z' },
      { name: 'Courrier', href: '/courriers', icon: 'M2 7l10 6 10-6M2 4h20v16H2z', badgeKey: 'courriers' },
      { name: 'Archives numériques', href: '/archives', icon: 'M3 4h18v4H3zM5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4' },
    ],
  },
  {
    title: 'Commercial & Finances',
    items: [
      { name: 'Offres', href: '/offres', icon: 'M6 4h12v16l-6-3-6 3z' },
      { name: 'Proforma', href: '/proformas', icon: 'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v5h5M8 13h8M8 17h5' },
      { name: 'Facturation', href: '/facturation', icon: 'M9 14l6-6M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z' },
      { name: 'Facturation Fournisseur', href: '/facturation-fournisseurs', icon: 'M9 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M18 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-1 6c3 .4 5 1.8 5 5' },
      { name: 'Comptes Clients', href: '/finance/comptes-clients', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6', sectionLabel: 'Finance — Comptes tiers' },
      { name: 'Comptes Fournisseurs', href: '/finance/comptes-fournisseurs', icon: 'M9 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M18 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-1 6c3 .4 5 1.8 5 5' },
      { name: 'Comptes', href: '/finance', icon: 'M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.2-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.6 2.5-1.6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', sectionLabel: 'Finance — Trésorerie' },
      { name: 'Transactions', href: '/transactions', icon: 'M3 17l6-6 4 4 8-8M21 7v5h-5' },
      { name: 'Caisses', href: '/finance/caisses', icon: 'M3 7h18v12H3zM3 7l2-4h14l2 4M9 12h6' },
      { name: 'Comptes Bancaires', href: '/finance/comptes-bancaires', icon: 'M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6' },
      { name: 'Comptes Tiers', href: '/finance/comptes-tiers', icon: 'M18 9v6m3-3h-6M7 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 20c0-3.5 3-5 6-5s6 1.5 6 5' },
      { name: 'Dotation', href: '/finance/dotation', icon: 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6M12 1v22', sectionLabel: 'Finance — Autres' },
      { name: 'État Facturation Dossier', href: '/finance/etat-facturation-dossier', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4' },
      { name: 'Comptabilité', href: '/comptabilite', icon: 'M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2zM9 7h6m-6 10h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01' },
      { name: 'Statistique', href: '/statistiques', icon: 'M3 3v18h18M7 11h3v6H7zm5-4h3v10h-3zm5-3h3v13h-3z' },
    ],
  },
  {
    title: 'Tiers',
    items: [
      { name: 'Clients', href: '/clients', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
      { name: 'Prospects', href: '/prospects', icon: 'M18 9v6m3-3h-6M7 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 20c0-3.5 3-5 6-5s6 1.5 6 5' },
      { name: 'Fournisseurs', href: '/fournisseurs', icon: 'M9 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M18 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-1 6c3 .4 5 1.8 5 5' },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose = () => {} }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPermission } = useAuthStore();
  const [badges, setBadges] = useState<{ dossiers?: number; courriers?: number }>({});
  const [showProfile, setShowProfile] = useState(false);

  const isItemActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  useEffect(() => {
    dashboardApi
      .stats()
      .then((res) => {
        const data = res.data.data;
        setBadges((prev) => ({ ...prev, dossiers: data?.totalDossiers, courriers: data?.totalCourriers }));
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setShowProfile(false);
    await logout();
    router.push('/auth/login');
  };

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-[264px] flex-shrink-0 bg-gradient-to-b from-primary-800 to-primary-900 text-white flex flex-col h-screen p-4 overflow-y-auto',
          'transform transition-transform duration-200 ease-out',
          'lg:static lg:z-auto lg:translate-x-0 lg:sticky lg:top-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 pt-1 pb-5">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-6 9 6v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 21V12h6v9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-extrabold text-[19px] tracking-tight leading-none">GBTrans</div>
            <div className="text-[11px] text-white/60 mt-0.5 font-medium">Gestion Bureau de Transit</div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center flex-shrink-0"
            title="Fermer le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            const requiredModule = getRequiredModule(item.href);
            return !requiredModule || hasPermission(`${requiredModule}:LIRE`);
          });
          if (visibleItems.length === 0) return null;

          return (
          <div key={group.title} className="mt-3">
            <div className="text-[10.5px] uppercase tracking-wider text-white/40 font-semibold px-3 pb-2">
              {group.title}
            </div>
            {visibleItems.map((item) => {
              const isActive = isItemActive(item.href);
              const badge = item.badgeKey ? badges[item.badgeKey] : undefined;

              return (
                <div key={item.href}>
                  {item.sectionLabel && (
                    <div className="text-[9.5px] uppercase tracking-wider text-white/35 font-semibold px-3 pt-2.5 pb-1">
                      {item.sectionLabel}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium relative transition-colors duration-150',
                      isActive ? 'bg-white/[.14] text-white' : 'text-white/80 hover:bg-white/[.08] hover:text-white'
                    )}
                  >
                    {isActive && (
                      <span className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-r-[4px] bg-accent-500" />
                    )}
                    <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                    <span>{item.name}</span>
                    {!!badge && (
                      <span className="ml-auto bg-accent-500 text-[#04372a] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-3.5 border-t border-white/10">
        {hasPermission('PARAMETRES:LIRE') && (
          <Link
            href="/parametres"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 mb-2 rounded-[10px] text-[13.5px] font-medium text-white/80 hover:bg-white/[.08] hover:text-white transition-colors duration-150"
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z" />
            </svg>
            Paramètres
          </Link>
        )}
        <div className="relative">
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-white/[.06] hover:bg-white/[.1] transition-colors"
          >
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-accent-500 to-[#0a9a72] flex items-center justify-center font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="text-left min-w-0">
              <div className="text-[13px] font-semibold truncate">{user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}</div>
              <div className="text-[11px] text-white/55 truncate">{user?.profil?.nom || 'Administrateur'}</div>
            </div>
          </button>
          {showProfile && (
            <div className="absolute left-0 bottom-full mb-2 w-full bg-white dark:bg-surface-800 text-gray-900 dark:text-white rounded-xl shadow-lg border border-surface-100 dark:border-surface-700 py-1.5 z-50">
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
      </aside>
    </>
  );
}
