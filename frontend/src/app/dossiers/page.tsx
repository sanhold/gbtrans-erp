'use client';

import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DossierActions from '@/components/dossiers/DossierActions';
import DataTable, { Colonne } from '@/components/tables/DataTable';
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
  const [panneauOuvert, setPanneauOuvert] = useState(false);
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

  useEffect(() => {
    if (!panneauOuvert) return;
    const fermer = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanneauOuvert(false); };
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [panneauOuvert]);

  const montant = (v: any) => (v ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(v)) : '');

  // Colonnes du tableau (ordinateur)
  const colonnes: Colonne<any>[] = [
    { cle: 'numero', libelle: 'N° dossier', mono: true, texte: (d) => d.numeroPhysique || d.numero, rendu: (d) => <span className="font-semibold text-primary-600 dark:text-primary-300">{d.numeroPhysique || d.numero}</span> },
    { cle: 'client', libelle: 'Client', texte: (d) => d.client?.raisonSociale || '', rendu: (d) => <span className="block max-w-[14rem] truncate text-gray-900 dark:text-white" title={d.client?.raisonSociale}>{d.client?.raisonSociale || '—'}</span> },
    { cle: 'nature', libelle: 'Nature', texte: (d) => natureLabels[d.nature] || d.nature || '', rendu: (d) => <span className="badge badge-info">{natureLabels[d.nature] || d.nature}</span> },
    { cle: 'bl', libelle: 'N° BL', mono: true, masquerSous: 'xl', texte: (d) => d.numeroBL || '', rendu: (d) => d.numeroBL || <span className="text-gray-300">—</span> },
    { cle: 'navire', libelle: 'Navire', masquerSous: '2xl', texte: (d) => d.navire || '', rendu: (d) => <span className="block max-w-[10rem] truncate">{d.navire || <span className="text-gray-300">—</span>}</span> },
    { cle: 'declaration', libelle: 'Déclaration', mono: true, masquerSous: '2xl', texte: (d) => d.numeroDeclaration || '', rendu: (d) => d.numeroDeclaration || <span className="text-gray-300">—</span> },
    { cle: 'caf', libelle: 'Valeur CAF', align: 'right', mono: true, masquerSous: 'xl', texte: (d) => montant(d.valeurCAF), rendu: (d) => montant(d.valeurCAF) || <span className="text-gray-300">—</span> },
    { cle: 'docs', libelle: 'Prof. / Fact.', align: 'center', masquerSous: 'xl', texte: (d) => `${d._count?.proformas ?? 0} / ${d._count?.factures ?? 0}`, rendu: (d) => <span className="text-gray-600 dark:text-gray-300">{d._count?.proformas ?? 0} / {d._count?.factures ?? 0}</span> },
    { cle: 'statut', libelle: 'Statut', texte: (d) => statutLabels[d.statut] || d.statut, rendu: (d) => <span className={`badge ${statutColors[d.statut] || 'badge-gray'}`}>{statutLabels[d.statut] || d.statut}</span> },
    { cle: 'suivi', libelle: 'Suivi', texte: (d) => { const p = progression(d); return p ? `${p.validees}/${p.total}` : ''; }, rendu: (d) => {
      const p = progression(d);
      if (!p) return <span className="text-gray-300">—</span>;
      return (
        <div className="flex items-center gap-2 min-w-[7rem]" title={`${p.validees}/${p.total} étapes validées`}>
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-surface-600 overflow-hidden"><div className={`h-full rounded-full ${p.pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${p.pct}%` }} /></div>
          <span className="text-xs text-gray-500 tabular-nums">{p.validees}/{p.total}</span>
        </div>
      );
    } },
    { cle: 'date', libelle: 'Créé le', texte: (d) => new Date(d.dateCreation).toLocaleDateString('fr-FR'), rendu: (d) => <span className="text-gray-500">{new Date(d.dateCreation).toLocaleDateString('fr-FR')}</span> },
  ];

  // Dossier affiché dans le panneau de détail (ordinateur)
  const selection = dossiers.find((d) => d.id === selectedId) || null;
  const GRILLE = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3';

  const progression = (d: any) => {
    const total = d.processus?._count?.etapes ?? 0;
    const validees = d._count?.etapesDossier ?? 0;
    if (!d.processusId || total === 0) return null;
    return { total, validees, pct: Math.round((validees / total) * 100) };
  };

  // Ordinateur : le détail glisse depuis la droite. Téléphone : on ouvre la page du dossier.
  const ouvrir = (d: any) => {
    if (window.matchMedia('(min-width: 1024px)').matches) { setSelectedId(d.id); setPanneauOuvert(true); }
    else router.push(`/dossiers/${d.id}`);
  };

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Dossiers"
          sousTitre={`${total} dossier${total > 1 ? 's' : ''} au total`}
          actions={
            <>
              <Link href="/dossiers/historique" className="btn-secondary" aria-label="Historique" title="Historique">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Historique</span>
              </Link>
              <Link href="/dossiers/nouveau" className="btn-primary hidden lg:inline-flex">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau dossier
              </Link>
            </>
          }
        />

        {/* Filtres : recherche toujours visible ; les autres filtres se replient sur téléphone */}
        <form onSubmit={handleSearch} className="card !p-2 sm:!p-3 space-y-2 sm:space-y-3" role="search" aria-label="Rechercher un dossier">
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
        <div>
          <div>
            {loading ? (
              <ul aria-busy="true" className={`${GRILLE} lg:hidden`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="card !p-4 space-y-3 animate-pulse"><div className="h-4 w-1/2 bg-gray-200 dark:bg-surface-600 rounded" /><div className="h-3 w-3/4 bg-gray-100 dark:bg-surface-700 rounded" /><div className="h-1.5 w-full bg-gray-100 dark:bg-surface-700 rounded" /></li>
                ))}
              </ul>
            ) : erreur ? (
              <div className="card"><ErrorState
                titre="Impossible de charger les dossiers"
                message="Le serveur ne répond pas pour le moment. Vérifiez votre connexion puis réessayez."
                onRetry={() => setRechargement((n) => n + 1)}
              /></div>
            ) : dossiers.length === 0 ? (
              <div className="card lg:hidden">{filtresActifs > 0 ? (
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
              )}</div>
            ) : (
              <ul className={`${GRILLE} lg:hidden`}>
                {dossiers.map((d) => {
                  const p = progression(d);
                  const actif = d.id === selection?.id && panneauOuvert;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => ouvrir(d)}
                        aria-current={actif ? 'true' : undefined}
                        className={`relative w-full h-full text-left px-3 py-2.5 sm:p-4 flex flex-col gap-0.5 sm:gap-2 overflow-hidden rounded-xl sm:rounded-2xl border bg-white dark:bg-surface-800 shadow-sm transition-all hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${actif ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 dark:border-surface-700'}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-mono font-semibold text-[14px] sm:text-[15px] text-primary-600 dark:text-primary-300 truncate">{d.numeroPhysique || d.numero}</span>
                          <span className={`badge ${statutColors[d.statut] || 'badge-gray'} flex-shrink-0 !text-[10px] sm:!text-[11px] !px-2 !py-0.5`}>{statutLabels[d.statut] || d.statut}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2 text-[13px] sm:text-sm">
                          <span className="text-gray-800 dark:text-gray-100 truncate">{d.client?.raisonSociale || '—'}</span>
                          {p && <span className="text-[11px] text-gray-500 whitespace-nowrap flex-shrink-0" title={`${p.validees}/${p.total} étapes validées`}>{p.validees}/{p.total}</span>}
                        </span>
                        {p && (
                          <span className="absolute inset-x-0 bottom-0 h-[3px] sm:static sm:h-1.5 sm:mt-1 sm:rounded-full bg-gray-200 dark:bg-surface-600 overflow-hidden" aria-hidden="true">
                            <span className={`block h-full sm:rounded-full ${p.pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${p.pct}%` }} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!erreur && (
              <div className="hidden lg:block">
                <DataTable
                  colonnes={colonnes}
                  lignes={dossiers}
                  cleLigne={(d) => d.id}
                  onClicLigne={ouvrir}
                  idSelectionne={panneauOuvert ? selectedId : null}
                  chargement={loading}
                  nomExport="dossiers"
                  vide={
                    filtresActifs > 0 ? (
                      <EmptyState titre="Aucun dossier ne correspond" description="Essayez d'élargir votre recherche ou d'effacer les filtres." action={<button type="button" onClick={reinitialiserFiltres} className="btn-secondary">Effacer les filtres</button>} />
                    ) : (
                      <EmptyState titre="Aucun dossier pour le moment" description="Créez votre premier dossier pour commencer le suivi d'une opération." action={<Link href="/dossiers/nouveau" className="btn-primary">Nouveau dossier</Link>} />
                    )
                  }
                  actions={(d) => (
                    <>
                      <Link href={`/dossiers/${d.id}`} title="Voir la fiche" aria-label="Voir la fiche" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </Link>
                      {!STATUTS_DOSSIER_FERME.includes(d.statut) && (
                        <Link href={`/dossiers/${d.id}/edit`} title="Modifier" aria-label="Modifier" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Link>
                      )}
                    </>
                  )}
                />
              </div>
            )}
            <div className="card !p-0 mt-4 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} /></div>
          </div>

          {/* Détail (ordinateur) */}
          {panneauOuvert && selection && (
          <div className="hidden lg:block fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Détail du dossier">
            <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setPanneauOuvert(false)} />
          <aside className="absolute right-0 top-0 h-full w-[520px] max-w-full bg-white dark:bg-surface-800 shadow-2xl overflow-y-auto animate-slide-in">
            <button type="button" onClick={() => setPanneauOuvert(false)} aria-label="Fermer" className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-surface-700 flex items-center justify-center text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {(() => {
              const d = selection;
              const p = progression(d);
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
                <div className="p-6 pt-12">
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
                  <dl className="grid grid-cols-2 gap-x-5 gap-y-4 mt-6 text-sm">
                    {champs.map(([label, val]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</dt>
                        <dd className="text-gray-900 dark:text-white break-words">{val === null || val === undefined || val === '' ? '—' : val}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-7 pt-5 border-t border-gray-100 dark:border-surface-700">
                    <DossierActions dossier={d} onChange={() => setRechargement((n) => n + 1)} onDeleted={() => { setPanneauOuvert(false); setSelectedId(null); setRechargement((n) => n + 1); }} />
                  </div>
                </div>
              );
            })()}
          </aside>
          </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
