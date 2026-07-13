'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, CREANCE_STATUTS_OUVERTS, CREANCE_STATUT_BADGE } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';

export default function DettesFournisseursPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { paged, page, setPage, pageSize, setPageSize, total: totalRows, totalPages } = usePagination(rows);

  useEffect(() => {
    financeApi.facturesFournisseurs.list({ limit: 200 })
      .then(r => setRows((r.data.data || []).filter((f: any) => CREANCE_STATUTS_OUVERTS.includes(f.statut) && Number(f.resteAPayer) > 0)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const total = rows.reduce((s, r) => s + Number(r.resteAPayer), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dettes Fournisseurs</h1><p className="text-sm text-gray-500">Factures fournisseurs validées et non soldées</p></div>

        <div className="card !py-3 !px-4 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
          Total des dettes fournisseurs : <span className="font-mono font-bold">{fmt(total)} XOF</span> — {rows.length} facture(s) ouverte(s)
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Fournisseur</th><th className="table-header">N° Facture</th><th className="table-header">Échéance</th><th className="table-header text-right">TTC</th><th className="table-header text-right">Payé</th><th className="table-header text-right">Reste à payer</th><th className="table-header">Statut</th><th className="table-header"></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucune dette ouverte</td></tr>
              : paged.map(f => (
                <tr key={f.id} className="table-row">
                  <td className="table-cell font-medium" data-label="Fournisseur">{f.fournisseur?.raisonSociale}</td>
                  <td className="table-cell font-mono text-primary-600" data-label="N° Facture">{f.numero}</td>
                  <td className="table-cell text-xs" data-label="Échéance">{new Date(f.dateEcheance).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono" data-label="TTC">{fmt(f.montantTTC)}</td>
                  <td className="table-cell text-right font-mono text-green-600" data-label="Payé">{fmt(f.montantPaye)}</td>
                  <td className="table-cell text-right font-mono font-semibold text-red-600" data-label="Reste à payer">{fmt(f.resteAPayer)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${CREANCE_STATUT_BADGE[f.statut] || 'badge-gray'}`}>{f.statut?.replace(/_/g, ' ')}</span></td>
                  <td className="table-cell" data-label="Actions"><Link href={`/facturation-fournisseurs/${f.id}`} className="btn-primary text-xs">Payer</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={totalRows} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </AppLayout>
  );
}
