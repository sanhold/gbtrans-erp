'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, MODE_PAIEMENT_LABELS } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    financeApi.paiements.list({ page, limit: pageSize })
      .then(r => { setPaiements(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setPaiements([]))
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paiements</h1><p className="text-sm text-gray-500">Historique des paiements clients</p></div>

        <div className="card !py-3 !px-4 bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800 text-sm text-primary-800 dark:text-primary-300">
          Les paiements sont enregistrés depuis la fiche facture (bouton "Enregistrer un paiement"). <Link href="/facturation" className="font-semibold underline">Aller à la Facturation</Link>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Client</th><th className="table-header">Mode</th><th className="table-header">Facture(s)</th><th className="table-header text-right">Montant</th><th className="table-header">Statut</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : paiements.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun paiement enregistré</td></tr>
              : paiements.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="N°">{p.numero}</td>
                  <td className="table-cell text-xs" data-label="Date">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Client">{p.client?.raisonSociale || '-'}</td>
                  <td className="table-cell" data-label="Mode"><span className="badge badge-info">{MODE_PAIEMENT_LABELS[p.modePaiement] || p.modePaiement}</span></td>
                  <td className="table-cell text-xs" data-label="Facture(s)">{(p.affectations || []).map((a: any) => a.facture?.numero).join(', ') || '-'}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant">{fmt(p.montant)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${p.statut === 'VALIDE' ? 'badge-success' : 'badge-gray'}`}>{p.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />
        </div>
      </div>
    </AppLayout>
  );
}
