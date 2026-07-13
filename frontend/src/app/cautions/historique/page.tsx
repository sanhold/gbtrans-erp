'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { cautionsApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function CautionsHistoriquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    cautionsApi.list({ page, limit, etat: 'PAYEE' })
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, limit]);

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);
  const sommeMontant = items.reduce((s, c) => s + Number(c.montant || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/cautions" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Gestion des Cautions</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des Cautions</h1>
          <p className="text-sm text-gray-500">Cautions payées</p>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Id caution</th>
                <th className="table-header">Date caution</th>
                <th className="table-header">N°Dossier</th>
                <th className="table-header">N° BL</th>
                <th className="table-header">Client</th>
                <th className="table-header text-center">Qte</th>
                <th className="table-header text-right">Montant Caution</th>
                <th className="table-header">Compagnie</th>
                <th className="table-header">Date dépôt Courrier</th>
                <th className="table-header">Date Paiement</th>
                <th className="table-header">Observation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500">Aucune caution payée</td></tr>
              ) : items.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="Id caution">{c.numero}</td>
                  <td className="table-cell text-xs" data-label="Date caution">{fmtDate(c.dateCaution)}</td>
                  <td className="table-cell font-mono text-xs" data-label="N°Dossier">
                    {c.dossier ? <Link href={`/dossiers/${c.dossier.id}`} className="text-primary-600 hover:underline">{c.dossier.numeroPhysique || c.dossier.numero}</Link> : '-'}
                  </td>
                  <td className="table-cell font-mono text-xs" data-label="N° BL">{c.numeroBL || '-'}</td>
                  <td className="table-cell" data-label="Client">{c.client?.raisonSociale || '-'}</td>
                  <td className="table-cell text-center" data-label="Qte">{c.quantite}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant Caution">{fmt(c.montant)}</td>
                  <td className="table-cell" data-label="Compagnie">{c.compagnie || '-'}</td>
                  <td className="table-cell text-xs" data-label="Date dépôt Courrier">{fmtDate(c.dateDepotCourrier)}</td>
                  <td className="table-cell text-xs font-medium text-green-600" data-label="Date Paiement">{fmtDate(c.datePaiement)}</td>
                  <td className="table-cell text-xs max-w-[200px] truncate" data-label="Observation" title={c.observations || ''}>{c.observations || '-'}</td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-surface-600 font-semibold">
                  <td className="table-cell" colSpan={6}>Somme / Compteur (page)</td>
                  <td className="table-cell text-right font-mono">{fmt(sommeMontant)}</td>
                  <td className="table-cell" colSpan={4}>{total} caution(s) payée(s)</td>
                </tr>
              </tfoot>
            )}
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>
    </AppLayout>
  );
}
