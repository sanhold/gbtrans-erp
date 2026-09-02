'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { comptabiliteApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function JournauxPage() {
  const [journaux, setJournaux] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [journalId, setJournalId] = useState('');
  const [exerciceId, setExerciceId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    comptabiliteApi.journaux().then(r => setJournaux(r.data.data || [])).catch(() => {});
    comptabiliteApi.exercices().then(r => setExercices(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit };
    if (journalId) params.journalId = journalId;
    if (exerciceId) params.exerciceId = exerciceId;
    comptabiliteApi.ecritures(params)
      .then(r => { setEcritures(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setEcritures([]))
      .finally(() => setLoading(false));
  }, [journalId, exerciceId, page, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/comptabilite" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Comptabilité</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journaux Comptables</h1>
          <p className="text-sm text-gray-500">{total} écriture(s)</p>
        </div>

        <div className="card !p-4">
          <div className="flex flex-wrap gap-3">
            {journaux.map(j => (
              <button key={j.id} onClick={() => { setJournalId(journalId === j.id ? '' : j.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${journalId === j.id ? 'bg-primary-500 text-white border-primary-500' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-surface-700 dark:text-gray-300 dark:border-surface-600'}`}>
                {j.code} — {j.libelle}
              </button>
            ))}
            <select value={exerciceId} onChange={e => { setExerciceId(e.target.value); setPage(1); }} className="input-field w-40 ml-auto">
              <option value="">Tous exercices</option>
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Journal</th><th className="table-header">N° Écriture</th><th className="table-header">Date</th>
              <th className="table-header">Libellé</th><th className="table-header">Référence</th>
              <th className="table-header text-right">Débit</th><th className="table-header text-right">Crédit</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : ecritures.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucune écriture</td></tr>
              ) : ecritures.map(ec => (
                <Fragment key={ec.id}>
                  <tr className="bg-gray-50 dark:bg-surface-700/50">
                    <td className="table-cell font-semibold" data-label="Journal">{ec.journal?.code}</td>
                    <td className="table-cell font-mono text-xs font-semibold" data-label="N° Écriture" colSpan={2}>{ec.numero} — {new Date(ec.dateEcriture).toLocaleDateString('fr-FR')}</td>
                    <td className="table-cell font-medium" data-label="Libellé">{ec.libelle}</td>
                    <td className="table-cell text-xs" data-label="Référence">{ec.reference || '-'}</td>
                    <td className="table-cell text-right font-mono font-semibold" data-label="Débit">{fmt(ec.mouvements.reduce((s: number, m: any) => s + Number(m.debit), 0))}</td>
                    <td className="table-cell text-right font-mono font-semibold" data-label="Crédit">{fmt(ec.mouvements.reduce((s: number, m: any) => s + Number(m.credit), 0))}</td>
                  </tr>
                  {ec.mouvements.map((m: any) => (
                    <tr key={m.id} className="table-row">
                      <td className="table-cell" data-label="Journal"></td>
                      <td className="table-cell font-mono text-xs" data-label="Compte" colSpan={2}>{m.compte?.numero} — {m.compte?.libelle}</td>
                      <td className="table-cell text-xs text-gray-500" data-label="Libellé">{m.libelle}</td>
                      <td className="table-cell" data-label="Référence"></td>
                      <td className="table-cell text-right font-mono" data-label="Débit">{Number(m.debit) > 0 ? fmt(m.debit) : ''}</td>
                      <td className="table-cell text-right font-mono" data-label="Crédit">{Number(m.credit) > 0 ? fmt(m.credit) : ''}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={() => {}} />
        </div>
      </div>
    </AppLayout>
  );
}
