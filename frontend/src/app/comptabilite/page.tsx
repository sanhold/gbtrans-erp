'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function ComptabilitePage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comptabilité</h1><p className="text-sm text-gray-500">SYSCOHADA Révisé - Plan comptable OHADA</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { titre: 'Journaux', desc: 'Achats, Ventes, Banque, Caisse, OD', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'blue' },
            { titre: 'Grand Livre', desc: 'Comptes détaillés avec mouvements', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', color: 'green' },
            { titre: 'Balance', desc: 'Balance générale et auxiliaire', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', color: 'purple' },
            { titre: 'Bilan & CR', desc: 'Bilan et compte de résultat OHADA', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'orange' },
          ].map(item => (
            <div key={item.titre} className="card hover:shadow-elevated cursor-pointer transition-all group">
              <div className={`w-12 h-12 rounded-xl bg-${item.color}-50 flex items-center justify-center mb-4`}>
                <svg className={`w-6 h-6 text-${item.color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{item.titre}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Exercices Comptables</h3>
          <div className="table-container !shadow-none !border-0">
            <table className="w-full">
              <thead><tr><th className="table-header">Code</th><th className="table-header">Libellé</th><th className="table-header">Début</th><th className="table-header">Fin</th><th className="table-header">Statut</th></tr></thead>
              <tbody>
                <tr className="table-row"><td className="table-cell font-medium" data-label="Code">2026</td><td className="table-cell" data-label="Libellé">Exercice 2026</td><td className="table-cell" data-label="Début">01/01/2026</td><td className="table-cell" data-label="Fin">31/12/2026</td><td className="table-cell" data-label="Statut"><span className="badge badge-success">Actif</span></td></tr>
                <tr className="table-row"><td className="table-cell font-medium" data-label="Code">2025</td><td className="table-cell" data-label="Libellé">Exercice 2025</td><td className="table-cell" data-label="Début">01/01/2025</td><td className="table-cell" data-label="Fin">31/12/2025</td><td className="table-cell" data-label="Statut"><span className="badge badge-success">Actif</span></td></tr>
                <tr className="table-row"><td className="table-cell font-medium" data-label="Code">2024</td><td className="table-cell" data-label="Libellé">Exercice 2024</td><td className="table-cell" data-label="Début">01/01/2024</td><td className="table-cell" data-label="Fin">31/12/2024</td><td className="table-cell" data-label="Statut"><span className="badge badge-success">Actif</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
