'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import { statutColors, statutLabels, STATUTS_DOSSIER, STATUTS_DOSSIER_FERME } from '@/lib/dossierStatut';

const natureLabels: Record<string, string> = {
  IMPORT: 'Import',
  EXPORT: 'Export',
  TRANSIT: 'Transit',
  REEXPORT: 'Réexport',
  CABOTAGE: 'Cabotage',
  TRANSBORDEMENT: 'Transbordement',
};

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterNature, setFilterNature] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit, sortBy: 'dateCreation', sortOrder };
    if (appliedSearch) params.search = appliedSearch;
    if (filterNature) params.nature = filterNature;
    if (filterStatut) params.statut = filterStatut;

    dossiersApi.list(params)
      .then((response) => {
        setDossiers(response.data.data);
        setTotal(response.data.pagination.total);
      })
      .catch(() => setDossiers([]))
      .finally(() => setLoading(false));
  }, [page, limit, filterNature, filterStatut, appliedSearch, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* En-tête + Filtres */}
        <div className="card !p-3 overflow-x-auto">
          <form onSubmit={handleSearch} className="flex flex-nowrap items-center gap-2 min-w-max">
            <div className="flex-shrink-0 mr-1">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Dossiers</h1>
              <p className="text-[10px] text-gray-500 whitespace-nowrap">{total} au total</p>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field !py-1.5 text-xs w-36 flex-shrink-0"
              placeholder="N°, BL, client..."
            />
            <select
              value={filterNature}
              onChange={(e) => { setFilterNature(e.target.value); setPage(1); }}
              className="input-field !py-1.5 text-xs w-24 flex-shrink-0"
            >
              <option value="">Nature</option>
              {Object.entries(natureLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
              className="input-field !py-1.5 text-xs w-24 flex-shrink-0"
            >
              <option value="">Statut</option>
              {STATUTS_DOSSIER.map((k) => (
                <option key={k} value={k}>{statutLabels[k]}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as 'desc' | 'asc'); setPage(1); }}
              className="input-field !py-1.5 text-xs w-28 flex-shrink-0"
            >
              <option value="desc">Récent</option>
              <option value="asc">Ancien</option>
            </select>
            <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0">Rechercher</button>
            <Link href="/dossiers/historique" className="btn-secondary !px-3 !py-1.5 text-xs flex-shrink-0">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Historique
            </Link>
            <Link href="/dossiers/nouveau" className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau Dossier
            </Link>
          </form>
        </div>

        {/* Tableau */}
        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="table-header !text-[10px] !px-2 truncate">N° Dossier</th>
                <th className="table-header !text-[10px] !px-2 truncate">N° Physique</th>
                <th className="table-header !text-[10px] !px-2 truncate">Client</th>
                <th className="table-header !text-[10px] !px-2 truncate">Nature</th>
                <th className="table-header !text-[10px] !px-2 truncate">BL</th>
                <th className="table-header !text-[10px] !px-2 truncate">Navire</th>
                <th className="table-header !text-[10px] !px-2 truncate">Déclaration</th>
                <th className="table-header !text-[10px] !px-2 truncate">Valeur CAF</th>
                <th className="table-header !text-[10px] !px-1 truncate text-center">Prof.</th>
                <th className="table-header !text-[10px] !px-1 truncate text-center">Fact.</th>
                <th className="table-header !text-[10px] !px-2 truncate">Statut</th>
                <th className="table-header !text-[10px] !px-2 truncate">Suivi</th>
                <th className="table-header !text-[10px] !px-2 truncate">Date</th>
                <th className="table-header !text-[10px] !px-2 truncate">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
                    Chargement...
                  </td>
                </tr>
              ) : dossiers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-gray-500">
                    Aucun dossier trouvé
                  </td>
                </tr>
              ) : (
                dossiers.map((d) => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell font-medium text-primary-600 !px-2 !text-[11px] truncate" data-label="N° Dossier" title={d.numero}>
                      <Link href={`/dossiers/${d.id}`} className="hover:underline block truncate">
                        {d.numero}
                      </Link>
                    </td>
                    <td className="table-cell font-mono !text-[10.5px] !px-2 truncate" data-label="N° Physique" title={d.numeroPhysique || undefined}>{d.numeroPhysique || '-'}</td>
                    <td className="table-cell !px-2 !text-[11px] truncate" data-label="Client" title={d.client?.raisonSociale}>{d.client?.raisonSociale}</td>
                    <td className="table-cell !px-2" data-label="Nature">
                      <span className="badge badge-info !text-[10px] !px-1.5 !py-0 truncate">{natureLabels[d.nature] || d.nature}</span>
                    </td>
                    <td className="table-cell font-mono !text-[10.5px] !px-2 truncate" data-label="BL" title={d.numeroBL || undefined}>{d.numeroBL || '-'}</td>
                    <td className="table-cell !px-2 !text-[11px] truncate" data-label="Navire" title={d.navire || undefined}>{d.navire || '-'}</td>
                    <td className="table-cell font-mono !text-[10.5px] !px-2 truncate" data-label="Déclaration" title={d.numeroDeclaration || undefined}>{d.numeroDeclaration || '-'}</td>
                    <td className="table-cell text-right font-mono !px-2 !text-[10.5px] truncate" data-label="Valeur CAF">
                      {d.valeurCAF
                        ? new Intl.NumberFormat('fr-FR').format(Number(d.valeurCAF))
                        : '-'}
                    </td>
                    <td className="table-cell text-center !px-1" data-label="Proformas">
                      <span className="badge badge-gray !text-[10px] !px-1.5 !py-0">{d._count?.proformas ?? 0}</span>
                    </td>
                    <td className="table-cell text-center !px-1" data-label="Factures">
                      <span className="badge badge-gray !text-[10px] !px-1.5 !py-0">{d._count?.factures ?? 0}</span>
                    </td>
                    <td className="table-cell !px-2" data-label="Statut">
                      <span className={`badge ${statutColors[d.statut] || 'badge-gray'} !text-[10px] !px-1.5 !py-0 truncate`}>
                        {statutLabels[d.statut] || d.statut}
                      </span>
                    </td>
                    <td className="table-cell !px-2" data-label="Suivi">
                      {(() => {
                        const totalEtapes = d.processus?._count?.etapes ?? 0;
                        const validees = d._count?.etapesDossier ?? 0;
                        if (!d.processusId || totalEtapes === 0) return <span className="text-[10px] text-gray-400">-</span>;
                        const pct = Math.round((validees / totalEtapes) * 100);
                        return (
                          <div className="flex items-center gap-1.5" title={`${validees}/${totalEtapes} étapes validées`}>
                            <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-surface-600 overflow-hidden flex-shrink-0">
                              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">{validees}/{totalEtapes}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="table-cell !text-[10.5px] !px-2 truncate" data-label="Date">
                      {new Date(d.dateCreation).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="table-cell !px-1" data-label="Actions">
                      <div className="flex gap-1">
                        <Link
                          href={`/dossiers/${d.id}`}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"
                          title="Voir"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        {!STATUTS_DOSSIER_FERME.includes(d.statut) && (
                          <Link
                            href={`/dossiers/${d.id}/edit`}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>
    </AppLayout>
  );
}
