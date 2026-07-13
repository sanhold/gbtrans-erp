'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Stats {
  totalDossiers: number;
  dossiersParAnnee: Record<string, number>;
  dossiersEnCours: number;
  montantFactureMois: number;
  montantImpaye: number;
  facturesImpayeesCount: number;
  totalCourriers: number;
}

const formatMontant = (montant: number) => {
  if (montant >= 1_000_000) return `${(montant / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FCFA`;
  if (montant >= 1_000) return `${(montant / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} K FCFA`;
  return `${montant} FCFA`;
};

function KpiCard({ label, value, icon, color, trend }: {
  label: string; value: string; icon: string; color: 'violet' | 'amber' | 'teal' | 'rose'; trend?: { label: string; up?: boolean };
}) {
  const iconBg: Record<string, string> = {
    violet: 'bg-primary-100 text-primary-700',
    amber: 'bg-amber-50 text-amber-500',
    teal: 'bg-accent-50 text-accent-600',
    rose: 'bg-[#fdeaef] text-[#c93b63]',
  };
  return (
    <div className="bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="text-[12.5px] text-gray-400 dark:text-gray-500 font-medium">{label}</div>
          <div className="font-display text-[30px] font-extrabold tracking-tight leading-none mt-0.5 text-gray-900 dark:text-white">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-[11px] flex items-center justify-center flex-shrink-0 ${iconBg[color]}`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
      </div>
      {trend && (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trend.up ? 'bg-accent-50 text-accent-600' : 'bg-surface-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400'}`}>
          {trend.up && (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H9M17 7v8" />
            </svg>
          )}
          {trend.label}
        </span>
      )}
    </div>
  );
}

interface ModuleItem {
  name: string;
  desc: string;
  href: string;
  icon: string;
  color: 'violet' | 'teal' | 'amber' | 'blue' | 'rose' | 'slate';
  tag?: string;
}

const colorClasses: Record<ModuleItem['color'], string> = {
  violet: 'bg-primary-100 text-primary-700',
  teal: 'bg-accent-50 text-accent-600',
  amber: 'bg-amber-50 text-amber-500',
  blue: 'bg-[#e6effc] text-[#1f6fd6]',
  rose: 'bg-[#fdeaef] text-[#c93b63]',
  slate: 'bg-[#eef0f4] text-[#525a6b]',
};

