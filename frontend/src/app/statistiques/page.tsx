'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { dashboardApi } from '@/lib/api';

export default function StatistiquesPage() {
  const [stats, setStats] = useState<any>(null);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.stats(), dashboardApi.topClients(10)])
      .then(([s, c]) => { setStats(s.data.data); setTopClients(c.data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

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
          <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center"><p className="text-3xl font-bold text-primary-600">{stats?.totalDossiers || 0}</p><p className="text-sm text-gray-500 mt-1">Dossiers Total</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-green-600">{fmt(stats?.montantFacture || 0)}</p><p className="text-sm text-gray-500 mt-1">Chiffre d&apos;Affaires (XOF)</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-blue-600">{stats?.totalClients || 0}</p><p className="text-sm text-gray-500 mt-1">Clients Actifs</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Répartition par nature</h3>
                <div className="space-y-3">
                  {[{ label: 'Import', val: stats?.dossiersImport || 0, color: 'bg-blue-500' }, { label: 'Export', val: stats?.dossiersExport || 0, color: 'bg-green-500' }, { label: 'Transit', val: stats?.dossiersTransit || 0, color: 'bg-orange-500' }].map(i => (
                    <div key={i.label}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{i.label}</span><span className="font-bold">{i.val}</span></div>
                      <div className="w-full h-2 bg-gray-100 rounded-full"><div className={`h-full ${i.color} rounded-full`} style={{ width: `${(i.val / (stats?.totalDossiers || 1)) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Top Clients</h3>
                {topClients.length === 0 ? <p className="text-gray-500 text-sm">Aucun client</p> : (
                  <div className="space-y-2">
                    {topClients.map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-surface-700">
                        <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">{i + 1}</span><span className="text-sm font-medium">{c.raisonSociale}</span></div>
                        <span className="text-sm font-bold text-primary-600">{fmt(c.ca_total)} F</span>
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
