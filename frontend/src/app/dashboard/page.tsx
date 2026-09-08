'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import CAMensuelChart from '@/components/dashboard/CAMensuelChart';
import RepartitionDossiersChart from '@/components/dashboard/RepartitionDossiersChart';

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
  if (montant >= 1_000_000) return `${(montant / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FCFA`;
  if (montant >= 1_000) return `${(montant / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} K FCFA`;
  return `${montant} FCFA`;
};

function KpiCard({ label, value, icon, color, trend }: {
  label: string; value: string; icon: string; color: 'violet' | 'amber' | 'teal' | 'rose' | 'blue' | 'slate'; trend?: { label: string; up?: boolean };
}) {
  const iconBg: Record<string, string> = {
    violet: 'bg-primary-100 text-primary-700',
    amber: 'bg-amber-50 text-amber-500',
    teal: 'bg-accent-50 text-accent-600',
    rose: 'bg-[#fdeaef] text-[#c93b63]',
    blue: 'bg-[#e6effc] text-[#1f6fd6]',
    slate: 'bg-[#eef0f4] text-[#525a6b]',
  };
  return (
    <div className="bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-2xl p-5 shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="text-[12.5px] text-gray-400 dark:text-gray-500 font-medium">{label}</div>
          <div className="font-display text-[26px] font-extrabold tracking-tight leading-none mt-0.5 text-gray-900 dark:text-white">{value}</div>
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

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardHomePage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [caMensuel, setCaMensuel] = useState<CAMensuel[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [alertes, setAlertes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, caRes, topRes, alertesRes] = await Promise.all([
        dashboardApi.stats(year),
        dashboardApi.caMensuel(year),
        dashboardApi.topClients(5, year),
        dashboardApi.alertes(),
      ]);
      setStats(statsRes.data.data);
      setCaMensuel(caRes.data.data || []);
      setTopClients(topRes.data.data || []);
      setAlertes(alertesRes.data.data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const dossiersAnneePrecedente = stats?.dossiersParAnnee?.[String(year - 1)] || 0;
  const dossiersTrendPct = dossiersAnneePrecedente > 0 && stats
    ? Math.round(((stats.totalDossiers - dossiersAnneePrecedente) / dossiersAnneePrecedente) * 100)
    : null;

  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const repartition = [
    { label: 'Import', value: stats?.dossiersImport || 0 },
    { label: 'Export', value: stats?.dossiersExport || 0 },
    { label: 'Transit', value: stats?.dossiersTransit || 0 },
  ];

  const nbAlertes = (alertes?.facturesEnRetard?.length || 0) + (alertes?.atExpirationProche?.length || 0) + (alertes?.cautionsCourrierEnAttente?.length || 0);

  return (
    <AppLayout>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 px-6 py-6 mb-6 shadow-card">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -right-24 -bottom-24 w-64 h-64 rounded-full bg-white/5" />
        <div className="relative flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Bonjour, {user?.prenom || 'admin'} 👋</h1>
            <p className="text-sm text-primary-100 mt-1">Voici l&apos;activité de votre bureau de transit aujourd&apos;hui.</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-[11px] px-4 py-2.5 text-[13px] font-medium text-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {todayCapitalized}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Clients actifs"
              value={`${stats?.totalClients ?? 0}`}
              icon="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6"
              color="blue"
              trend={{ label: `${stats?.totalFournisseurs ?? 0} fournisseur(s)` }}
            />
            <KpiCard
              label="Admissions Temporaires"
              value={`${stats?.atActives ?? 0}`}
              icon="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              color="slate"
              trend={stats?.atExpirees ? { label: `${stats.atExpirees} expirée(s)`, up: false } : { label: 'Aucune expirée' }}
            />
            <KpiCard
              label="Cautions en cours"
              value={`${stats?.totalCautions ?? 0}`}
              icon="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"
              color="teal"
            />
            <KpiCard
              label="Documents archivés"
              value={`${stats?.documentsArchives ?? 0}`}
              icon="M3 4h18v4H3zM5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"
              color="violet"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <SectionCard
                title={`Chiffre d'affaires mensuel — ${year}`}
                action={
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary-500" />Facturé</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent-500" />Encaissé</span>
                    <Link href="/dashboard/analytique" className="text-primary-600 hover:underline font-medium">Détails →</Link>
                  </div>
                }
              >
                <CAMensuelChart caMensuel={caMensuel} height={190} />
              </SectionCard>
            </div>

            <SectionCard title="Alertes" action={nbAlertes > 0 ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{nbAlertes}</span> : undefined}>
              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {alertes?.facturesEnRetard?.slice(0, 4).map((f: any) => (
                  <div key={f.id} className="p-2.5 rounded-lg border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10">
                    <span className="text-[9.5px] font-semibold uppercase text-gray-500">Facture en retard</span>
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{f.numero} — {f.client?.raisonSociale}</p>
                  </div>
                ))}
                {alertes?.atExpirationProche?.slice(0, 4).map((at: any) => (
                  <div key={at.id} className="p-2.5 rounded-lg border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10">
                    <span className="text-[9.5px] font-semibold uppercase text-gray-500">AT expire bientôt</span>
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{at.numero} — {new Date(at.dateExpiration).toLocaleDateString('fr-FR')}</p>
                  </div>
                ))}
                {alertes?.cautionsCourrierEnAttente?.slice(0, 4).map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/10">
                    <span className="text-[9.5px] font-semibold uppercase text-gray-500">Courrier caution en attente</span>
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Caution N°{c.numero}</p>
                  </div>
                ))}
                {nbAlertes === 0 && <p className="text-sm text-gray-400 text-center py-6">Aucune alerte 🎉</p>}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title={`Répartition des dossiers — ${year}`}>
              <RepartitionDossiersChart items={repartition} height={180} />
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
                          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate">{c.raisonSociale}</p>
                          <p className="text-[11px] text-gray-400">{c.nombre_dossiers} dossier(s)</p>
                        </div>
                      </div>
                      <span className="text-[13px] font-bold text-gray-900 dark:text-white flex-shrink-0">{formatMontant(c.ca_total)}</span>
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
