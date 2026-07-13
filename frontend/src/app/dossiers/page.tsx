'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  NOUVEAU: 'badge-info',
  EN_COURS: 'badge-warning',
  ATTENTE_CLIENT: 'badge-gray',
  ATTENTE_DOUANE: 'badge-gray',
  LIQUIDATION: 'badge-warning',
  PAIEMENT: 'badge-info',
  MAIN_LEVEE: 'badge-info',
  LIVRAISON: 'badge-success',
  CLOTURE: 'badge-success',
  ANNULE: 'badge-danger',
  ARCHIVE: 'badge-gray',
};

const statutLabels: Record<string, string> = {
  NOUVEAU: 'Nouveau',
  EN_COURS: 'En cours',
  ATTENTE_CLIENT: 'Att. Client',
  ATTENTE_DOUANE: 'Att. Douane',
  LIQUIDATION: 'Liquidation',
  PAIEMENT: 'Paiement',
  MAIN_LEVEE: 'Main levée',
  LIVRAISON: 'Livraison',
  CLOTURE: 'Clôturé',
  ANNULE: 'Annulé',
  ARCHIVE: 'Archivé',
};

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
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dossiers</h1>
            <p className="text-sm text-gray-500">{total} dossier(s) au total</p>
          </div>
          <Link href="/dossiers/nouveau" className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Dossier
          </Link>
        </div>

        {/* Filtres */}
        <div className="card !p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="label">Recherche</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                placeholder="N° dossier, BL, déclaration, client..."
              />
            </div>
            <div>
              <label className="label">Nature</label>
              <select
                value={filterNature}
                onChange={(e) => { setFilterNature(e.target.value); setPage(1); }}
                className="input-field w-40"
              >
                <option value="">Toutes</option>
                {Object.entries(natureLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Statut</label>
              <select
                value={filterStatut}
                onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
                className="input-field w-40"
              >
                <option value="">Tous</option>
                {Object.entries(statutLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Trier par date</label>
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as 'desc' | 'asc'); setPage(1); }}
                className="input-field w-48"
              >
                <option value="desc">Plus récent d&apos;abord</option>
                <option value="asc">Plus ancien d&apos;abord</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">Rechercher</button>
          </form>
        </div>

        {/* Tableau */}
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">N° Dossier</th>
                <th className="table-header">N° Physique</th>
                <th className="table-header">Client</th>
                <th className="table-header">Nature</th>
                <th className="table-header">BL</th>
                <th className="table-header">Navire</th>
                <th className="table-header">Déclaration</th>
                <th className="table-header">Valeur CAF</th>
                <th className="table-header text-center">Proformas</th>
                <th className="table-header text-center">Factures</th>
                <th className="table-header">Statut</th>
                <th className="table-header">Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
                    Chargement...
                  </td>
                </tr>
              ) : dossiers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-500">
                    Aucun dossier trouvé
                  </td>
                </tr>
              ) : (
                dossiers.map((d) => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell font-medium text-primary-600" data-label="N° Dossier">
                      <Link href={`/dossiers/${d.id}`} className="hover:underline">
                        {d.numero}
                      </Link>
                    </td>
                    <td className="table-cell font-mono text-xs" data-label="N° Physique">{d.numeroPhysique || '-'}</td>
                    <td className="table-cell" data-label="Client">{d.client?.raisonSociale}</td>
                    <td className="table-cell" data-label="Nature">
                      <span className="badge badge-info">{natureLabels[d.nature] || d.nature}</span>
                    </td>
                    <td className="table-cell font-mono text-xs" data-label="BL">{d.numeroBL || '-'}</td>
                    <td className="table-cell" data-label="Navire">{d.navire || '-'}</td>
                    <td className="table-cell font-mono text-xs" data-label="Déclaration">{d.numeroDeclaration || '-'}</td>
                    <td className="table-cell text-right font-mono" data-label="Valeur CAF">
                      {d.valeurCAF
                        ? new Intl.NumberFormat('fr-FR').format(Number(d.valeurCAF))
                        : '-'}
                    </td>
                    <td className="table-cell text-center" data-label="Proformas">
                      <span className="badge badge-gray">{d._count?.proformas ?? 0}</span>
                    </td>
                    <td className="table-cell text-center" data-label="Factures">
                      <span className="badge badge-gray">{d._count?.factures ?? 0}</span>
                    </td>
                    <td className="table-cell" data-label="Statut">
                      <span className={`badge ${statutColors[d.statut] || 'badge-gray'}`}>
                        {statutLabels[d.statut] || d.statut}
                      </span>
                    </td>
                    <td className="table-cell text-xs" data-label="Date">
                      {new Date(d.dateCreation).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="table-cell" data-label="Actions">
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
                        {!['CLOTURE', 'ANNULE', 'ARCHIVE'].includes(d.statut) && (
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
