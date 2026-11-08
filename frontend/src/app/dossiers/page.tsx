'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
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
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [rechargement, setRechargement] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  // Recherche globale du header : /dossiers?search=...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) { setSearch(q); setAppliedSearch(q); }
  }, []);

  useEffect(() => {
    setLoading(true);
    setErreur(false);
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
      .catch(() => { setDossiers([]); setErreur(true); })
      .finally(() => setLoading(false));
  }, [page, limit, filterNature, filterStatut, appliedSearch, sortOrder, dateDebut, dateFin, rechargement]);

  const filtresActifs = [filterNature, filterStatut, dateDebut, dateFin, appliedSearch].filter(Boolean).length;
  const reinitialiserFiltres = () => {
    setSearch(''); setAppliedSearch(''); setFilterNature(''); setFilterStatut(''); setDateDebut(''); setDateFin(''); setPage(1);
  };

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
          titre="Dossiers"
          sousTitre={`${total} dossier${total > 1 ? 's' : ''} au total`}
          actions={
            <>
              <Link href="/dossiers/historique" className="btn-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historique
              </Link>
              <Link href="/dossiers/nouveau" className="btn-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau dossier
              </Link>
            </>
          }
        />

        {/* Filtres : recherche toujours visible ; les autres filtres se replient sur téléphone */}
        <form onSubmit={handleSearch} className="card !p-3 space-y-3" role="search" aria-label="Rechercher un dossier">
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field flex-1 min-w-0"
              placeholder="N°, BL, client…"
              aria-label="Rechercher"
            />
            <button type="submit" className="btn-primary flex-shrink-0" aria-label="Rechercher">
              <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
              <span className="hidden sm:inline">Rechercher</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltresOuverts((v) => !v)}
              aria-expanded={filtresOuverts}
              className="btn-secondary flex-shrink-0 md:hidden"
            >
              Filtres{filtresActifs > 0 ? ` (${filtresActifs})` : ''}
            </button>
          </div>
          <div className={`${filtresOuverts ? 'grid' : 'hidden'} md:grid grid-cols-2 md:grid-cols-5 gap-2`}>
            <select value={filterNature} onChange={(e) => { setFilterNature(e.target.value); setPage(1); }} className="input-field" aria-label="Nature">
              <option value="">Nature</option>
              {Object.entries(natureLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={filterStatut} onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }} className="input-field" aria-label="Statut">
              <option value="">Statut</option>
              {STATUTS_DOSSIER.map((k) => (
                <option key={k} value={k}>{statutLabels[k]}</option>
              ))}
            </select>
            <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPage(1); }} className="input-field" aria-label="Période : du" title="Période : du" />
            <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPage(1); }} className="input-field" aria-label="Période : au" title="Période : au" />
            <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as 'desc' | 'asc'); setPage(1); }} className="input-field" aria-label="Tri">
              <option value="desc">Récents</option>
              <option value="asc">Anciens</option>
            </select>
          </div>
          {filtresActifs > 0 && (
            <button type="button" onClick={reinitialiserFiltres} className="btn-ghost btn-sm">Effacer les filtres</button>
          )}
        </form>

        {/* Tableau */}
        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '12%' }} />
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
                <th className="table-header !text-[10px] !px-2 truncate">Actions</th>
                <th className="table-header !text-[10px] !px-2 truncate">N° Dossier</th>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={13} />
              ) : erreur ? (
                <tr>
                  <td colSpan={13}>
                    <ErrorState titre="Impossible de charger les dossiers" onRetry={() => setRechargement((n) => n + 1)} />
                  </td>
                </tr>
              ) : dossiers.length === 0 ? (
                <tr>
                  <td colSpan={13}>
                    {filtresActifs > 0 ? (
                      <EmptyState
                        titre="Aucun dossier ne correspond"
                        description="Essayez d'élargir votre recherche ou d'effacer les filtres."
                        action={<button type="button" onClick={reinitialiserFiltres} className="btn-secondary">Effacer les filtres</button>}
                      />
                    ) : (
                      <EmptyState
                        titre="Aucun dossier pour le moment"
                        description="Créez votre premier dossier pour commencer le suivi d'une opération."
                        action={<Link href="/dossiers/nouveau" className="btn-primary">Nouveau dossier</Link>}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                dossiers.map((d) => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell !px-1 row-actions" data-label="Actions">
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
                    <td className="table-cell cell-title font-medium text-primary-600 !px-2 !text-[11px] truncate" data-label="N° Dossier" title={d.numeroPhysique || d.numero}>
                      <Link href={`/dossiers/${d.id}`} className="hover:underline block truncate">
                        {d.numeroPhysique || d.numero}
                      </Link>
                    </td>
                    <td className="table-cell !px-2 !text-[11px] truncate" data-label="Client" title={d.client?.raisonSociale}>{d.client?.raisonSociale}</td>
                    <td className="table-cell !px-2" data-label="Nature">
                      <span className="badge badge-info !text-[10px] !px-1.5 !py-0 truncate">{natureLabels[d.nature] || d.nature}</span>
                    </td>
                    <td className="table-cell font-mono !text-[10.5px] !px-2 truncate col-opt" data-label="BL" title={d.numeroBL || undefined}>{d.numeroBL || '-'}</td>
                    <td className="table-cell !px-2 !text-[11px] truncate col-opt" data-label="Navire" title={d.navire || undefined}>{d.navire || '-'}</td>
                    <td className="table-cell font-mono !text-[10.5px] !px-2 truncate col-opt" data-label="Déclaration" title={d.numeroDeclaration || undefined}>{d.numeroDeclaration || '-'}</td>
                    <td className="table-cell text-right font-mono !px-2 !text-[10.5px] truncate" data-label="Valeur CAF">
                      {d.valeurCAF
                        ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(d.valeurCAF))
                        : '-'}
                    </td>
                    <td className="table-cell text-center !px-1 col-opt" data-label="Proformas">
                      <span className="badge badge-gray !text-[10px] !px-1.5 !py-0">{d._count?.proformas ?? 0}</span>
                    </td>
                    <td className="table-cell text-center !px-1 col-opt" data-label="Factures">
                      <span className="badge badge-gray !text-[10px] !px-1.5 !py-0">{d._count?.factures ?? 0}</span>
                    </td>
                    <td className="table-cell !px-2" data-label="Statut">
                      <span className={`badge ${statutColors[d.statut] || 'badge-gray'} !text-[10px] !px-1.5 !py-0 truncate`}>
                        {statutLabels[d.statut] || d.statut}
                      </span>
                    </td>
                    <td className="table-cell !px-2 col-opt" data-label="Suivi">
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
                    <td className="table-cell cell-normal !text-[10.5px] !px-2 truncate" data-label="Date">
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
    </AppLayout>
  );
}
