'use client';

import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Dossier affiché dans le panneau de droite (ordinateur) : le premier par défaut
  const selection = dossiers.find((d) => d.id === selectedId) || dossiers[0] || null;

  const progression = (d: any) => {
    const total = d.processus?._count?.etapes ?? 0;
    const validees = d._count?.etapesDossier ?? 0;
    if (!d.processusId || total === 0) return null;
    return { total, validees, pct: Math.round((validees / total) * 100) };
  };

  // Ordinateur : on affiche le détail à droite. Téléphone : on ouvre la page du dossier.
  const ouvrir = (d: any) => {
    if (window.matchMedia('(min-width: 1024px)').matches) setSelectedId(d.id);
    else router.push(`/dossiers/${d.id}`);
  };

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

        {/* Liste compacte (4 informations) + détail : à droite sur ordinateur, page dédiée sur téléphone */}
        <div className="lg:grid lg:grid-cols-[minmax(380px,460px)_1fr] lg:gap-4 lg:items-start">
          <div className="card !p-0 overflow-hidden">
            {loading ? (
              <ul aria-busy="true" className="divide-y divide-gray-100 dark:divide-surface-700">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="p-4 space-y-2 animate-pulse"><div className="h-4 w-1/3 bg-gray-200 dark:bg-surface-600 rounded" /><div className="h-3 w-2/3 bg-gray-100 dark:bg-surface-700 rounded" /></li>
                ))}
              </ul>
            ) : erreur ? (
              <ErrorState
                titre="Impossible de charger les dossiers"
                message="Le serveur ne répond pas pour le moment. Vérifiez votre connexion puis réessayez."
                onRetry={() => setRechargement((n) => n + 1)}
              />
            ) : dossiers.length === 0 ? (
              filtresActifs > 0 ? (
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
              )
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-surface-700">
                {dossiers.map((d) => {
                  const p = progression(d);
                  const actif = d.id === selection?.id;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => ouvrir(d)}
                        aria-current={actif ? 'true' : undefined}
                        className={`w-full text-left px-4 py-3.5 min-h-[72px] flex flex-col gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${actif ? 'lg:bg-primary-50 lg:dark:bg-primary-500/15 lg:shadow-[inset_3px_0_0_theme(colors.primary.600)]' : 'hover:bg-gray-50 dark:hover:bg-surface-700 active:bg-gray-100'}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-mono font-semibold text-[15px] text-primary-600 dark:text-primary-300 truncate">{d.numeroPhysique || d.numero}</span>
                          <span className={`badge ${statutColors[d.statut] || 'badge-gray'} flex-shrink-0`}>{statutLabels[d.statut] || d.statut}</span>
                        </span>
                        <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{d.client?.raisonSociale || '—'}</span>
                        {p && (
                          <span className="flex items-center gap-2" title={`${p.validees}/${p.total} étapes validées`}>
                            <span className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-surface-600 overflow-hidden">
                              <span className={`block h-full rounded-full ${p.pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${p.pct}%` }} />
                            </span>
                            <span className="text-[11px] text-gray-500 whitespace-nowrap">{p.validees}/{p.total} étapes</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
          </div>

          {/* Détail (ordinateur) */}
          <aside className="hidden lg:block card !p-0 sticky top-4" aria-label="Détail du dossier">
            {selection ? (() => {
              const d = selection;
              const p = progression(d);
              const ferme = STATUTS_DOSSIER_FERME.includes(d.statut);
              const champs: [string, React.ReactNode][] = [
                ['Client', d.client?.raisonSociale],
                ['Nature', natureLabels[d.nature] || d.nature],
                ['N° BL', d.numeroBL],
                ['Navire', d.navire],
                ['N° déclaration', d.numeroDeclaration],
                ['Valeur CAF', d.valeurCAF ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(d.valeurCAF))} FCFA` : null],
                ['Proformas', d._count?.proformas ?? 0],
                ['Factures', d._count?.factures ?? 0],
                ['Créé le', new Date(d.dateCreation).toLocaleDateString('fr-FR')],
                ['Processus', d.processus?.nom],
              ];
              return (
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{d.numeroPhysique || d.numero}</h2>
                      <p className="text-sm text-gray-500 truncate">{d.client?.raisonSociale}</p>
                    </div>
                    <span className={`badge ${statutColors[d.statut] || 'badge-gray'}`}>{statutLabels[d.statut] || d.statut}</span>
                  </div>
                  {p && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Avancement du processus</span><span>{p.validees} / {p.total} étapes</span></div>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-surface-600 overflow-hidden"><div className={`h-full rounded-full ${p.pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${p.pct}%` }} /></div>
                    </div>
                  )}
                  <dl className="grid grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-4 mt-6 text-sm">
                    {champs.map(([label, val]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</dt>
                        <dd className="text-gray-900 dark:text-white break-words">{val === null || val === undefined || val === '' ? '—' : val}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap gap-2 mt-7">
                    <Link href={`/dossiers/${d.id}`} className="btn-primary">Fiche complète</Link>
                    <Link href={`/dossiers/suivi/${d.id}`} className="btn-secondary">Suivi des étapes</Link>
                    {!ferme && <Link href={`/dossiers/${d.id}/edit`} className="btn-secondary">Modifier</Link>}
                  </div>
                </div>
              );
            })() : (
              <p className="p-10 text-center text-sm text-gray-400">Sélectionnez un dossier pour voir ses informations.</p>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
