'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { comptabiliteApi } from '@/lib/api';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function BalancePage() {
  const [exercices, setExercices] = useState<any[]>([]);
  const [exerciceId, setExerciceId] = useState('');
  const [lignes, setLignes] = useState<any[]>([]);
  const [totaux, setTotaux] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { comptabiliteApi.exercices().then(r => setExercices(r.data.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    comptabiliteApi.balance(exerciceId ? { exerciceId } : {})
      .then(r => { setLignes(r.data.data.lignes || []); setTotaux(r.data.data.totaux); })
      .catch(() => { setLignes([]); setTotaux(null); })
      .finally(() => setLoading(false));
  }, [exerciceId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link href="/comptabilite" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Comptabilité</Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Balance Générale</h1>
            <p className="text-sm text-gray-500">{lignes.length} compte(s)</p>
          </div>
          <select value={exerciceId} onChange={e => setExerciceId(e.target.value)} className="input-field w-40">
            <option value="">Tous exercices</option>
            {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
          </select>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Compte</th><th className="table-header">Libellé</th>
              <th className="table-header text-right">Total Débit</th><th className="table-header text-right">Total Crédit</th>
              <th className="table-header text-right">Solde Débiteur</th><th className="table-header text-right">Solde Créditeur</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : lignes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun mouvement</td></tr>
              ) : lignes.map((l: any) => (
                <tr key={l.compte} className="table-row">
                  <td className="table-cell font-mono font-medium text-primary-600" data-label="Compte">{l.compte}</td>
                  <td className="table-cell" data-label="Libellé">{l.libelle}</td>
                  <td className="table-cell text-right font-mono" data-label="Total Débit">{fmt(l.debit)}</td>
                  <td className="table-cell text-right font-mono" data-label="Total Crédit">{fmt(l.credit)}</td>
                  <td className="table-cell text-right font-mono font-medium text-green-600" data-label="Solde Débiteur">{l.soldeDebiteur > 0 ? fmt(l.soldeDebiteur) : ''}</td>
                  <td className="table-cell text-right font-mono font-medium text-red-600" data-label="Solde Créditeur">{l.soldeCrediteur > 0 ? fmt(l.soldeCrediteur) : ''}</td>
                </tr>
              ))}
            </tbody>
            {totaux && !loading && lignes.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 dark:bg-surface-700 font-bold">
                  <td className="table-cell" colSpan={2} data-label="">TOTAUX</td>
                  <td className="table-cell text-right font-mono" data-label="">{fmt(totaux.debit)}</td>
                  <td className="table-cell text-right font-mono" data-label="">{fmt(totaux.credit)}</td>
                  <td className="table-cell text-right font-mono text-green-600" data-label="">{fmt(totaux.soldeDebiteur)}</td>
                  <td className="table-cell text-right font-mono text-red-600" data-label="">{fmt(totaux.soldeCrediteur)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
