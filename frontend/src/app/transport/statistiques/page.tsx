'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { statistiquesTransportApi } from '@/lib/api';
import { GraphifyChart } from '@/components/charts';
import type { GraphifyData } from '@/types/graphify';
import PageHeader from '@/components/ui/PageHeader';

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
        <PageHeader title="Statistiques Transport" subtitle="Activité, véhicules et chauffeurs" />
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px] sm:flex-none"><label className="label !text-xs" htmlFor="st-debut">Du</label><input id="st-debut" type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field sm:!w-44" /></div>
          <div className="flex-1 min-w-[140px] sm:flex-none"><label className="label !text-xs" htmlFor="st-fin">Au</label><input id="st-fin" type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field sm:!w-44" /></div>
          <button type="submit" className="btn-secondary">Filtrer</button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : !stats ? (
          <p className="text-gray-600">Aucune donnée disponible</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="card text-center !p-3 sm:!p-6"><p className="text-xl sm:text-3xl font-bold text-primary-600">{stats.global.nbCourses}</p><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Courses</p></div>
              <div className="card text-center !p-3 sm:!p-6"><p className="text-xl sm:text-3xl font-bold text-green-600">{fmt(stats.global.chiffreAffaires)}</p><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Chiffre d&apos;affaires</p></div>
              <div className="card text-center !p-3 sm:!p-6"><p className="text-xl sm:text-3xl font-bold text-red-500">{fmt(stats.global.depensesTotales)}</p><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Dépenses</p></div>
              <div className="card text-center !p-3 sm:!p-6"><p className={`text-xl sm:text-3xl font-bold ${stats.global.resultatNet >= 0 ? 'text-accent-600' : 'text-red-600'}`}>{fmt(stats.global.resultatNet)}</p><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Résultat net</p></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(STATUT_LABEL).map(([k, label]) => (
                <div key={k} className="card text-center !py-3"><p className="text-xl font-bold text-gray-700 dark:text-gray-200">{stats.global.nbCoursesParStatut[k] || 0}</p><p className="text-xs text-gray-600 dark:text-gray-400">{label}</p></div>
              ))}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Évolution mensuelle</h3>
              {(stats.evolutionMensuelle || []).length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-8">Aucune donnée disponible pour cette période.</p>
              ) : <GraphifyChart type="bar" data={evolutionData} config={{ height: 260, yAxisFormatter: fmt, tooltipFormatter: fmt }} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Par véhicule</h3>
                <div className="table-container">
                  <table className="w-full text-sm">
                    <thead><tr><th className="table-header">Véhicule</th><th className="table-header text-right">Courses</th><th className="table-header text-right">CA</th><th className="table-header text-right">Résultat</th></tr></thead>
                    <tbody>
                      {stats.vehicules.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-gray-600 py-4">Aucune donnée</td></tr>
                      ) : stats.vehicules.map((v: any) => (
                        <tr key={v.id} className="table-row">
                          <td className="table-cell font-medium" data-label="Véhicule">{v.immatriculation}</td>
                          <td className="table-cell text-right" data-label="Courses">{v.nbCourses}</td>
                          <td className="table-cell text-right" data-label="CA">{fmt(v.chiffreAffaires)}</td>
                          <td className={`table-cell text-right font-semibold ${v.resultat >= 0 ? 'text-accent-600' : 'text-red-600'}`} data-label="Résultat">{fmt(v.resultat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Par chauffeur</h3>
                <div className="table-container">
                  <table className="w-full text-sm">
                    <thead><tr><th className="table-header">Chauffeur</th><th className="table-header text-right">Courses</th><th className="table-header text-right">CA</th><th className="table-header text-right">Résultat</th></tr></thead>
                    <tbody>
                      {stats.chauffeurs.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-gray-600 py-4">Aucune donnée</td></tr>
                      ) : stats.chauffeurs.map((c: any) => (
                        <tr key={c.id} className="table-row">
                          <td className="table-cell font-medium" data-label="Chauffeur">{c.prenom} {c.nom}</td>
                          <td className="table-cell text-right" data-label="Courses">{c.nbCourses}</td>
                          <td className="table-cell text-right" data-label="CA">{fmt(c.chiffreAffaires)}</td>
                          <td className={`table-cell text-right font-semibold ${c.resultat >= 0 ? 'text-accent-600' : 'text-red-600'}`} data-label="Résultat">{fmt(c.resultat)}</td>
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
