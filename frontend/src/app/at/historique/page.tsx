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
        <div>
          <Link href="/at" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Admissions Temporaires</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique AT</h1>
          <p className="text-sm text-gray-500">Admissions temporaires apurées</p>
        </div>

        <div className="card !p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="label">Recherche</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="N° AT, désignation, déclarant..." />
            </div>
            <button type="submit" className="btn-primary">Afficher</button>
          </form>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Id. AT</th>
                <th className="table-header">Date Création</th>
                <th className="table-header">N° Dossier</th>
                <th className="table-header">Client</th>
                <th className="table-header">Designation</th>
                <th className="table-header">Declarant</th>
                <th className="table-header">Date Échéance</th>
                <th className="table-header text-right">Montant Garantie</th>
                <th className="table-header">Date Apurement</th>
                <th className="table-header text-right">Montant Apuré</th>
                <th className="table-header">Réf. Apurement</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500">Aucune AT apurée</td></tr>
              ) : items.map(at => (
                <tr key={at.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="Id. AT">{at.numero}</td>
                  <td className="table-cell text-xs" data-label="Date Création">{fmtDate(at.dateCreation)}</td>
                  <td className="table-cell font-mono text-xs" data-label="N° Dossier">
                    {at.dossiers?.[0] ? <Link href={`/dossiers/${at.dossiers[0].id}`} className="text-primary-600 hover:underline">{at.dossiers[0].numero}</Link> : '-'}
                  </td>
                  <td className="table-cell" data-label="Client">{at.client?.raisonSociale || '-'}</td>
                  <td className="table-cell" data-label="Designation">{at.designation}</td>
                  <td className="table-cell" data-label="Declarant">{at.declarant || '-'}</td>
                  <td className="table-cell text-xs" data-label="Date Échéance">{fmtDate(at.dateExpiration)}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant Garantie">{fmt(at.montantCaution)}</td>
                  <td className="table-cell text-xs" data-label="Date Apurement">{fmtDate(at.dateApurement)}</td>
                  <td className="table-cell text-right font-mono text-green-600" data-label="Montant Apuré">{fmt(at.montantApure)}</td>
                  <td className="table-cell font-mono text-xs" data-label="Réf. Apurement">{at.referenceApurement || '-'}</td>
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
