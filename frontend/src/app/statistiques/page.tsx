'use client';

import { SkeletonCards } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useCachedFetch, TTL } from '@/lib/cache';
import { dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import RepartitionDossiersChart from '@/components/dashboard/RepartitionDossiersChart';

const MONTANT_MASQUE = '•••••••';

export default function StatistiquesPage() {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const year = new Date().getFullYear();
  const { data: sRes, loading: l1 } = useCachedFetch(`dashboard:stats:${year}`, () => dashboardApi.stats(year), TTL.normal);
  const { data: cRes, loading: l2 } = useCachedFetch('dashboard:top:10', () => dashboardApi.topClients(10), TTL.normal);
  const stats: any = sRes?.data?.data ?? null;
  const topClients: any[] = cRes?.data?.data || [];
  const loading = l1 || l2;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistiques</h1><p className="text-sm text-gray-500">Tableaux de bord analytiques</p></div>
          <div className="flex gap-2">
            <select className="input-field w-auto text-sm"><option>2026</option><option>2025</option><option>2024</option></select>
            <button className="btn-secondary"><svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Excel</button>
            <button className="btn-secondary"><svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>PDF</button>
          </div>
        </div>

        {loading ? (
          <SkeletonCards count={4} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center"><p className="text-3xl font-bold text-primary-600">{stats?.totalDossiers || 0}</p><p className="text-sm text-gray-500 mt-1">Dossiers Total</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-green-600">{canSeeMontants ? fmt(stats?.montantFacture || 0) : MONTANT_MASQUE}</p><p className="text-sm text-gray-500 mt-1">Chiffre d&apos;Affaires (XOF)</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-blue-600">{stats?.totalClients || 0}</p><p className="text-sm text-gray-500 mt-1">Clients Actifs</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Répartition par nature</h3>
                <RepartitionDossiersChart
                  items={[
                    { label: 'Import', value: stats?.dossiersImport || 0 },
                    { label: 'Export', value: stats?.dossiersExport || 0 },
                    { label: 'Transit', value: stats?.dossiersTransit || 0 },
                  ]}
                  height={190}
                />
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Top Clients</h3>
                {topClients.length === 0 ? <p className="text-gray-500 text-sm">Aucun client</p> : (
                  <div className="space-y-2">
                    {topClients.map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-surface-700">
                        <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">{i + 1}</span><span className="text-sm font-medium">{c.raisonSociale}</span></div>
                        <span className="text-sm font-bold text-primary-600">{canSeeMontants ? `${fmt(c.ca_total)} F` : MONTANT_MASQUE}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
