'use client';

import { useEffect, useState } from 'react';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { comptabiliteApi } from '@/lib/api';
import { fmt } from './comptaShared';

export default function BalanceTab({ exerciceId, origine }: { exerciceId: string; origine: 'AUTO' | 'MANUEL' }) {
  const [lignes, setLignes] = useState<any[]>([]);
  const [totaux, setTotaux] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.balance({ exerciceId, origine }).then(r => { setLignes(r.data.data.lignes || []); setTotaux(r.data.data.totaux); }).catch(() => { setLignes([]); setTotaux(null); }).finally(() => setLoading(false));
  }, [exerciceId, origine]);

  return (
    <div className="table-container">
      <table className="w-full table-fixed">
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
        </colgroup>
        <thead><tr>
          <th className="table-header !text-[10px] !px-1.5 truncate">Compte</th><th className="table-header !text-[10px] !px-1.5 truncate">Libellé</th>
          <th className="table-header !text-[10px] !px-1.5 truncate text-right">Total Débit</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Total Crédit</th>
          <th className="table-header !text-[10px] !px-1.5 truncate text-right">Solde Débiteur</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Solde Créditeur</th>
        </tr></thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={6} />
          ) : lignes.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun mouvement</td></tr>
          ) : lignes.map((l: any) => (
            <tr key={l.compte} className="table-row">
              <td className="table-cell font-mono font-medium text-primary-600" data-label="Compte">{l.compte}</td>
              <td className="table-cell" data-label="Libellé">{l.libelle}</td>
              <td className="table-cell col-opt text-right font-mono" data-label="Total Débit">{fmt(l.debit)}</td>
              <td className="table-cell col-opt text-right font-mono" data-label="Total Crédit">{fmt(l.credit)}</td>
              <td className="table-cell text-right font-mono font-medium text-green-700" data-label="Solde Débiteur">{l.soldeDebiteur > 0 ? fmt(l.soldeDebiteur) : ''}</td>
              <td className="table-cell text-right font-mono font-medium text-red-600" data-label="Solde Créditeur">{l.soldeCrediteur > 0 ? fmt(l.soldeCrediteur) : ''}</td>
            </tr>
          ))}
        </tbody>
        {totaux && !loading && lignes.length > 0 && (
          <tfoot className="max-md:hidden">
            <tr className="bg-gray-100 dark:bg-surface-700 font-bold">
              <td className="table-cell" colSpan={2}>TOTAUX</td>
              <td className="table-cell text-right font-mono">{fmt(totaux.debit)}</td>
              <td className="table-cell text-right font-mono">{fmt(totaux.credit)}</td>
              <td className="table-cell text-right font-mono text-green-600">{fmt(totaux.soldeDebiteur)}</td>
              <td className="table-cell text-right font-mono text-red-600">{fmt(totaux.soldeCrediteur)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {totaux && !loading && lignes.length > 0 && (
        <dl className="md:hidden card !p-3 grid grid-cols-2 gap-2 text-sm font-semibold">
          <dt>Total débit</dt><dd className="text-right font-mono">{fmt(totaux.debit)}</dd>
          <dt>Total crédit</dt><dd className="text-right font-mono">{fmt(totaux.credit)}</dd>
          <dt>Solde débiteur</dt><dd className="text-right font-mono text-green-700">{fmt(totaux.soldeDebiteur)}</dd>
          <dt>Solde créditeur</dt><dd className="text-right font-mono text-red-600">{fmt(totaux.soldeCrediteur)}</dd>
        </dl>
      )}
    </div>
  );
}

