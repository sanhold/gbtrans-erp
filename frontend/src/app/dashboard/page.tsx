'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { dashboardApi } from '@/lib/api';
import { useCachedFetch, TTL } from '@/lib/cache';
import { SkeletonCards, Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import CAMensuelChart from '@/components/dashboard/CAMensuelChart';
import RepartitionDossiersChart from '@/components/dashboard/RepartitionDossiersChart';
import KpiCard from '@/components/dashboard/KpiCard';
import PeriodSwitch from '@/components/dashboard/PeriodSwitch';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import { formatMontantAbrege } from '@/components/dashboard/format';
import MontantsMasques from '@/components/ui/MontantsMasques';

const MONTANT_MASQUE = '•••••••';

interface Stats {
  totalDossiers: number;
  dossiersParAnnee: Record<string, number>;
  dossiersImport: number;
  dossiersExport: number;
  dossiersTransit: number;
  dossiersEnCours: number;
  totalClients: number;
  totalFournisseurs: number;
  montantFacture: number;
  montantFactureMois: number;
  montantEncaisse: number;
  montantImpaye: number;
  totalProformas: number;
  totalFactures: number;
  atActives: number;
  atExpirees: number;
  totalCautions: number;
  totalCourriers: number;
  documentsArchives: number;
  facturesImpayeesCount: number;
}

interface CAMensuel {
  mois: number;
  ca: number;
  encaisse: number;
  impaye: number;
  nombre_factures: number;
}

interface TopClient {
  id: string;
  code: string;
  raisonSociale: string;
  nombre_dossiers: number;
  ca_total: number;
  impaye: number;
}

const formatMontant = (montant: number) => {
  const { value, unit } = formatMontantAbrege(montant);
  return `${value} ${unit}`;
};

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card !p-4 sm:!p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold tracking-tight text-gray-900 dark:text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardHomePage() {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const moisCourant = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  const montant = (m: number) => (canSeeMontants ? formatMontantAbrege(m) : { value: MONTANT_MASQUE, unit: undefined });
  // Affichage immédiat du cache puis rafraîchissement ; les 4 requêtes partent en parallèle
  // et "stats" est partagé avec les pastilles du menu latéral (une seule requête réseau).
  const { data: statsRes, loading: loadingStats } = useCachedFetch(`dashboard:stats:${year}`, () => dashboardApi.stats(year), TTL.normal);
  const { data: caRes, loading: loadingCa } = useCachedFetch(`dashboard:ca:${year}`, () => dashboardApi.caMensuel(year), TTL.normal);
  const { data: topRes } = useCachedFetch(`dashboard:top:${year}`, () => dashboardApi.topClients(5, year), TTL.normal);
  const { data: alertesRes } = useCachedFetch('dashboard:alertes', () => dashboardApi.alertes(), TTL.normal);
  const stats: Stats | null = statsRes?.data?.data ?? null;
  const caMensuel: CAMensuel[] = caRes?.data?.data || [];
  const topClients: TopClient[] = topRes?.data?.data || [];
  const alertes = alertesRes?.data?.data ?? null;
  const loading = loadingStats;

  const dossiersAnneePrecedente = stats?.dossiersParAnnee?.[String(year - 1)] || 0;
  const dossiersTrendPct = dossiersAnneePrecedente > 0 && stats
    ? Math.round(((stats.totalDossiers - dossiersAnneePrecedente) / dossiersAnneePrecedente) * 100)
    : null;

  const repartition = [
    { label: 'Import', value: stats?.dossiersImport || 0 },
    { label: 'Export', value: stats?.dossiersExport || 0 },
    { label: 'Transit', value: stats?.dossiersTransit || 0 },
  ];


  const caMois = montant(stats?.montantFactureMois ?? 0);
  const creances = montant(stats?.montantImpaye ?? 0);

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-[24px] sm:text-[26px] font-extrabold tracking-tight text-gray-900 dark:text-white">Tableau de bord</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Vue d&apos;ensemble de l&apos;activité du bureau de transit</p>
        </div>
        <PeriodSwitch years={[currentYear - 1, currentYear]} value={year} onChange={setYear} />
      </div>
      {loading ? (
        <div>
          <SkeletonCards count={4} className="mb-4" />
          <SkeletonCards count={4} className="mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-[320px] lg:col-span-2" />
            <Skeleton className="h-[320px]" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <KpiCard
              label={`Dossiers ouverts en ${year}`}
              value={`${stats?.totalDossiers ?? 0}`}
              icon="M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
              context={dossiersTrendPct !== null ? (
                <span className={`font-semibold ${dossiersTrendPct >= 0 ? 'text-accent-600 dark:text-accent-500' : 'text-red-600'}`}>
                  {dossiersTrendPct >= 0 ? '↑ +' : '↓ '}{dossiersTrendPct} % vs {year - 1}
                </span>
              ) : undefined}
            />
            <KpiCard
              label="Dossiers en cours"
              value={`${stats?.dossiersEnCours ?? 0}`}
              icon="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              context="En traitement actuellement"
            />
            <KpiCard
              label={`Chiffre d'affaires · ${moisCourant}`}
              value={caMois.value}
              unit={caMois.unit}
              icon="M3 17l6-6 4 4 8-8M21 7v5h-5"
              iconClass="text-accent-600 dark:text-accent-500"
              context="Facturé sur le mois"
            />
            <KpiCard
              label="Créances clients"
              value={creances.value}
              unit={creances.unit}
              icon="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
              iconClass="text-red-600"
              context={<span className="font-semibold text-red-600 dark:text-red-400">{stats?.facturesImpayeesCount ?? 0} facture(s) impayée(s)</span>}
            />
            <KpiCard
              label="Clients actifs"
              value={`${stats?.totalClients ?? 0}`}
              icon="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6"
              context={`${stats?.totalFournisseurs ?? 0} fournisseur(s)`}
            />
            <KpiCard
              label="Admissions temporaires"
              value={`${stats?.atActives ?? 0}`}
              icon="M6 2h12M6 22h12M7 2c0 5 5 6 5 10s-5 5-5 10M17 2c0 5-5 6-5 10s5 5 5 10"
              context={stats?.atExpirees ? <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.atExpirees} expirée(s)</span> : 'Aucune expirée'}
            />
            <KpiCard
              label="Cautions en cours"
              value={`${stats?.totalCautions ?? 0}`}
              icon="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"
              context="Actives"
            />
            <KpiCard
              label="Documents archivés"
              value={`${stats?.documentsArchives ?? 0}`}
              icon="M3 4h18v4H3zM5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"
              context={<Link href="/archives" className="font-semibold text-primary-600 dark:text-primary-300 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded">Archiver un document →</Link>}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 min-w-0">
              <div className="card !p-4 sm:!p-5 h-full">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Chiffre d&apos;affaires mensuel {year}</h3>
                    <p className="text-[12.5px] text-gray-500 dark:text-gray-400">En FCFA</p>
                  </div>
                  <div className="flex items-center gap-4 text-[12.5px] whitespace-nowrap text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded bg-primary-500" />Facturé</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded bg-amber-500" />Encaissé</span>
                    <Link href="/dashboard/analytique" className="inline-flex items-center min-h-[44px] sm:min-h-0 text-primary-600 dark:text-primary-300 underline underline-offset-2 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded">Détails</Link>
                  </div>
                </div>
                {canSeeMontants ? loadingCa ? <Skeleton className="h-[260px]" /> : <CAMensuelChart caMensuel={caMensuel} height={260} /> : <MontantsMasques height={260} label="Chiffre d'affaires masqué" />}
              </div>
            </div>

            <AlertsPanel alertes={alertes} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title={`Répartition des dossiers — ${year}`}>
              <RepartitionDossiersChart items={repartition} height={160} />
            </SectionCard>

            <SectionCard title={`Meilleurs clients — ${year}`} action={<Link href="/clients" className="text-xs text-primary-600 hover:underline font-medium">Voir tous →</Link>}>
              {topClients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune facturation cette année</p>
              ) : (
                <div className="space-y-2">
                  {topClients.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">{c.raisonSociale}</p>
                          <p className="text-[11px] text-gray-400">{c.nombre_dossiers} dossier(s)</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-bold text-gray-900 dark:text-white flex-shrink-0">{canSeeMontants ? formatMontant(c.ca_total) : MONTANT_MASQUE}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </AppLayout>
  );
}
