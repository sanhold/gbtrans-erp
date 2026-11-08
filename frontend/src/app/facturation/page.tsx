'use client';

import PageHeader from '@/components/ui/PageHeader';
import SlidePanel from '@/components/ui/SlidePanel';
import EmptyState from '@/components/ui/EmptyState';
import FactureActions, { telechargerFacturePDF } from '@/components/facturation/FactureActions';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import DataTable, { Colonne } from '@/components/tables/DataTable';
import PaginationControls from '@/components/tables/PaginationControls';
import api, { facturesApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  PARTIELLEMENT_PAYEE: 'badge-warning', PAYEE: 'badge-success',
  EN_RETARD: 'badge-danger', ANNULEE: 'badge-danger', CONTENTIEUX: 'badge-danger',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

export default function FacturationPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'factures' | 'attente'>('factures');
  const [factures, setFactures] = useState<any[]>([]);
  const [proformasAttente, setProformasAttente] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [transforming, setTransforming] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const selection = factures.find((f) => f.id === selectedId) || null;

  const loadFactures = async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        facturesApi.list({ page, limit, search: search || undefined }),
        facturesApi.stats(),
      ]);
      setFactures(res.data.data);
      setTotal(res.data.pagination.total);
      setStats(statsRes.data.data);
    } catch { setFactures([]); }
    finally { setLoading(false); }
  };

  const loadProformasAttente = async () => {
    try {
      const res = await api.get('/proformas/en-attente');
      setProformasAttente(res.data.data || []);
    } catch { setProformasAttente([]); }
  };

  useEffect(() => { loadFactures(); }, [page, limit]);
  useEffect(() => { loadProformasAttente(); }, []);

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const handleTransformer = async (proformaId: string) => {
    setTransforming(proformaId);
    try {
      const res = await api.post(`/proformas/${proformaId}/transformer-facture`);
      toast.success(res.data.message);
      loadFactures();
      loadProformasAttente();
      setTab('factures');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setTransforming(null); }
  };

  const colonnes: Colonne<any>[] = [
    { cle: 'numero', libelle: 'N° facture', mono: true, texte: (f) => f.numero, rendu: (f) => <span className="font-semibold text-primary-600 dark:text-primary-300">{f.numero}</span> },
    { cle: 'normalise', libelle: 'N° normalisé', mono: true, masquerSous: '2xl', texte: (f) => f.numeroNormalise || '', rendu: (f) => f.numeroNormalise || <span className="text-gray-300">—</span> },
    { cle: 'client', libelle: 'Client', texte: (f) => f.client?.raisonSociale || '', rendu: (f) => <span className="block max-w-[15rem] truncate text-gray-900 dark:text-white" title={f.client?.raisonSociale}>{f.client?.raisonSociale || '—'}</span> },
    { cle: 'dossier', libelle: 'Dossier', mono: true, masquerSous: 'xl', texte: (f) => f.dossier?.numeroPhysique || f.dossier?.numero || '', rendu: (f) => f.dossier?.numeroPhysique || f.dossier?.numero || <span className="text-gray-300">—</span> },
    { cle: 'ttc', libelle: 'Total TTC', align: 'right', mono: true, texte: (f) => fmt(f.montantTTC), rendu: (f) => <span className="font-semibold text-gray-900 dark:text-white">{fmt(f.montantTTC)}</span> },
    { cle: 'paye', libelle: 'Payé', align: 'right', mono: true, masquerSous: 'xl', texte: (f) => fmt(f.montantPaye), rendu: (f) => <span className="text-green-600">{fmt(f.montantPaye)}</span> },
    { cle: 'reste', libelle: 'Reste', align: 'right', mono: true, texte: (f) => fmt(f.resteAPayer), rendu: (f) => <span className={Number(f.resteAPayer) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{fmt(f.resteAPayer)}</span> },
    { cle: 'statut', libelle: 'Statut', texte: (f) => (f.statut || '').replace(/_/g, ' '), rendu: (f) => <span className={`badge ${statutColors[f.statut] || 'badge-gray'}`}>{f.statut?.replace(/_/g, ' ')}</span> },
    { cle: 'date', libelle: 'Date', texte: (f) => new Date(f.dateFacture).toLocaleDateString('fr-FR'), rendu: (f) => <span className="text-gray-500">{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</span> },
  ];

  // Ordinateur : le détail glisse depuis la droite. Téléphone : on ouvre la fiche de la facture.
  const ouvrir = (f: any) => {
    if (window.matchMedia('(min-width: 1024px)').matches) { setSelectedId(f.id); setPanneauOuvert(true); }
    else router.push(`/facturation/${f.id}`);
  };

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Facturation"
          sousTitre={`${total} facture(s) — ${proformasAttente.length} proforma(s) en attente`}
          actions={<Link href="/facturation/nouveau" className="btn-primary hidden lg:inline-flex">+ Nouvelle facture</Link>}
        />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">Facturé</p><p className="text-sm font-bold">{fmt(Number(stats.totalFacture))} F</p></div></div>
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">Encaissé</p><p className="text-sm font-bold text-green-600">{fmt(Number(stats.totalEncaisse))} F</p></div></div>
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">Impayé</p><p className="text-sm font-bold text-red-600">{fmt(Number(stats.totalImpaye))} F</p></div></div>
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">En attente</p><p className="text-sm font-bold text-amber-600">{proformasAttente.length} proformas</p></div></div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-fit">
          <button onClick={() => setTab('factures')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'factures' ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600'}`}>
            Factures ({total})
          </button>
          <button onClick={() => setTab('attente')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'attente' ? 'bg-white dark:bg-surface-800 shadow text-amber-600' : 'text-gray-600'}`}>
            En attente de facturation ({proformasAttente.length})
          </button>
        </div>

        {/* Tab Factures */}
        {tab === 'factures' && (
          <div>
            {loading ? (
              <ul aria-busy="true" className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="card !p-3 space-y-2 animate-pulse"><div className="h-4 w-1/2 bg-gray-200 dark:bg-surface-600 rounded" /><div className="h-3 w-3/4 bg-gray-100 dark:bg-surface-700 rounded" /></li>
                ))}
              </ul>
            ) : factures.length === 0 ? (
              <div className="card lg:hidden"><EmptyState titre="Aucune facture" description="Créez une facture ou facturez une proforma validée." action={<Link href="/facturation/nouveau" className="btn-primary">Nouvelle facture</Link>} /></div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:hidden">
                {factures.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => ouvrir(f)}
                      className={`w-full h-full text-left px-3 py-2.5 sm:p-4 flex flex-col gap-0.5 sm:gap-2 rounded-xl sm:rounded-2xl border bg-white dark:bg-surface-800 shadow-sm transition-all hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${panneauOuvert && f.id === selectedId ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 dark:border-surface-700'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-[14px] sm:text-[15px] text-primary-600 dark:text-primary-300 truncate">{f.numero}</span>
                        <span className={`badge ${statutColors[f.statut] || 'badge-gray'} flex-shrink-0 !text-[10px] sm:!text-[11px] !px-2 !py-0.5`}>{f.statut?.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2 text-[13px] sm:text-sm">
                        <span className="text-gray-800 dark:text-gray-100 truncate">{f.client?.raisonSociale || '—'}</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap flex-shrink-0">{fmt(f.montantTTC)} F</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="hidden lg:block">
              <DataTable
                colonnes={colonnes}
                lignes={factures}
                cleLigne={(f) => f.id}
                onClicLigne={ouvrir}
                idSelectionne={panneauOuvert ? selectedId : null}
                chargement={loading}
                nomExport="factures"
                vide={<EmptyState titre="Aucune facture" description="Créez une facture ou facturez une proforma validée." action={<Link href="/facturation/nouveau" className="btn-primary">Nouvelle facture</Link>} />}
                actions={(f) => (
                  <>
                    <Link href={`/facturation/${f.id}`} title="Voir la fiche" aria-label="Voir la fiche" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </Link>
                    <button type="button" onClick={() => telechargerFacturePDF(f.id)} title="Télécharger le PDF" aria-label="Télécharger le PDF" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-surface-700 text-red-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                  </>
                )}
              />
            </div>
            <div className="card !p-0 mt-3 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} /></div>
          </div>
        )}

        {/* Tab Proformas en attente */}
        {tab === 'attente' && (
          <div className="space-y-3">
            {proformasAttente.length === 0 ? (
              <div className="card text-center py-8 text-gray-500">Aucune proforma en attente de facturation. Validez une proforma pour qu&apos;elle apparaisse ici.</div>
            ) : proformasAttente.map(p => (
              <div key={p.id} className="card !p-4 flex items-center justify-between hover:shadow-elevated transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold font-mono text-primary-600">{p.numero}</span>
                    <span className="badge badge-warning">En attente</span>
                    {p.dossier && <span className="text-xs text-gray-500">Dossier: {p.dossier.numeroPhysique || p.dossier.numero}</span>}
                  </div>
                  <p className="text-sm">{p.client?.raisonSociale}</p>
                  {p.titre && <p className="text-xs text-gray-500 mt-0.5">{p.titre}</p>}
                  <p className="text-sm font-bold mt-1">{fmt(Number(p.montantTTC))} F CFA — {p.lignes?.length || 0} ligne(s)</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/proformas/${p.id}`} className="btn-secondary text-xs">Voir</Link>
                  <button onClick={() => handleTransformer(p.id)} disabled={transforming === p.id} className="btn-primary text-xs disabled:opacity-50">
                    {transforming === p.id ? 'Transformation...' : 'Facturer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}


        <SlidePanel open={panneauOuvert && !!selection} onClose={() => setPanneauOuvert(false)} label="Détail de la facture">
          {selection && (() => {
            const f = selection;
            const champs: [string, React.ReactNode][] = [
              ['Client', f.client?.raisonSociale],
              ['Dossier', f.dossier?.numeroPhysique || f.dossier?.numero],
              ['N° normalisé', f.numeroNormalise],
              ['Date', new Date(f.dateFacture).toLocaleDateString('fr-FR')],
              ['Total TTC', `${fmt(f.montantTTC)} F`],
              ['Payé', `${fmt(f.montantPaye)} F`],
              ['Reste à payer', `${fmt(f.resteAPayer)} F`],
              ['Issue d\'une proforma', f.proformaSourceId ? 'Oui' : 'Non'],
            ];
            return (
              <div className="p-6 pt-12">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold font-mono text-gray-900 dark:text-white truncate">{f.numero}</h2>
                    <p className="text-sm text-gray-500 truncate">{f.client?.raisonSociale}</p>
                  </div>
                  <span className={`badge ${statutColors[f.statut] || 'badge-gray'}`}>{f.statut?.replace(/_/g, ' ')}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-4 mt-6 text-sm">
                  {champs.map(([label, val]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</dt>
                      <dd className="text-gray-900 dark:text-white break-words">{val === null || val === undefined || val === '' ? '—' : val}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-7 pt-5 border-t border-gray-100 dark:border-surface-700">
                  <FactureActions facture={f} onChange={loadFactures} />
                </div>
              </div>
            );
          })()}
        </SlidePanel>
      </div>
    </AppLayout>
  );
}
