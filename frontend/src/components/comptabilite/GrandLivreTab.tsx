'use client';

import { useEffect, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import { fmt } from './comptaShared';

export default function GrandLivreTab({ exerciceId, origine }: { exerciceId: string; origine: 'AUTO' | 'MANUEL' }) {
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.grandLivre({ exerciceId, origine }).then(r => setComptes(r.data.data || [])).catch(() => setComptes([])).finally(() => setLoading(false));
  }, [exerciceId, origine]);

  const toggle = (id: string) => setOuverts(o => ({ ...o, [id]: !o[id] }));

  if (loading) return <div role="status" aria-label="Chargement" className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
  if (comptes.length === 0) return <div className="card text-center py-12 text-gray-500">Aucun mouvement</div>;

  return (
    <div className="space-y-3">
      {comptes.map((c: any) => (
        <div key={c.compte.id} className="card !p-0 overflow-hidden">
          <button onClick={() => toggle(c.compte.id)} aria-expanded={!!ouverts[c.compte.id]} className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-4 text-left hover:bg-gray-50 dark:hover:bg-surface-700 min-h-[44px]">
            <div className="flex items-center gap-3">
              <svg aria-hidden="true" className={`w-4 h-4 text-gray-500 transition-transform ${ouverts[c.compte.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="font-mono font-semibold text-primary-600">{c.compte.numero}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 text-left">{c.compte.libelle}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Débit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalDebit)}</span></span>
              <span className="text-gray-600 dark:text-gray-300">Crédit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalCredit)}</span></span>
              <span className={`font-mono font-bold ${c.solde >= 0 ? 'text-green-700' : 'text-red-600'}`}>Solde {fmt(Math.abs(c.solde))} {c.solde >= 0 ? 'D' : 'C'}</span>
            </div>
          </button>
          {ouverts[c.compte.id] && (
            <div className="table-container !shadow-none !border-0 !rounded-none border-t border-gray-200 dark:border-surface-700">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead><tr><th className="table-header !text-[10px] !px-1.5 truncate">Date</th><th className="table-header !text-[10px] !px-1.5 truncate">Journal</th><th className="table-header !text-[10px] !px-1.5 truncate">N° Écriture</th><th className="table-header !text-[10px] !px-1.5 truncate">Libellé</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Débit</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Crédit</th></tr></thead>
                <tbody>
                  {c.mouvements.map((m: any) => (
                    <tr key={m.id} className="table-row">
                      <td className="table-cell text-xs" data-label="Date">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                      <td className="table-cell col-opt" data-label="Journal">{m.journal}</td>
                      <td className="table-cell col-opt font-mono text-xs" data-label="N° Écriture">{m.numeroEcriture}</td>
                      <td className="table-cell" data-label="Libellé">{m.libelle}</td>
                      <td className="table-cell text-right font-mono" data-label="Débit">{Number(m.debit) > 0 ? fmt(m.debit) : ''}</td>
                      <td className="table-cell text-right font-mono" data-label="Crédit">{Number(m.credit) > 0 ? fmt(m.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

