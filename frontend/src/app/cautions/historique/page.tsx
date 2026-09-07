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

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="table-header !text-[10px] !px-1.5 truncate">Id caution</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Date caution</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">N°Dossier</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">N° BL</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Client</th>
                <th className="table-header !text-[10px] !px-1.5 truncate text-center">Qte</th>
                <th className="table-header !text-[10px] !px-1.5 truncate text-right">Montant</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Compagnie</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Dépôt Courrier</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Paiement</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Observation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500">Aucune caution payée</td></tr>
              ) : items.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600 !px-1.5 !text-[11px] truncate" data-label="Id caution" title={c.numero}>{c.numero}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date caution">{fmtDate(c.dateCaution)}</td>
                  <td className="table-cell font-mono !text-[10.5px] !px-1.5 truncate" data-label="N°Dossier">
                    {c.dossier ? <Link href={`/dossiers/${c.dossier.id}`} className="text-primary-600 hover:underline">{c.dossier.numeroPhysique || c.dossier.numero}</Link> : '-'}
                  </td>
                  <td className="table-cell font-mono !text-[10.5px] !px-1.5 truncate" data-label="N° BL" title={c.numeroBL || undefined}>{c.numeroBL || '-'}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Client" title={c.client?.raisonSociale || undefined}>{c.client?.raisonSociale || '-'}</td>
                  <td className="table-cell text-center !px-1 !text-[10.5px]" data-label="Qte">{c.quantite}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Montant Caution">{fmt(c.montant)}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Compagnie" title={c.compagnie || undefined}>{c.compagnie || '-'}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date dépôt Courrier">{fmtDate(c.dateDepotCourrier)}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate font-medium text-green-600" data-label="Date Paiement">{fmtDate(c.datePaiement)}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Observation" title={c.observations || ''}>{c.observations || '-'}</td>
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
