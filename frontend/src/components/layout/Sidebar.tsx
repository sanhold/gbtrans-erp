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
  activite?: 'TRANSIT' | 'TRANSPORT';
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
      { name: 'Dossiers', href: '/dossiers', icon: 'M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', badgeKey: 'dossiers', activite: 'TRANSIT' },
      { name: 'Suivi des dossiers', href: '/dossiers/suivi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4', activite: 'TRANSIT' },
      { name: 'Gestion AT', href: '/at', icon: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', activite: 'TRANSIT' },
      { name: 'Gestion Caution', href: '/cautions', icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z', activite: 'TRANSIT' },
      { name: 'Courrier', href: '/courriers', icon: 'M2 7l10 6 10-6M2 4h20v16H2z', badgeKey: 'courriers' },
      { name: 'Archives numériques', href: '/archives', icon: 'M3 4h18v4H3zM5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4' },
    ],
  },
  {
    title: 'Transport',
    items: [
      { name: 'Devis', href: '/transport/devis', icon: 'M9 12h6m-6 4h6m-7 5h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.5L13 3H9.5L8.5 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z', activite: 'TRANSPORT' },
      { name: 'Véhicules', href: '/transport/vehicules', icon: 'M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13M5 13h14v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5z', activite: 'TRANSPORT' },
      { name: 'Chauffeurs', href: '/transport/chauffeurs', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6', activite: 'TRANSPORT' },
      { name: 'Courses', href: '/transport/courses', icon: 'M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7', activite: 'TRANSPORT' },
      { name: 'Maintenance', href: '/transport/maintenance', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', activite: 'TRANSPORT' },
      { name: 'Statistiques', href: '/transport/statistiques', icon: 'M3 3v18h18M7 14l4-4 3 3 5-6', activite: 'TRANSPORT' },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { name: 'Offres', href: '/offres', icon: 'M6 4h12v16l-6-3-6 3z' },
      { name: 'Proforma', href: '/proformas', icon: 'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v5h5M8 13h8M8 17h5' },
      { name: 'Facturation', href: '/facturation', icon: 'M9 14l6-6M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z' },
      { name: 'Facturation Fournisseur', href: '/facturation-fournisseurs', icon: 'M9 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M18 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-1 6c3 .4 5 1.8 5 5' },
      { name: 'Clients', href: '/clients', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
      { name: 'Prospects', href: '/prospects', icon: 'M18 9v6m3-3h-6M7 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 20c0-3.5 3-5 6-5s6 1.5 6 5' },
      { name: 'Fournisseurs', href: '/fournisseurs', icon: 'M9 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M18 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-1 6c3 .4 5 1.8 5 5' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Comptes', href: '/finance', icon: 'M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.2-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.6 2.5-1.6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
      { name: 'Transactions', href: '/transactions', icon: 'M3 17l6-6 4 4 8-8M21 7v5h-5' },
      { name: 'Dotation', href: '/finance/dotation', icon: 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6M12 1v22' },
      { name: 'Justificatifs dotation', href: '/finance/justificatifs', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { name: 'Mes dotations', href: '/mes-dotations', icon: 'M3 7h18v12H3zM3 7l2-4h14l2 4M9 12h6' },
      { name: 'État Facturation Dossier', href: '/finance/etat-facturation-dossier', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4' },
      { name: 'Statistique', href: '/statistiques', icon: 'M3 3v18h18M7 11h3v6H7zm5-4h3v10h-3zm5-3h3v13h-3z' },
    ],
  },
  {
    title: 'Comptabilité',
    items: [
      { name: 'Plan comptable', href: '/comptabilite/plan-comptable', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { name: 'Compta Auto', href: '/comptabilite/compta-auto', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { name: 'Compta Manuelle', href: '/compta-reel', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4' },
    ],
  },
  {
    title: 'RH & Paie',
    items: [
      { name: 'Employés', href: '/rh/employes', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
      { name: 'Paie', href: '/rh/paie', icon: 'M3 7h18v12H3zM3 7l2-4h14l2 4M9 12h6' },
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
  const [now, setNow] = useState('');

  useEffect(() => {
    const fmt = () => setNow(new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ''));
    fmt();
    const t = setInterval(fmt, 30000);
    return () => clearInterval(t);
  }, []);

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (!pathname?.startsWith(href + '/')) return false;
    // un autre élément du menu, plus spécifique, correspond-il mieux ?
    return !navGroups.some((g) => g.items.some((i) => i.href.length > href.length && (pathname === i.href || pathname.startsWith(i.href + '/'))));
  };

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
          'fixed inset-y-0 left-0 z-50 w-[232px] xl:w-[240px] flex-shrink-0 bg-[#ececec] dark:bg-surface-800 border-r border-gray-300 dark:border-surface-700 text-gray-700 dark:text-gray-200 flex flex-col overflow-y-auto',
          'transform transition-transform duration-200 ease-out',
          'lg:static lg:z-auto lg:translate-x-0 lg:sticky lg:top-[46px] lg:h-[calc(100vh-46px)]',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Fermeture (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 h-[46px] bg-primary-600 text-white flex-shrink-0">
          <span className="font-display font-extrabold text-[17px]">GBTrans</span>
          <button onClick={onClose} className="w-9 h-9 rounded-sm hover:bg-white/10 flex items-center justify-center" title="Fermer le menu">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-4 pt-3 pb-3 text-center text-[12px] text-gray-600 dark:text-gray-300">
          Date : {now}
        </div>

      {/* Navigation */}
      <nav className="flex-1">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.activite === 'TRANSIT' && user?.societe?.activiteTransit === false) return false;
            if (item.activite === 'TRANSPORT' && user?.societe?.activiteTransport !== true) return false;
            const requiredModule = getRequiredModule(item.href);
            return !requiredModule || hasPermission(`${requiredModule}:LIRE`);
          });
          if (visibleItems.length === 0) return null;

          return (
          <div key={group.title} className="mt-1.5">
            <div className="bg-primary-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-[7px]">
              {group.title}
            </div>
            {visibleItems.map((item) => {
              const isActive = isItemActive(item.href);
              const badge = item.badgeKey ? badges[item.badgeKey] : undefined;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-2.5 px-5 py-[9px] text-[12.5px] border-b border-gray-200 dark:border-surface-700 transition-colors',
                    isActive
                      ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-white font-bold border-l-[3px] border-l-amber-500 pl-[17px]'
                      : 'bg-[#f7f7f7] dark:bg-surface-800 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-surface-700 hover:text-primary-600'
                  )}
                >
                  <span className={clsx('w-[7px] h-[7px] rounded-full border-2 flex-shrink-0', isActive ? 'border-amber-500 bg-amber-500' : 'border-gray-500')} />
                  <span className="truncate">{item.name}</span>
                  {!!badge && (
                    <span className="ml-auto bg-primary-600 text-white text-[10.5px] font-bold px-1.5 py-0.5 rounded-sm">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-gray-300 dark:border-surface-700">
        {hasPermission('PARAMETRES:LIRE') && (
          <>
            <div className="bg-primary-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-[7px]">Configuration</div>
            <Link
              href="/parametres"
              onClick={onClose}
              className={clsx(
                'flex items-center gap-2.5 px-5 py-[9px] text-[12.5px] border-b border-gray-200 dark:border-surface-700 transition-colors',
                isItemActive('/parametres')
                  ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-white font-bold border-l-[3px] border-l-amber-500 pl-[17px]'
                  : 'bg-[#f7f7f7] dark:bg-surface-800 hover:bg-white dark:hover:bg-surface-700 hover:text-primary-600'
              )}
            >
              <span className="w-[7px] h-[7px] rounded-full border-2 border-gray-500 flex-shrink-0" />
              Paramètres
            </Link>
          </>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left px-5 py-[9px] text-[12.5px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Déconnexion
        </button>
      </div>
      </aside>
    </>
  );
}
