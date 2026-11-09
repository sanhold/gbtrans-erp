'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, StatutPastille } from '@/components/tables/cellules';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import FicheDetail from '@/components/ui/FicheDetail';
import PickerField from '@/components/ui/PickerField';
import { financeApi } from '@/lib/api';
import { fmt, mergedComptes, parseCompteValue, MODE_PAIEMENT_LABELS, CATEGORIES_DEPENSE, useComptesFinanciers } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function DepensesPage() {
  const { caisses, comptes, reload: onChanged } = useComptesFinanciers();
  const [depenses, setDepenses] = useState<any[]>([]);
  const [dotations, setDotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [form, setForm] = useState({ categorie: CATEGORIES_DEPENSE[0], designation: '', montant: '', modePaiement: 'ESPECES', compte: '', reference: '', observations: '', dotationId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.depenses.list({ page, limit: pageSize });
      setDepenses(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { setDepenses([]); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    financeApi.dotations.list({ limit: 200, statut: 'VALIDE' })
      .then(r => setDotations((r.data.data || []).filter((d: any) => Number(d.montantRestant) > 0)))
      .catch(() => setDotations([]));
  }, []);

  const options = mergedComptes(caisses, comptes);
  const compteOptions = options.map(o => ({ id: o.value, label: o.label }));
  const dotationOptions = dotations.map(d => ({ id: d.id, label: d.numero, sublabel: `${d.agent?.nom || ''} ${d.agent?.prenom || ''} — reste ${fmt(d.montantRestant)}` }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const compte = parseCompteValue(form.compte);
    if (!compte) { toast.error('Sélectionnez un compte à débiter'); return; }
    try {
      await financeApi.depenses.create({
        categorie: form.categorie, designation: form.designation, montant: Number(form.montant),
        modePaiement: form.modePaiement, reference: form.reference || undefined, observations: form.observations || undefined,
        caisseId: compte.type === 'CAISSE' ? compte.id : undefined,
        compteBancaireId: compte.type === 'BANQUE' ? compte.id : undefined,
        dotationId: form.dotationId || undefined,
      });
      toast.success('Dépense enregistrée');
      setShowModal(false);
      setForm({ categorie: CATEGORIES_DEPENSE[0], designation: '', montant: '', modePaiement: 'ESPECES', compte: '', reference: '', observations: '', dotationId: '' });
      load();
      onChanged();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const nomCompte = (d: any) => d.caisse?.libelle || d.compteBancaire?.libelle || '—';
  const statut = (d: any): { libelle: string; ton: 'success' | 'gray' } => d.statut === 'VALIDE' ? { libelle: 'Validée', ton: 'success' } : { libelle: d.statut === 'ANNULEE' ? 'Annulée' : d.statut, ton: 'gray' };

  const colonnes: Colonne<any>[] = [
    { cle: 'dep', libelle: 'Dépense', rendu: d => <DoubleLigne haut={d.designation} bas={`${d.numero} · ${fmtDate(d.dateDepense)}`} />, texte: d => d.designation },
    { cle: 'cat', libelle: 'Catégorie', rendu: d => <StatutPastille libelle={d.categorie} ton="info" />, texte: d => d.categorie },
    { cle: 'compte', libelle: 'Compte débité', masquerSous: 'xl', rendu: d => nomCompte(d), texte: d => nomCompte(d) },
    { cle: 'dotation', libelle: 'Dotation', masquerSous: 'xl', mono: true, rendu: d => d.dotation?.numero || '—', texte: d => d.dotation?.numero || '' },
    { cle: 'montant', libelle: 'Montant', align: 'right', rendu: d => <span className="tabular-nums font-semibold text-red-600">−{fmt(d.montant)} <span className="text-[11px] font-normal text-gray-400">F</span></span>, texte: d => String(d.montant) },
    { cle: 'statut', libelle: 'Statut', rendu: d => { const st = statut(d); return <StatutPastille libelle={st.libelle} ton={st.ton} />; }, texte: d => statut(d).libelle },
  ];

  const vide = <EmptyState titre="Aucune dépense" description="Les dépenses enregistrées apparaîtront ici." />;

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Dépenses"
          sousTitre="Gérez vos dépenses et sorties de caisse"
          sousTitreMasqueMobile
          actions={
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="sm:hidden">Nouvelle</span><span className="hidden sm:inline">Nouvelle dépense</span>
            </button>
          }
        />

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={depenses}
            cleLigne={(d) => d.id}
            onClicLigne={setDetail}
            chargement={loading}
            nomExport="depenses"
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-2">
          {loading ? (
            [0, 1, 2, 3].map(i => <div key={i} className="card !p-0 animate-pulse h-16" />)
          ) : depenses.length === 0 ? (
            <div className="card">{vide}</div>
          ) : depenses.map(d => {
            const st = statut(d);
            return (
              <button key={d.id} type="button" onClick={() => setDetail(d)} className="card !p-3 w-full text-left flex items-center gap-3 active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <span aria-hidden="true" className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17L7 7M7 17V7h10" /></svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[14px] text-gray-900 dark:text-white">{d.designation}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300 truncate max-w-[9rem]">{d.categorie}</span>
                    <span className="truncate">{fmtDate(d.dateDepense)}{st.libelle !== 'Validée' ? ` · ${st.libelle}` : ''}</span>
                  </span>
                </span>
                <span className="flex-shrink-0 text-right font-mono font-bold tabular-nums text-[14px] text-red-600">−{fmt(d.montant)}<span className="block text-[10px] font-normal text-gray-400">F CFA</span></span>
              </button>
            );
          })}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} /></div>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.designation || 'Dépense'} description={detail ? `${detail.numero} · ${fmtDate(detail.dateDepense)}` : undefined}>
        {detail && (
          <FicheDetail
            mise={{ libelle: 'Montant sorti', valeur: `−${fmt(detail.montant)} F`, ton: 'negatif' }}
            lignes={[
              ['Catégorie', detail.categorie],
              ['Compte débité', nomCompte(detail)],
              ['Mode de paiement', MODE_PAIEMENT_LABELS[detail.modePaiement] || detail.modePaiement],
              ['Dotation', detail.dotation?.numero],
              ['Dossier', detail.dossier?.numeroPhysique || detail.dossier?.numero],
              ['Référence', detail.reference],
              ['Observations', detail.observations],
              ['Statut', statut(detail).libelle],
            ]}
          />
        )}
      </Modal>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle dépense"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-depense" className="btn-primary">Enregistrer</button>
          </>
        }
      >
        <form id="form-depense" onSubmit={handleCreate} className="space-y-4">
          <div><label className="label">Catégorie *</label>
            <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className="input-field">
              {CATEGORIES_DEPENSE.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Désignation *</label><input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Montant (F CFA) *</label><input type="text" inputMode="numeric" value={form.montant ? fmt(form.montant) : ''} onChange={e => setForm({ ...form, montant: e.target.value.replace(/\D/g, '') })} className="input-field" placeholder="0" required /></div>
            <div><label className="label">Mode de paiement</label>
              <select value={form.modePaiement} onChange={e => setForm({ ...form, modePaiement: e.target.value })} className="input-field">
                {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Compte débité *</label>
            <PickerField value={form.compte} onChange={id => setForm({ ...form, compte: id })} options={compteOptions} placeholder="Sélectionner..." title="Sélectionner un compte" searchPlaceholder="Compte, caisse..." required />
          </div>
          <div><label className="label">Dotation (agent)</label>
            <PickerField value={form.dotationId} onChange={id => setForm({ ...form, dotationId: id })} options={dotationOptions} placeholder="Aucune" title="Sélectionner une dotation" searchPlaceholder="N° dotation, agent..." />
          </div>
          <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
          <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
        </form>
      </Modal>
    </AppLayout>
  );
}
