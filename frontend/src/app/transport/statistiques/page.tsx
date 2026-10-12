'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { statistiquesTransportApi } from '@/lib/api';
import { GraphifyChart } from '@/components/charts';
import type { GraphifyData } from '@/types/graphify';

const STATUT_LABEL: Record<string, string> = { PLANIFIEE: 'Planifiées', EN_COURS: 'En cours', TERMINEE: 'Terminées', ANNULEE: 'Annulées' };
const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const fmt = (n: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} F`;
const moisLabel = (cle: string) => { const [a, m] = cle.split('-'); return `${MOIS_LABELS[parseInt(m, 10) - 1]} ${a}`; };

export default function StatistiquesTransportPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const load = () => {
    setLoading(true);
    statistiquesTransportApi.get({ dateDebut: dateDebut || undefined, dateFin: dateFin || undefined })
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const evolutionData: GraphifyData = {
    labels: (stats?.evolutionMensuelle || []).map((m: any) => moisLabel(m.mois)),
    series: [
      { label: 'Chiffre d\'affaires', color: '#345c80', data: (stats?.evolutionMensuelle || []).map((m: any) => m.chiffreAffaires) },
      { label: 'Dépenses', color: '#e05252', data: (stats?.evolutionMensuelle || []).map((m: any) => m.depenses) },
      { label: 'Résultat', color: '#00b884', data: (stats?.evolutionMensuelle || []).map((m: any) => m.resultat) },
    ],
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistiques Transport</h1>
            <p className="text-sm text-gray-500">Activité, véhicules et chauffeurs</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field !w-40 text-sm" />
            <span className="text-gray-400">→</span>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field !w-40 text-sm" />
            <button onClick={load} className="btn-secondary text-sm">Filtrer</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : !stats ? (
          <p className="text-gray-500">Aucune donnée disponible</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card text-center"><p className="text-3xl font-bold text-primary-600">{stats.global.nbCourses}</p><p className="text-sm text-gray-500 mt-1">Courses</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-green-600">{fmt(stats.global.chiffreAffaires)}</p><p className="text-sm text-gray-500 mt-1">Chiffre d&apos;affaires</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-red-500">{fmt(stats.global.depensesTotales)}</p><p className="text-sm text-gray-500 mt-1">Dépenses</p></div>
              <div className={`card text-center`}><p className={`text-3xl font-bold ${stats.global.resultatNet >= 0 ? 'text-accent-600' : 'text-red-600'}`}>{fmt(stats.global.resultatNet)}</p><p className="text-sm text-gray-500 mt-1">Résultat net</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {Object.entries(STATUT_LABEL).map(([k, label]) => (
                <div key={k} className="card text-center !py-3"><p className="text-xl font-bold text-gray-700 dark:text-gray-200">{stats.global.nbCoursesParStatut[k] || 0}</p><p className="text-xs text-gray-500">{label}</p></div>
              ))}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Évolution mensuelle</h3>
              {(stats.evolutionMensuelle || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aucune donnée disponible pour cette période.</p>
              ) : <GraphifyChart type="bar" data={evolutionData} config={{ height: 260, yAxisFormatter: fmt, tooltipFormatter: fmt }} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Par véhicule</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-500"><th className="py-1">Véhicule</th><th className="text-right">Courses</th><th className="text-right">CA</th><th className="text-right">Résultat</th></tr></thead>
                    <tbody>
                      {stats.vehicules.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-gray-400 py-4">Aucune donnée</td></tr>
                      ) : stats.vehicules.map((v: any) => (
                        <tr key={v.id} className="border-t border-gray-100 dark:border-surface-700">
                          <td className="py-1.5 font-medium">{v.immatriculation}</td>
                          <td className="text-right">{v.nbCourses}</td>
                          <td className="text-right">{fmt(v.chiffreAffaires)}</td>
                          <td className={`text-right font-semibold ${v.resultat >= 0 ? 'text-accent-600' : 'text-red-600'}`}>{fmt(v.resultat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Par chauffeur</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-500"><th className="py-1">Chauffeur</th><th className="text-right">Courses</th><th className="text-right">CA</th><th className="text-right">Résultat</th></tr></thead>
                    <tbody>
                      {stats.chauffeurs.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-gray-400 py-4">Aucune donnée</td></tr>
                      ) : stats.chauffeurs.map((c: any) => (
                        <tr key={c.id} className="border-t border-gray-100 dark:border-surface-700">
                          <td className="py-1.5 font-medium">{c.prenom} {c.nom}</td>
                          <td className="text-right">{c.nbCourses}</td>
                          <td className="text-right">{fmt(c.chiffreAffaires)}</td>
                          <td className={`text-right font-semibold ${c.resultat >= 0 ? 'text-accent-600' : 'text-red-600'}`}>{fmt(c.resultat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
