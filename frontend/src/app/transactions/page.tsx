'use client';

import { useState, useCallback, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, StatutPastille } from '@/components/tables/cellules';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import FiltresDepliables from '@/components/ui/FiltresDepliables';
import PickerField from '@/components/ui/PickerField';
import { financeApi } from '@/lib/api';
import { fmt, mergedComptes, parseCompteValue, TYPE_OPERATION_LABELS, useComptesFinanciers } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const { caisses, comptes, tiers, reload: onChanged } = useComptesFinanciers();
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterCompte, setFilterCompte] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [resume, setResume] = useState({ totalEntrees: 0, totalSorties: 0 });
  const [form, setForm] = useState({ type: 'ENCAISSEMENT', montant: '', libelle: '', dateOperation: '', reference: '', beneficiaire: '', observations: '', source: '', destination: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const compte = parseCompteValue(filterCompte);
    try {
      const res = await financeApi.operations.list({
        page, limit: pageSize,
        type: filterType || undefined,
        dateDebut: filterDateDebut || undefined,
        dateFin: filterDateFin || undefined,
        ...(compte?.type === 'CAISSE' && { caisseId: compte.id }),
        ...(compte?.type === 'BANQUE' && { compteBancaireId: compte.id }),
        ...(compte?.type === 'TIERS' && { compteTiersId: compte.id }),
      });
      setOperations(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setResume(res.data.resume || { totalEntrees: 0, totalSorties: 0 });
    } catch { setOperations([]); }
    finally { setLoading(false); }
  }, [page, pageSize, filterType, filterCompte, filterDateDebut, filterDateFin]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, pageSize, filterType]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const options = mergedComptes(caisses, comptes, tiers);
  const compteOptions = options.map(o => ({ id: o.value, label: o.label }));
  const needsSource = ['DECAISSEMENT', 'RETRAIT', 'VIREMENT_INTERNE'].includes(form.type);
  const needsDestination = ['ENCAISSEMENT', 'DOTATION', 'VIREMENT_INTERNE'].includes(form.type);

  const { totalEntrees, totalSorties } = resume;
  const soldeNet = totalEntrees - totalSorties;

  const changerCategorie = (t: string) => { setFilterType(t); setPage(1); };
  const nbFiltres = (filterCompte ? 1 : 0) + (filterDateDebut ? 1 : 0) + (filterDateFin ? 1 : 0);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const nomCompte = (op: any) => op.caisse?.libelle || op.compteBancaire?.libelle || op.compteTiers?.libelle || '—';
  const entree = (op: any) => op.sens === 'ENTREE';

  const Pastille = ({ op }: { op: any }) => (
    <span aria-hidden="true" className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${entree(op) ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15' : 'bg-red-50 text-red-600 dark:bg-red-500/15'}`}>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d={entree(op) ? 'M7 7l10 10M17 7v10H7' : 'M17 17L7 7M7 17V7h10'} /></svg>
    </span>
  );

  const colonnes: Colonne<any>[] = [
    { cle: 'op', libelle: 'Opération', rendu: op => (
      <div className="flex min-w-0 items-center gap-3"><Pastille op={op} /><DoubleLigne haut={op.libelle} bas={`${op.numero} · ${fmtDate(op.dateOperation)}`} /></div>
    ), texte: op => op.libelle },
    { cle: 'type', libelle: 'Catégorie', rendu: op => <StatutPastille libelle={TYPE_OPERATION_LABELS[op.type] || op.type} ton="info" />, texte: op => TYPE_OPERATION_LABELS[op.type] || op.type },
    { cle: 'compte', libelle: 'Compte', rendu: op => nomCompte(op), texte: op => nomCompte(op) },
    { cle: 'montant', libelle: 'Montant', align: 'right', rendu: op => <span className={`tabular-nums font-semibold ${entree(op) ? 'text-emerald-600' : 'text-red-600'}`}>{entree(op) ? '+' : '−'}{fmt(op.montant)} <span className="text-[11px] font-normal text-gray-400">F</span></span>, texte: op => `${entree(op) ? '' : '-'}${op.montant}` },
  ];

  const vide = <EmptyState titre="Aucune opération" description="Aucun mouvement ne correspond à ces critères." />;
  const categories = [['', 'Toutes'], ...Object.entries(TYPE_OPERATION_LABELS)] as [string, string][];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const source = parseCompteValue(form.source);
    const destination = parseCompteValue(form.destination);
    try {
      await financeApi.operations.create({
        type: form.type, montant: Number(form.montant), libelle: form.libelle,
        dateOperation: form.dateOperation || undefined, reference: form.reference || undefined,
        beneficiaire: form.beneficiaire || undefined, observations: form.observations || undefined,
        sourceType: source?.type, sourceId: source?.id,
        destinationType: destination?.type, destinationId: destination?.id,
      });
      toast.success('Opération enregistrée');
      setShowModal(false);
      setForm({ type: 'ENCAISSEMENT', montant: '', libelle: '', dateOperation: '', reference: '', beneficiaire: '', observations: '', source: '', destination: '' });
      load();
      onChanged();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Transactions"
          sousTitre="Journal de tous les mouvements financiers"
          sousTitreMasqueMobile
          actions={
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="sm:hidden">Nouvelle</span><span className="hidden sm:inline">Nouvelle opération</span>
            </button>
          }
        />

        {/* Synthèse de la période (en F CFA) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="card !p-2.5 sm:!p-4 min-w-0 block"><p className="text-[10px] text-gray-500 uppercase truncate">↘ Entrées</p><p className="text-[13px] sm:text-base font-bold text-emerald-600 tabular-nums whitespace-nowrap">{fmt(totalEntrees)}<span className="hidden sm:inline"> F</span></p></div>
          <div className="card !p-2.5 sm:!p-4 min-w-0 block"><p className="text-[10px] text-gray-500 uppercase truncate">↗ Sorties</p><p className="text-[13px] sm:text-base font-bold text-red-600 tabular-nums whitespace-nowrap">{fmt(totalSorties)}<span className="hidden sm:inline"> F</span></p></div>
          <div className="card !p-2.5 sm:!p-4 min-w-0 block"><p className="text-[10px] text-gray-500 uppercase truncate">Solde net</p><p className={`text-[13px] sm:text-base font-bold tabular-nums whitespace-nowrap ${soldeNet >= 0 ? 'text-primary-600 dark:text-primary-300' : 'text-red-600'}`}>{fmt(soldeNet)}<span className="hidden sm:inline"> F</span></p></div>
        </div>

        {/* Catégories */}
        <div role="tablist" aria-label="Catégorie d'opération" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map(([cle, libelle]) => (
            <button key={cle || 'toutes'} type="button" role="tab" aria-selected={filterType === cle} onClick={() => changerCategorie(cle)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${filterType === cle ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-300'}`}>
              {libelle}
            </button>
          ))}
        </div>

        <FiltresDepliables actifs={nbFiltres}>
          <form onSubmit={e => { e.preventDefault(); setPage(1); load(); }}>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_9rem_auto] gap-3 items-end">
              <div>
                <label className="label">Compte</label>
                <PickerField value={filterCompte} onChange={setFilterCompte} options={compteOptions} placeholder="Tous les comptes" title="Sélectionner un compte" searchPlaceholder="Compte, caisse..." />
              </div>
              <div><label className="label">Du</label><input type="date" value={filterDateDebut} onChange={e => setFilterDateDebut(e.target.value)} className="input-field" /></div>
              <div><label className="label">Au</label><input type="date" value={filterDateFin} onChange={e => setFilterDateFin(e.target.value)} className="input-field" /></div>
              <button type="submit" className="btn-primary w-full sm:w-auto">Afficher</button>
            </div>
          </form>
        </FiltresDepliables>

        {/* Ordinateur : tableau */}
        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={operations}
            cleLigne={(op) => op.id}
            onClicLigne={setDetail}
            chargement={loading}
            nomExport="transactions"
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />}
            vide={vide}
          />
        </div>

        {/* Téléphone : une carte par opération */}
        <div className="lg:hidden space-y-2">
          {loading ? (
            [0, 1, 2, 3].map(i => <div key={i} className="card !p-0 animate-pulse h-16" />)
          ) : operations.length === 0 ? (
            <div className="card">{vide}</div>
          ) : operations.map(op => (
            <button key={op.id} type="button" onClick={() => setDetail(op)}
              className="card !p-3 w-full text-left flex items-center gap-3 active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              <Pastille op={op} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[14px] text-gray-900 dark:text-white">{op.libelle}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{TYPE_OPERATION_LABELS[op.type] || op.type}</span>
                  <span className="truncate">{nomCompte(op)} · {fmtDate(op.dateOperation)}</span>
                </span>
              </span>
              <span className={`flex-shrink-0 text-right font-mono font-bold tabular-nums text-[14px] ${entree(op) ? 'text-emerald-600' : 'text-red-600'}`}>
                {entree(op) ? '+' : '−'}{fmt(op.montant)}
                <span className="block text-[10px] font-normal text-gray-400">F CFA</span>
              </span>
            </button>
          ))}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} /></div>
        </div>
      </div>

      {/* Détail d'une opération */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.libelle || 'Opération'} description={detail ? `${detail.numero} · ${fmtDate(detail.dateOperation)}` : undefined}>
        {detail && (
          <div className="space-y-4">
            <div className={`rounded-xl px-4 py-3 text-center ${entree(detail) ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">{entree(detail) ? 'Entrée' : 'Sortie'}</div>
              <div className={`text-2xl font-bold font-mono tabular-nums ${entree(detail) ? 'text-emerald-600' : 'text-red-600'}`}>{entree(detail) ? '+' : '−'}{fmt(detail.montant)} F</div>
            </div>
            <dl className="divide-y divide-gray-100 dark:divide-surface-700 text-sm">
              {([
                ['Catégorie', TYPE_OPERATION_LABELS[detail.type] || detail.type],
                ['Compte', nomCompte(detail)],
                ['Référence', detail.reference],
                ['Bénéficiaire', detail.beneficiaire],
                ['Observations', detail.observations],
                ['Statut', detail.statut],
              ] as [string, any][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2.5"><dt className="text-gray-500">{k}</dt><dd className="text-right font-medium text-gray-900 dark:text-white break-words">{v}</dd></div>
              ))}
            </dl>
          </div>
        )}
      </Modal>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle opération"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-operation" className="btn-primary">Enregistrer</button>
          </>
        }
      >
        <form id="form-operation" onSubmit={handleCreate} className="space-y-4">
          <div><label className="label">Type *</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, source: '', destination: '' })} className="input-field">
              {Object.entries(TYPE_OPERATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {needsSource && (
            <div><label className="label">Compte source *</label>
              <PickerField value={form.source} onChange={id => setForm({ ...form, source: id })} options={compteOptions} placeholder="Sélectionner..." title="Sélectionner le compte source" searchPlaceholder="Compte, caisse..." required />
            </div>
          )}
          {needsDestination && (
            <div><label className="label">Compte de destination *</label>
              <PickerField value={form.destination} onChange={id => setForm({ ...form, destination: id })} options={compteOptions} placeholder="Sélectionner..." title="Sélectionner le compte de destination" searchPlaceholder="Compte, caisse..." required />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Montant (F CFA) *</label><input type="text" inputMode="numeric" value={form.montant ? fmt(form.montant) : ''} onChange={e => setForm({ ...form, montant: e.target.value.replace(/\D/g, '') })} className="input-field" placeholder="0" required /></div>
            <div><label className="label">Date</label><input type="date" value={form.dateOperation} onChange={e => setForm({ ...form, dateOperation: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
            <div><label className="label">Bénéficiaire</label><input type="text" value={form.beneficiaire} onChange={e => setForm({ ...form, beneficiaire: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
        </form>
      </Modal>
    </AppLayout>
  );
}
