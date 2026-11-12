'use client';

import { useEffect, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import { fmt } from './comptaShared';

export default function BilanTab({ exerciceId }: { exerciceId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.bilan({ exerciceId }).then(r => setData(r.data.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [exerciceId]);

  if (loading) return <div role="status" aria-label="Chargement" className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
  if (!data) return <div className="card text-center py-12 text-gray-500">Aucune donnée</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Actif</h3>
          <table className="w-full text-sm">
            <tbody>
              {data.bilan.actif.map((l: any) => (
                <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700">
                  <td className="py-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
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
                  <td className="py-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
                </tr>
              ))}
              <tr className="border-b border-gray-100 dark:border-surface-700">
                <td className="py-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">—</td><td className="py-1.5 italic">Résultat net de l&apos;exercice</td>
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
                <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700"><td className="py-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td></tr>
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
                <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700"><td className="py-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL PRODUITS</td><td className="py-2 text-right font-mono">{fmt(data.compteResultat.totalProduits)}</td></tr></tfoot>
          </table>
        </div>
      </div>
      <div className="card !p-4 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Résultat Net de l&apos;exercice</span>
        <span className={`text-xl font-bold font-mono ${data.compteResultat.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.compteResultat.resultatNet)} XOF</span>
      </div>
    </div>
  );
}

