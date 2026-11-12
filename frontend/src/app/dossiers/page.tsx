'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
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
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const nbFiltres = [filterNature, filterStatut, dateDebut && dateFin, sortOrder !== 'desc'].filter(Boolean).length;

  // Recherche globale du header : /dossiers?search=...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) { setSearch(q); setAppliedSearch(q); }
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit, sortBy: 'dateCreation', sortOrder };
    if (appliedSearch) params.search = appliedSearch;
    if (filterNature) params.nature = filterNature;
    if (filterStatut) params.statut = filterStatut;
    if (dateDebut && dateFin) {
      params.dateDebut = `${dateDebut}T00:00:00.000Z`;
      params.dateFin = `${dateFin}T23:59:59.999Z`;
    }

    dossiersApi.list(params)
      .then((response) => {
        setDossiers(response.data.data);
        setTotal(response.data.pagination.total);
      })
      .catch(() => setDossiers([]))
      .finally(() => setLoading(false));
  }, [page, limit, filterNature, filterStatut, appliedSearch, sortOrder, dateDebut, dateFin]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Dossiers"
          subtitle={`${total} au total`}
          secondaryActions={[{ label: 'Historique', href: '/dossiers/historique' }]}
          actions={
            <Link href="/dossiers/nouveau" className="btn-primary hidden lg:inline-flex">
              <svg aria-hidden="true" className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau dossier
            </Link>
          }
        />

        <form onSubmit={handleSearch} className="card !p-3 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field flex-1" placeholder="N°, BL, client..." aria-label="Rechercher un dossier" />
            <button type="button" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters} className="btn-secondary lg:hidden">
              Filtres{nbFiltres ? ` (${nbFiltres})` : ''}
            </button>
            <button type="submit" className="btn-primary">Rechercher</button>
          </div>
          <div className={`grid grid-cols-2 lg:grid-cols-5 gap-2 ${showFilters ? '' : 'max-lg:hidden'}`}>
            <select value={filterNature} onChange={(e) => { setFilterNature(e.target.value); setPage(1); }} className="input-field" aria-label="Nature">
              <option value="">Nature</option>
              {Object.entries(natureLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterStatut} onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }} className="input-field" aria-label="Statut">
              <option value="">Statut</option>
              {STATUTS_DOSSIER.map((k) => <option key={k} value={k}>{statutLabels[k]}</option>)}
            </select>
            <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as 'desc' | 'asc'); setPage(1); }} className="input-field" aria-label="Tri">
              <option value="desc">Récent</option>
              <option value="asc">Ancien</option>
            </select>
            <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPage(1); }} className="input-field" title="Période : du" aria-label="Période : du" />
            <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPage(1); }} className="input-field" title="Période : au" aria-label="Période : au" />
          </div>
        </form>

        {/* Tableau */}
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Actions</th>
                <th className="table-header">N° Dossier</th>
                <th className="table-header">Client</th>
                <th className="table-header">Nature</th>
                <th className="table-header">BL</th>
                <th className="table-header">Navire</th>
                <th className="table-header">Déclaration</th>
                <th className="table-header">Valeur CAF</th>
                <th className="table-header text-center">Prof.</th>
                <th className="table-header text-center">Fact.</th>
                <th className="table-header">Statut</th>
                <th className="table-header">Suivi</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={13} />
              ) : dossiers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-600">
                    <p className="mb-3">{appliedSearch || nbFiltres ? 'Aucun dossier ne correspond à ces critères.' : 'Aucun dossier pour le moment.'}</p>
                    <Link href="/dossiers/nouveau" className="btn-primary">Créer un dossier</Link>
                  </td>
                </tr>
              ) : (
                dossiers.map((d) => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell" data-label="Actions">
                      <div className="flex gap-1">
                        <Link
                          href={`/dossiers/${d.id}`}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded hover:bg-gray-100 dark:hover:bg-surface-700"
                          title="Voir" aria-label={`Voir le dossier ${d.numeroPhysique || d.numero}`}
                        >
                          <svg aria-hidden="true" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        {!STATUTS_DOSSIER_FERME.includes(d.statut) && (
                          <Link
                            href={`/dossiers/${d.id}/edit`}
                            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded hover:bg-gray-100 dark:hover:bg-surface-700"
                            title="Modifier" aria-label={`Modifier le dossier ${d.numeroPhysique || d.numero}`}
                          >
                            <svg aria-hidden="true" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="table-cell font-medium text-primary-600" data-label="N° Dossier" title={d.numeroPhysique || d.numero}>
                      <Link href={`/dossiers/${d.id}`} className="hover:underline block truncate">
                        {d.numeroPhysique || d.numero}
                      </Link>
                    </td>
                    <td className="table-cell" data-label="Client" title={d.client?.raisonSociale}>{d.client?.raisonSociale}</td>
                    <td className="table-cell" data-label="Nature">
                      <span className="badge badge-info">{natureLabels[d.nature] || d.nature}</span>
                    </td>
                    <td className="table-cell font-mono" data-label="BL" title={d.numeroBL || undefined}>{d.numeroBL || '-'}</td>
                    <td className="table-cell col-opt" data-label="Navire" title={d.navire || undefined}>{d.navire || '-'}</td>
                    <td className="table-cell font-mono col-opt" data-label="Déclaration" title={d.numeroDeclaration || undefined}>{d.numeroDeclaration || '-'}</td>
                    <td className="table-cell text-right font-mono" data-label="Valeur CAF">
                      {d.valeurCAF
                        ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(d.valeurCAF))
                        : '-'}
                    </td>
                    <td className="table-cell text-center col-opt" data-label="Proformas">
                      <span className="badge badge-gray">{d._count?.proformas ?? 0}</span>
                    </td>
                    <td className="table-cell text-center col-opt" data-label="Factures">
                      <span className="badge badge-gray">{d._count?.factures ?? 0}</span>
                    </td>
                    <td className="table-cell" data-label="Statut">
                      <span className={`badge ${statutColors[d.statut] || 'badge-gray'}`}>
                        {statutLabels[d.statut] || d.statut}
                      </span>
                    </td>
                    <td className="table-cell" data-label="Suivi">
                      {(() => {
                        const totalEtapes = d.processus?._count?.etapes ?? 0;
                        const validees = d._count?.etapesDossier ?? 0;
                        if (!d.processusId || totalEtapes === 0) return <span className="text-xs text-gray-500">-</span>;
                        const pct = Math.round((validees / totalEtapes) * 100);
                        return (
                          <div className="flex items-center gap-1.5" title={`${validees}/${totalEtapes} étapes validées`}>
                            <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-surface-600 overflow-hidden flex-shrink-0">
                              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 whitespace-nowrap">{validees}/{totalEtapes}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="table-cell col-opt" data-label="Date">
                      {new Date(d.dateCreation).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>
      <FAB label="Nouveau dossier" href="/dossiers/nouveau" />
    </AppLayout>
  );
}
