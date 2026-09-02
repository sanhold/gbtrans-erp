'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { comptabiliteApi } from '@/lib/api';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function BilanPage() {
  const [exercices, setExercices] = useState<any[]>([]);
  const [exerciceId, setExerciceId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { comptabiliteApi.exercices().then(r => setExercices(r.data.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    comptabiliteApi.bilan(exerciceId ? { exerciceId } : {})
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [exerciceId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link href="/comptabilite" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Comptabilité</Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bilan & Compte de Résultat</h1>
            <p className="text-sm text-gray-500">SYSCOHADA Révisé</p>
          </div>
          <select value={exerciceId} onChange={e => setExerciceId(e.target.value)} className="input-field w-40">
            <option value="">Tous exercices</option>
            {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</div>
        ) : !data ? (
          <div className="card text-center py-12 text-gray-500">Aucune donnée</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Actif</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {data.bilan.actif.map((l: any) => (
                      <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700">
                        <td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td>
                        <td className="py-1.5">{l.libelle}</td>
                        <td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL ACTIF</td><td className="py-2 text-right font-mono">{fmt(data.bilan.totalActif)}</td></tr></tfoot>
                </table>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Passif</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {data.bilan.passif.map((l: any) => (
                      <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700">
                        <td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td>
                        <td className="py-1.5">{l.libelle}</td>
                        <td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-gray-100 dark:border-surface-700">
                      <td className="py-1.5 font-mono text-xs text-gray-500">—</td>
                      <td className="py-1.5 italic">Résultat net de l'exercice</td>
                      <td className={`py-1.5 text-right font-mono ${data.bilan.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.bilan.resultatNet)}</td>
                    </tr>
                  </tbody>
                  <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL PASSIF</td><td className="py-2 text-right font-mono">{fmt(data.bilan.totalPassif)}</td></tr></tfoot>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Charges</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {data.compteResultat.charges.map((l: any) => (
                      <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700">
                        <td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td>
                        <td className="py-1.5">{l.libelle}</td>
                        <td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL CHARGES</td><td className="py-2 text-right font-mono">{fmt(data.compteResultat.totalCharges)}</td></tr></tfoot>
                </table>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Produits</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {data.compteResultat.produits.map((l: any) => (
                      <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700">
                        <td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td>
                        <td className="py-1.5">{l.libelle}</td>
                        <td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL PRODUITS</td><td className="py-2 text-right font-mono">{fmt(data.compteResultat.totalProduits)}</td></tr></tfoot>
                </table>
              </div>
            </div>

            <div className="card !p-4 flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Résultat Net de l'exercice</span>
              <span className={`text-xl font-bold font-mono ${data.compteResultat.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.compteResultat.resultatNet)} XOF</span>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
