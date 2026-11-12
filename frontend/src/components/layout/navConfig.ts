'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { dashboardApi } from '@/lib/api';
import { useCachedFetch, TTL } from '@/lib/cache';
import { getRequiredModule } from '@/lib/permissions';

// Source unique du menu : Sidebar (bureau) et BottomNav / feuille "Plus" (mobile).

export interface NavItem {
  name: string;
  href: string;
  icon: string;
  badgeKey?: 'dossiers' | 'courriers';
  activite?: 'TRANSIT' | 'TRANSPORT';
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: 'Général',
    items: [
      { name: 'Accueil', href: '/dashboard', icon: 'M3 11l9-8 9 8M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5' },
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


export const SETTINGS_ICON = 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';

/** Groupes du menu filtrés par activité de la société et permissions, + état actif + badges. */
export function useNav() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuthStore();
  const [badges, setBadges] = useState<{ dossiers?: number; courriers?: number }>({});

  const { data: badgeStats } = useCachedFetch(`dashboard:stats:${new Date().getFullYear()}`, () => dashboardApi.stats(new Date().getFullYear()), TTL.normal);
  useEffect(() => {
    const d = badgeStats?.data?.data;
    if (d) setBadges({ dossiers: d.totalDossiers, courriers: d.totalCourriers });
  }, [badgeStats]);

  const groups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.activite === 'TRANSIT' && user?.societe?.activiteTransit === false) return false;
        if (item.activite === 'TRANSPORT' && user?.societe?.activiteTransport !== true) return false;
        const requiredModule = getRequiredModule(item.href);
        return !requiredModule || hasPermission(`${requiredModule}:LIRE`);
      }),
    }))
    .filter((g) => g.items.length > 0);

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (!pathname?.startsWith(href + '/')) return false;
    // un autre élément du menu, plus spécifique, correspond-il mieux ?
    return !navGroups.some((g) => g.items.some((i) => i.href.length > href.length && (pathname === i.href || pathname.startsWith(i.href + '/'))));
  };

  const canSettings = hasPermission('PARAMETRES:LIRE');
  return { groups, isItemActive, badges, canSettings, pathname };
}
