'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { atApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function ATHistoriquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params: any = { page, limit, etat: 'APURE' };
    if (appliedSearch) params.search = appliedSearch;
    atApi.list(params)
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, limit, appliedSearch]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="card !p-3 overflow-x-auto">
          <form onSubmit={handleSearch} className="flex flex-nowrap items-center gap-2 min-w-max">
            <div className="flex-shrink-0 mr-1">
              <Link href="/at" className="text-[10px] text-primary-600 hover:underline block">← Admissions Temporaires</Link>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Historique AT</h1>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field !py-1.5 text-xs w-56 flex-shrink-0" placeholder="N° AT, désignation, déclarant..." />
            <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0">Afficher</button>
          </form>
        </div>

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="table-header !text-[10px] !px-1.5 truncate">Id. AT</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Date Créat.</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">N° Dossier</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Client</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Designation</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Declarant</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Échéance</th>
                <th className="table-header !text-[10px] !px-1.5 truncate text-right">Garantie</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Apurement</th>
                <th className="table-header !text-[10px] !px-1.5 truncate text-right">Mt. Apuré</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Réf. Apur.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500">Aucune AT apurée</td></tr>
              ) : items.map(at => (
                <tr key={at.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600 !px-1.5 !text-[11px] truncate" data-label="Id. AT" title={at.numero}>{at.numero}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date Création">{fmtDate(at.dateCreation)}</td>
                  <td className="table-cell font-mono !text-[10.5px] !px-1.5 truncate" data-label="N° Dossier">
                    {at.dossiers?.[0] ? <Link href={`/dossiers/${at.dossiers[0].id}`} className="text-primary-600 hover:underline">{at.dossiers[0].numero}</Link> : '-'}
                  </td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Client" title={at.client?.raisonSociale || undefined}>{at.client?.raisonSociale || '-'}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Designation" title={at.designation}>{at.designation}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Declarant" title={at.declarant || undefined}>{at.declarant || '-'}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date Échéance">{fmtDate(at.dateExpiration)}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Montant Garantie">{fmt(at.montantCaution)}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date Apurement">{fmtDate(at.dateApurement)}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate text-green-600" data-label="Montant Apuré">{fmt(at.montantApure)}</td>
                  <td className="table-cell font-mono !text-[10.5px] !px-1.5 truncate" data-label="Réf. Apurement" title={at.referenceApurement || undefined}>{at.referenceApurement || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-surface-700">
            <span className="text-xs text-gray-500">Compteur : {total}</span>
          </div>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>
    </AppLayout>
  );
}