function ModuleCard({ mod }: { mod: ModuleItem }) {
  return (
    <Link
      href={mod.href}
      className="group bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-2xl p-[18px] shadow-card hover:shadow-lg hover:border-primary-100 dark:hover:border-primary-800 hover:-translate-y-0.5 transition-all flex flex-col gap-3 min-h-[132px] relative"
    >
      {mod.tag && (
        <span className={`absolute top-4 right-4 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${colorClasses[mod.color]}`}>
          {mod.tag}
        </span>
      )}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClasses[mod.color]}`}>
        <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={mod.icon} />
        </svg>
      </div>
      <div>
        <h3 className="text-[14.5px] font-bold tracking-tight text-gray-900 dark:text-white">{mod.name}</h3>
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{mod.desc}</p>
      </div>
      <span className="mt-auto flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700 dark:text-primary-400">
        Accéder
        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

function Section({ title, subtitle, items }: { title: string; subtitle: string; items: ModuleItem[] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 mb-4">
        <h2 className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{subtitle}</span>
        <div className="flex-1 h-px bg-surface-100 dark:bg-surface-700" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((mod) => <ModuleCard key={mod.href} mod={mod} />)}
      </div>
    </div>
  );
}

const operationsModules: ModuleItem[] = [
  { name: 'Dossiers', desc: 'Suivez la progression et organisez vos documents de transit.', href: '/dossiers', icon: 'M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', color: 'violet' },
  { name: 'Gestion AT', desc: 'Pilotez le suivi de vos admissions temporaires.', href: '/at', icon: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: 'blue' },
  { name: 'Gestion Caution', desc: "Gérez et suivez l'état de vos cautions douanières.", href: '/cautions', icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z', color: 'teal' },
  { name: 'Courrier', desc: 'Suivez vos courriers entrants et sortants.', href: '/courriers', icon: 'M2 7l10 6 10-6M2 4h20v16H2z', color: 'amber' },
];

const commercialModules: ModuleItem[] = [
  { name: 'Offres', desc: 'Créez et gérez vos offres commerciales.', href: '/offres', icon: 'M6 4h12v16l-6-3-6 3z', color: 'violet' },
  { name: 'Proforma', desc: 'Créez et gérez vos factures proforma.', href: '/proformas', icon: 'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v5h5M8 13h8M8 17h5', color: 'blue' },
  { name: 'Facturation', desc: 'Émettez et suivez vos factures clients.', href: '/facturation', icon: 'M9 14l6-6M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', color: 'rose' },
  { name: 'Gestion des Finances', desc: 'Trésorerie, comptabilité et rapports financiers.', href: '/finance', icon: 'M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.2-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.6 2.5-1.6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: 'teal' },
  { name: 'Comptabilité', desc: 'Suivez vos écritures et rapports comptables.', href: '/comptabilite', icon: 'M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2zM9 7h6m-6 10h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01', color: 'slate' },
  { name: 'Transaction', desc: "Gérez l'ensemble des transactions du logiciel.", href: '/transactions', icon: 'M3 17l6-6 4 4 8-8M21 7v5h-5', color: 'amber' },
];

const tiersModules: ModuleItem[] = [
  { name: 'Clients', desc: 'Gérez les clients et leurs comptes.', href: '/clients', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6', color: 'violet' },
  { name: 'Prospects', desc: 'Suivez vos prospects et opportunités commerciales.', href: '/prospects', icon: 'M18 9v6m3-3h-6M7 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 20c0-3.5 3-5 6-5s6 1.5 6 5', color: 'blue' },
  { name: 'Fournisseurs', desc: 'Gérez les fournisseurs et leurs comptes.', href: '/fournisseurs', icon: 'M9 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5 7-5s7 1.5 7 5M18 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-1 6c3 .4 5 1.8 5 5', color: 'blue' },
  { name: 'Archives numériques', desc: 'Archivez et consultez vos documents numérisés.', href: '/archives', icon: 'M3 4h18v4H3zM5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4', color: 'slate' },
  { name: 'Statistique', desc: 'Rapports sur dossiers, charges et chiffre d’affaires.', href: '/dashboard/analytique', icon: 'M3 3v18h18M7 11h3v6H7zm5-4h3v10h-3zm5-3h3v13h-3z', color: 'teal' },
];

export default function DashboardHomePage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    dashboardApi
      .stats(year)
      .then((res) => setStats(res.data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [year]);

  const dossiersAnneePrecedente = stats?.dossiersParAnnee?.[String(year - 1)] || 0;
  const dossiersTrendPct = dossiersAnneePrecedente > 0 && stats
    ? Math.round(((stats.totalDossiers - dossiersAnneePrecedente) / dossiersAnneePrecedente) * 100)
    : null;

  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <AppLayout>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Bonjour, {user?.prenom || 'admin'} 👋</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Voici l&apos;activité de votre bureau de transit aujourd&apos;hui.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-[11px] px-4 py-2.5 text-[13px] font-medium text-gray-500 dark:text-gray-400 shadow-card">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {todayCapitalized}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label={`Dossiers ${year}`}
            value={`${stats?.totalDossiers ?? 0}`}
            icon="M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
            color="violet"
            trend={dossiersTrendPct !== null ? { label: `${dossiersTrendPct >= 0 ? '+' : ''}${dossiersTrendPct}% vs ${year - 1}`, up: dossiersTrendPct >= 0 } : undefined}
          />
          <KpiCard
            label="Dossiers en cours"
            value={`${stats?.dossiersEnCours ?? 0}`}
            icon="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            color="amber"
            trend={{ label: 'En traitement actuellement' }}
          />
          <KpiCard
            label="Chiffre d'affaires (mois)"
            value={formatMontant(stats?.montantFactureMois ?? 0)}
            icon="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.2-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.6 2.5-1.6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            color="teal"
          />
          <KpiCard
            label="Créances clients"
            value={formatMontant(stats?.montantImpaye ?? 0)}
            icon="M12 2v20M5 5h9a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9"
            color="rose"
            trend={{ label: `${stats?.facturesImpayeesCount ?? 0} facture(s) impayée(s)` }}
          />
        </div>
      )}

      <Section title="Opérations" subtitle="Suivi des dossiers de transit" items={operationsModules} />
      <Section title="Commercial & Finances" subtitle="Offres, facturation et trésorerie" items={commercialModules} />
      <Section title="Tiers & Outils" subtitle="Clients, fournisseurs et pilotage" items={tiersModules} />
    </AppLayout>
  );
}
