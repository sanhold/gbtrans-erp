'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { dashboardApi } from '@/lib/api';

interface Stats {
  totalDossiers: number;
  dossiersParAnnee: Record<string, number>;
  dossiersImport: number;
  dossiersExport: number;
  dossiersTransit: number;
  totalClients: number;
  totalFournisseurs: number;
  montantFacture: number;
  montantEncaisse: number;
  montantImpaye: number;
  totalProformas: number;
  totalFactures: number;
  atActives: number;
  atExpirees: number;
  totalCautions: number;
  totalCourriers: number;
  documentsArchives: number;
  recettes: number;
  depenses: number;
  benefice: number;
}

interface CAMensuel {
  mois: number;
  ca: number;
  encaisse: number;
  impaye: number;
  nombre_factures: number;
}

const formatMontant = (montant: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
};

const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function StatCard({ titre, valeur, icone, couleur, sousTitre }: {
  titre: string; valeur: string | number; icone: string; couleur: string; sousTitre?: string;
}) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20', green: 'bg-green-50 dark:bg-green-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20', red: 'bg-red-50 dark:bg-red-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20', indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20', amber: 'bg-amber-50 dark:bg-amber-900/20',
  };
  const iconColors: Record<string, string> = {
    blue: 'text-blue-500', green: 'text-green-500', orange: 'text-orange-500', red: 'text-red-500',
    purple: 'text-purple-500', indigo: 'text-indigo-500', cyan: 'text-cyan-500', amber: 'text-amber-500',
  };

  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl ${bgColors[couleur]} flex items-center justify-center`}>
        <svg className={`w-6 h-6 ${iconColors[couleur]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icone} />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{titre}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{valeur}</p>
        {sousTitre && <p className="text-xs text-gray-400 mt-0.5">{sousTitre}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<Stats | null>(null);
  const [caMensuel, setCaMensuel] = useState<CAMensuel[]>([]);
  const [alertes, setAlertes] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (selectedYear: number) => {
    setLoading(true);
    try {
      const [statsRes, caRes, alertesRes] = await Promise.all([
        dashboardApi.stats(selectedYear),
        dashboardApi.caMensuel(selectedYear),
        dashboardApi.alertes(),
      ]);
      setStats(statsRes.data.data);
      setCaMensuel(caRes.data.data || []);
      setAlertes(alertesRes.data.data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(annee); }, [annee, loadData]);

  const handleChangeAnnee = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAnnee(parseInt(e.target.value));
  };

  // Préparer données graphique
  const maxCA = Math.max(...caMensuel.map(m => m.ca), 1);
  const graphData = moisLabels.map((_, i) => {
    const data = caMensuel.find(m => m.mois === i + 1);
    return {
      ca: data?.ca || 0,
      encaisse: data?.encaisse || 0,
      pctCA: data ? (data.ca / maxCA) * 100 : 0,
      pctEnc: data ? (data.encaisse / maxCA) * 100 : 0,
    };
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* En-tête + Filtre Année */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 mb-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Accueil
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord analytique</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vue d&apos;ensemble — Année {annee}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={annee}
              onChange={handleChangeAnnee}
              className="input-field w-auto text-sm font-medium"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
            <button className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter
            </button>
          </div>
        </div>

        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard titre="Dossiers" valeur={stats?.totalDossiers || 0}
            icone="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" couleur="blue"
            sousTitre={`Import: ${stats?.dossiersImport} | Export: ${stats?.dossiersExport} | Transit: ${stats?.dossiersTransit}`} />
          <StatCard titre="Chiffre d'Affaires" valeur={formatMontant(stats?.montantFacture || 0)}
            icone="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" couleur="indigo"
            sousTitre={`${stats?.totalFactures} factures en ${annee}`} />
          <StatCard titre="Encaissé" valeur={formatMontant(stats?.montantEncaisse || 0)}
            icone="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" couleur="green" />
          <StatCard titre="Impayé" valeur={formatMontant(stats?.montantImpaye || 0)}
            icone="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" couleur="red" />
        </div>

        {/* Deuxième ligne */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard titre="Clients" valeur={stats?.totalClients || 0}
            icone="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" couleur="green"
            sousTitre={`${stats?.totalFournisseurs} fournisseurs`} />
          <StatCard titre="Bénéfice" valeur={formatMontant(stats?.benefice || 0)}
            icone="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" couleur={stats?.benefice && stats.benefice > 0 ? 'green' : 'red'}
            sousTitre="Recettes - Dépenses" />
          <StatCard titre="AT Actives" valeur={stats?.atActives || 0}
            icone="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" couleur="cyan"
            sousTitre={`${stats?.atExpirees} expirée(s)`} />
          <StatCard titre="Cautions" valeur={stats?.totalCautions || 0}
            icone="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" couleur="amber" />
        </div>

        {/* Graphique CA Mensuel + Alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Chiffre d&apos;Affaires Mensuel — {annee}
              </h3>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-500" />Facturé</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />Encaissé</span>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {moisLabels.map((mois, i) => (
                <div key={mois} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex gap-0.5 items-end h-48">
                    <div className="flex-1 bg-primary-400 dark:bg-primary-500 rounded-t-sm transition-all hover:bg-primary-600"
                      style={{ height: `${Math.max(graphData[i].pctCA, 2)}%` }} />
                    <div className="flex-1 bg-green-400 dark:bg-green-500 rounded-t-sm transition-all hover:bg-green-600"
                      style={{ height: `${Math.max(graphData[i].pctEnc, graphData[i].ca > 0 ? 2 : 0)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{mois}</span>
                  {graphData[i].ca > 0 && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      <div>CA: {new Intl.NumberFormat('fr-FR').format(graphData[i].ca)} F</div>
                      <div>Enc: {new Intl.NumberFormat('fr-FR').format(graphData[i].encaisse)} F</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Alertes réelles */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alertes</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {alertes?.facturesEnRetard?.map((f: any) => (
                <div key={f.id} className="p-3 rounded-lg border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10 animate-slide-up">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">FACTURE EN RETARD</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{f.numero}</p>
                  <p className="text-xs text-gray-500">{f.client?.raisonSociale} — {formatMontant(Number(f.resteAPayer))}</p>
                </div>
              ))}
              {alertes?.atExpirationProche?.map((at: any) => (
                <div key={at.id} className="p-3 rounded-lg border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/10 animate-slide-up">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">AT EXPIRATION PROCHE</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{at.numero}</p>
                  <p className="text-xs text-gray-500">{at.designation} — expire le {new Date(at.dateExpiration).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
              {alertes?.cautionsCourrierEnAttente?.map((c: any) => (
                <div key={c.id} className="p-3 rounded-lg border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10 animate-slide-up">
                  <span className="text-[10px] font-semibold uppercase text-gray-500">COURRIER CAUTION EN ATTENTE</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">Caution N°{c.numero}</p>
                  <p className="text-xs text-gray-500">{c.compagnie || 'Compagnie non renseignée'} — {formatMontant(Number(c.montant))}</p>
                </div>
              ))}
              {!alertes?.facturesEnRetard?.length && !alertes?.atExpirationProche?.length && !alertes?.cautionsCourrierEnAttente?.length && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune alerte</p>
              )}
            </div>
          </div>
        </div>

        {/* Répartition + Résumé financier */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Répartition des Dossiers — {annee}</h3>
            <div className="space-y-4">
              {[
                { label: 'Import', value: stats?.dossiersImport || 0, color: 'bg-blue-500' },
                { label: 'Export', value: stats?.dossiersExport || 0, color: 'bg-green-500' },
                { label: 'Transit', value: stats?.dossiersTransit || 0, color: 'bg-orange-500' },
              ].map((item) => {
                const pct = ((item.value) / (stats?.totalDossiers || 1)) * 100;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Résumé Financier — {annee}</h3>
            <div className="space-y-3">
              {[
                { label: 'Recettes', value: stats?.recettes || 0, icon: '↑', color: 'text-green-500' },
                { label: 'Dépenses', value: stats?.depenses || 0, icon: '↓', color: 'text-red-500' },
                { label: 'Bénéfice', value: stats?.benefice || 0, icon: '=', color: 'text-blue-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-surface-700">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${item.color}`}>{item.icon}</span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${item.color}`}>{formatMontant(item.value)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Dossiers par année</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(stats?.dossiersParAnnee || {}).map(([a, count]) => (
                  <div key={a} className={`text-center p-2 rounded-lg transition-all ${parseInt(a) === annee ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500' : 'bg-primary-50 dark:bg-primary-900/20'}`}>
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{count}</p>
                    <p className="text-[10px] text-gray-500">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
