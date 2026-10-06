'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { platformApi } from '@/lib/platformApi';
import toast from 'react-hot-toast';

const fmt = (n: any) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0))} FCFA`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function AdminTresoreriePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.tresorerie().then(r => setData(r.data.data)).catch(() => toast.error('Erreur de chargement')).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminShell><div className="text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div></AdminShell>;
  if (!data) return <AdminShell><p className="text-gray-500">Aucune donnée</p></AdminShell>;

  const cartes = [
    { label: 'CA total encaissé', valeur: fmt(data.caTotalEncaisse), sub: `${data.nbPaiementsReussis} paiement(s) réussi(s)`, couleur: 'text-primary-600' },
    { label: 'Revenu mensuel récurrent (MRR)', valeur: fmt(data.mrr), sub: 'Abonnements actifs ramenés au mois', couleur: 'text-accent-600' },
    { label: 'Abonnements actifs', valeur: String(data.nbAbonnementsActifs), sub: `${data.nbEnEssai} en essai · ${data.nbImpayes} impayé(s)`, couleur: 'text-gray-900 dark:text-white' },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trésorerie SaaS</h1>
          <p className="text-sm text-gray-500">Revenus toutes sociétés clientes confondues</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cartes.map(c => (
            <div key={c.label} className="card">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-2xl font-extrabold ${c.couleur}`}>{c.valeur}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Répartition des abonnements par formule</h3>
          {data.repartitionParPlan.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun abonnement</p>
          ) : (
            <div className="space-y-2">
              {data.repartitionParPlan.map((p: any) => (
                <div key={p.plan} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{p.plan}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{p.nbAbonnements}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Derniers paiements réussis</h3>
          {data.paiementsRecents.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun paiement</p>
          ) : (
            <div className="table-container !shadow-none !border-0">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">Société</th>
                  <th className="table-header">Formule</th>
                  <th className="table-header text-right">Montant</th>
                  <th className="table-header">Date</th>
                </tr></thead>
                <tbody>
                  {data.paiementsRecents.map((p: any) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell font-medium" data-label="Société">{p.societe?.raisonSociale}</td>
                      <td className="table-cell" data-label="Formule">{p.abonnement?.plan?.nom || '-'}</td>
                      <td className="table-cell text-right font-mono" data-label="Montant">{fmt(p.montant)}</td>
                      <td className="table-cell text-xs" data-label="Date">{fmtDate(p.datePaiement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
