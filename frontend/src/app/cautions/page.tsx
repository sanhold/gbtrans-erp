'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, Tiers, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import FiltresDepliables from '@/components/ui/FiltresDepliables';
import { cautionsApi, clientsApi, dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import PickerField from '@/components/ui/PickerField';
import RowActionsMenu, { ActionsButton, openRowMenu, RowMenuState, RowAction } from '@/components/ui/RowActionsMenu';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const todayISO = () => new Date().toISOString().slice(0, 10);

const ETAT_LABELS: Record<string, string> = { NON_ACTIVE: 'Non activé', EN_ATTENTE: 'En attente', COURRIER_DEPOSE: 'Courrier déposé', PAYEE: 'Payée' };
const ETAT_BADGE: Record<string, string> = { NON_ACTIVE: 'badge-gray', EN_ATTENTE: 'badge-info', COURRIER_DEPOSE: 'badge-warning', PAYEE: 'badge-success' };

const emptyForm = {
  dateCaution: todayISO(), dossierId: '', numeroBL: '', clientId: '',
  quantite: '1', montant: '', compagnie: '', observations: '',
};

export default function CautionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [dossierFiltre, setDossierFiltre] = useState('');
  const [clientFiltre, setClientFiltre] = useState('');
  const [compagnieFiltre, setCompagnieFiltre] = useState('');
  const [blFiltre, setBlFiltre] = useState('');
  const [etatFiltre, setEtatFiltre] = useState('');

  const [dossiers, setDossiers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState({ nonActive: 0, enAttente: 0, courrierNonDepose: 0, courrierDepose: 0, payees: 0 });

  const [showModal, setShowModal] = useState(false);
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [payerCaution, setPayerCaution] = useState<any>(null);
  const [datePaiement, setDatePaiement] = useState(todayISO());

  const load = () => {
    setLoading(true);
    const params: any = { page, limit };
    if (dateDebut) params.dateDebut = dateDebut;
    if (dateFin) params.dateFin = dateFin;
    if (dossierFiltre) params.dossierId = dossierFiltre;
    if (clientFiltre) params.clientId = clientFiltre;
    if (compagnieFiltre) params.compagnie = compagnieFiltre;
    if (blFiltre) params.numeroBL = blFiltre;
    if (etatFiltre) params.etat = etatFiltre;
    cautionsApi.list(params)
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const loadStats = () => {
    cautionsApi.stats().then(r => setStats(r.data.data)).catch(() => {});
  };

  // Volontaire : la recherche/les filtres ne declenchent le rechargement qu'a la validation du formulaire,
  // pas a chaque frappe ; l'effet ne suit donc que la pagination.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, limit]);

  useEffect(() => {
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
    clientsApi.listRef().then(r => setClients(r.data.data || [])).catch(() => {});
    loadStats();
  }, []);

  const handleAfficher = () => { setPage(1); load(); };
  const handleActualiser = () => { load(); loadStats(); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const sommeMontant = items.reduce((s, c) => s + Number(c.montant || 0), 0);

  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));
  // Le dossier / client de la caution en cours de modification doit toujours être affiché, même hors des 500 premiers chargés.
  if (editing?.dossier && !dossierOptions.some(o => o.id === editing.dossier.id)) {
    dossierOptions.unshift({ id: editing.dossier.id, label: editing.dossier.numeroPhysique || editing.dossier.numero, sublabel: editing.client?.raisonSociale });
  }
  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));
  if (editing?.client && !clientOptions.some(o => o.id === editing.client.id)) {
    clientOptions.unshift({ id: editing.client.id, label: editing.client.raisonSociale, sublabel: editing.client.code });
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      dateCaution: c.dateCaution ? c.dateCaution.slice(0, 10) : '',
      dossierId: c.dossierId || '', numeroBL: c.numeroBL || '', clientId: c.clientId || '',
      quantite: c.quantite != null ? String(c.quantite) : '1',
      montant: c.montant != null ? String(c.montant) : '', compagnie: c.compagnie || '',
      observations: c.observations || '',
    });
    setShowModal(true);
  };

  const handleDossierChange = (dossierId: string) => {
    const d = dossiers.find(x => x.id === dossierId);
    setForm(f => ({
      ...f, dossierId,
      numeroBL: d?.numeroBL || f.numeroBL,
      clientId: d?.clientId || f.clientId,
      compagnie: d?.compagnieMaritime || f.compagnie,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.montant) { toast.error('Montant de la caution requis'); return; }
    setSaving(true);
    try {
      const data = { ...form, quantite: Number(form.quantite || 1), montant: Number(form.montant) };
      if (editing) { await cautionsApi.update(editing.id, data); toast.success('Caution modifiée'); }
      else { await cautionsApi.create(data); toast.success('Caution créée'); }
      setShowModal(false);
      load(); loadStats();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: any) => {
    try { await cautionsApi.delete(c.id); toast.success('Caution supprimée'); load(); loadStats(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleToggleActif = async (c: any) => {
    try {
      if (c.statut === 'NON_ACTIVE') { await cautionsApi.activer(c.id); toast.success('Caution activée'); }
      else { await cautionsApi.desactiver(c.id); toast.success('Caution désactivée'); }
      load(); loadStats();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleMarquerCourrier = async (c: any) => {
    try { await cautionsApi.marquerCourrier(c.id, todayISO()); toast.success('Courrier déposé'); load(); loadStats(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleAnnulerCourrier = async (c: any) => {
    try { await cautionsApi.annulerCourrier(c.id); toast.success('Dépôt de courrier annulé'); load(); loadStats(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handlePayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerCaution) return;
    try {
      await cautionsApi.payer(payerCaution.id, datePaiement);
      toast.success('Caution payée — déplacée en historique');
      setPayerCaution(null);
      load(); loadStats();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const openCautionMenu = (e: React.MouseEvent, c: any) => {
    const nonPayee = c.statut !== 'PAYEE';
    const actions: RowAction[] = [
      { label: 'Modifier', onClick: () => openEdit(c) },
      { label: 'Supprimer', onClick: () => handleDelete(c), tone: 'text-red-600', confirm: `Supprimer la caution ${c.numero} ? Cette action est définitive.`, hidden: !(c.statut === 'NON_ACTIVE' || c.statut === 'EN_ATTENTE') },
      { label: c.statut === 'NON_ACTIVE' ? 'Activer' : 'Désactiver', onClick: () => handleToggleActif(c), confirm: `${c.statut === 'NON_ACTIVE' ? 'Activer' : 'Désactiver'} la caution ${c.numero} ?`, hidden: !nonPayee },
      { label: 'Annuler le dépôt du courrier', onClick: () => handleAnnulerCourrier(c), confirm: `Annuler le dépôt de courrier de la caution ${c.numero} ?`, hidden: !nonPayee || c.statut === 'NON_ACTIVE' || c.statut !== 'COURRIER_DEPOSE' },
      { label: 'Marquer le courrier déposé', onClick: () => handleMarquerCourrier(c), confirm: `Marquer le courrier de la caution ${c.numero} comme déposé ?`, hidden: !nonPayee || c.statut === 'NON_ACTIVE' || c.statut === 'COURRIER_DEPOSE' },
      { label: 'Marquer payée', onClick: () => { setPayerCaution(c); setDatePaiement(todayISO()); }, tone: 'text-green-700', hidden: !nonPayee },
    ];
    openRowMenu(setRowMenu, e, [
      { label: 'Caution', value: c.numero },
      { label: 'Client', value: c.client?.raisonSociale || '-' },
      { label: 'Dossier', value: c.dossier ? (c.dossier.numeroPhysique || c.dossier.numero) : '-' },
    ], actions);
  };

  const nbFiltres = [dateDebut, dateFin, dossierFiltre, clientFiltre, compagnieFiltre, blFiltre, etatFiltre].filter(Boolean).length;

  const colonnes: Colonne<any>[] = [
    { cle: 'caution', libelle: 'Caution', rendu: c => <DoubleLigne mono haut={c.numero} bas={fmtDate(c.dateCaution)} />, texte: c => c.numero },
    { cle: 'dossier', libelle: 'Dossier', rendu: c => (
      <DoubleLigne
        haut={c.dossier ? <Link href={`/dossiers/${c.dossier.id}`} onClick={e => e.stopPropagation()} className="text-primary-600 hover:underline font-mono">{c.dossier.numeroPhysique || c.dossier.numero}</Link> : '—'}
        bas={c.numeroBL ? `BL ${c.numeroBL}` : undefined}
      />
    ), texte: c => c.dossier?.numeroPhysique || c.dossier?.numero || '' },
    { cle: 'client', libelle: 'Client', rendu: c => <Tiers nom={c.client?.raisonSociale} detail={c.compagnie} />, texte: c => c.client?.raisonSociale || '' },
    { cle: 'qte', libelle: 'Qté', align: 'right', masquerSous: 'xl', rendu: c => <span className="tabular-nums">{c.quantite}</span>, texte: c => String(c.quantite ?? '') },
    { cle: 'montant', libelle: 'Montant', align: 'right', rendu: c => <Montant valeur={c.montant} />, texte: c => String(c.montant) },
    { cle: 'courrier', libelle: 'Dépôt courrier', masquerSous: '2xl', rendu: c => fmtDate(c.dateDepotCourrier), texte: c => fmtDate(c.dateDepotCourrier) },
    { cle: 'paiement', libelle: 'Paiement', masquerSous: '2xl', rendu: c => fmtDate(c.datePaiement), texte: c => fmtDate(c.datePaiement) },
    { cle: 'etat', libelle: 'État', rendu: c => <StatutPastille libelle={ETAT_LABELS[c.statut] || c.statut} ton={tonDepuisBadge(ETAT_BADGE[c.statut])} />, texte: c => ETAT_LABELS[c.statut] || c.statut },
  ];

  const vide = <EmptyState titre="Aucune caution" description="Ajoutez une caution pour suivre un dépôt de conteneur." action={<button type="button" onClick={openCreate} className="btn-primary">Ajouter une caution</button>} />;

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Cautions"
          sousTitre="Dépôts conteneurs"
          sousTitreMasqueMobile
          actions={
            <>
              <Link href="/cautions/historique" className="btn-secondary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">Historique</Link>
              <button type="button" onClick={openCreate} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Ajouter
              </button>
            </>
          }
        />

        {/* Synthèse : nombre de cautions par situation */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { l: 'Non activées', v: stats.nonActive, c: 'text-red-600' },
            { l: 'En attente', v: stats.enAttente, c: 'text-sky-600' },
            { l: 'Courrier à déposer', v: stats.courrierNonDepose, c: 'text-purple-600' },
            { l: 'Courrier déposé', v: stats.courrierDepose, c: 'text-emerald-600' },
          ].map(k => (
            <div key={k.l} className="card !p-2.5 sm:!p-3 text-center min-w-0">
              <div className={`text-lg sm:text-xl font-bold tabular-nums ${k.c}`}>{k.v}</div>
              <div className="text-[10px] sm:text-[11px] leading-tight text-gray-500">{k.l}</div>
            </div>
          ))}
        </div>

        <FiltresDepliables actifs={nbFiltres}>
          <form onSubmit={e => { e.preventDefault(); handleAfficher(); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div><label className="label">Du</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field" /></div>
              <div><label className="label">Au</label><input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field" /></div>
              <div><label className="label">Dossier</label><PickerField value={dossierFiltre} onChange={setDossierFiltre} options={dossierOptions} placeholder="Tous" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." /></div>
              <div><label className="label">Client</label><PickerField value={clientFiltre} onChange={setClientFiltre} options={clientOptions} placeholder="Tous" title="Sélectionner un client" searchPlaceholder="Raison sociale..." /></div>
              <div><label className="label">Compagnie</label><input type="text" value={compagnieFiltre} onChange={e => setCompagnieFiltre(e.target.value)} className="input-field" placeholder="MSC, MAERSK..." /></div>
              <div><label className="label">N° BL</label><input type="text" value={blFiltre} onChange={e => setBlFiltre(e.target.value)} className="input-field" /></div>
              <div className="sm:col-span-2">
                <label className="label">Situation</label>
                <select value={etatFiltre} onChange={e => setEtatFiltre(e.target.value)} className="input-field">
                  <option value="">Actives (non payées)</option>
                  <option value="NON_ACTIVE">Non activé</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="COURRIER_DEPOSE">Courrier déposé</option>
                  <option value="TOUS">Toutes (payées incluses)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1 sm:flex-none">Afficher</button>
              <button type="button" onClick={handleActualiser} className="btn-secondary flex-1 sm:flex-none">Actualiser</button>
            </div>
          </form>
        </FiltresDepliables>

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={items}
            cleLigne={(c) => c.id}
            chargement={loading}
            nomExport="cautions"
            actionsToujoursVisibles
            actions={(c) => <ActionsButton onOpen={(e) => openCautionMenu(e, c)} />}
            pied={
              <>
                {items.length > 0 && <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-2.5 text-sm dark:border-surface-700 dark:bg-surface-900/30"><span className="text-gray-500">Somme de la page ({total} caution(s) au total)</span><span className="font-semibold tabular-nums text-gray-900 dark:text-white">{fmt(sommeMontant)} F</span></div>}
                <TablePagination page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
              </>
            }
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-28" />)
          ) : items.length === 0 ? (
            <div className="card">{vide}</div>
          ) : items.map(c => (
            <div key={c.id} className="card !p-0 overflow-hidden">
              <div className="px-4 pt-3 pb-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-primary-600 dark:text-primary-300 truncate">{c.numero}</span>
                  <StatutPastille libelle={ETAT_LABELS[c.statut] || c.statut} ton={tonDepuisBadge(ETAT_BADGE[c.statut])} />
                </div>
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate text-gray-800 dark:text-gray-100">{c.client?.raisonSociale || '—'}</span>
                  <span className="font-mono font-bold whitespace-nowrap text-gray-900 dark:text-white">{fmt(c.montant)} F</span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {c.dossier ? <Link href={`/dossiers/${c.dossier.id}`} className="font-mono text-primary-600">{c.dossier.numeroPhysique || c.dossier.numero}</Link> : 'Sans dossier'}
                  {c.numeroBL ? ` · BL ${c.numeroBL}` : ''}{c.compagnie ? ` · ${c.compagnie}` : ''} · {fmtDate(c.dateCaution)}
                </div>
                {(c.dateDepotCourrier || c.datePaiement) && (
                  <div className="text-[11px] text-gray-400">{c.dateDepotCourrier ? `Courrier déposé le ${fmtDate(c.dateDepotCourrier)}` : ''}{c.dateDepotCourrier && c.datePaiement ? ' · ' : ''}{c.datePaiement ? `Payée le ${fmtDate(c.datePaiement)}` : ''}</div>
                )}
              </div>
              <div className="flex justify-end px-4 pb-3"><ActionsButton onOpen={(e) => openCautionMenu(e, c)} /></div>
            </div>
          ))}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} /></div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Modifier la caution ${editing.numero}` : 'Ajouter une caution'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-caution" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</button>
          </>
        }
      >
        <form id="form-caution" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Date caution</label><input type="date" value={form.dateCaution} onChange={e => setForm({ ...form, dateCaution: e.target.value })} className="input-field" /></div>
            <div>
              <label className="label">Dossier</label>
              <PickerField value={form.dossierId} onChange={handleDossierChange} options={dossierOptions} placeholder="-- Aucun --" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." />
            </div>
            <div><label className="label">N° BL</label><input type="text" value={form.numeroBL} onChange={e => setForm({ ...form, numeroBL: e.target.value })} className="input-field" /></div>
            <div>
              <label className="label">Client</label>
              <PickerField value={form.clientId} onChange={id => setForm({ ...form, clientId: id })} options={clientOptions} placeholder="-- Aucun --" title="Sélectionner un client" searchPlaceholder="Raison sociale..." />
            </div>
            <div><label className="label">Quantité</label><input type="number" min="1" value={form.quantite} onChange={e => setForm({ ...form, quantite: e.target.value })} className="input-field" /></div>
            <div><label className="label">Montant caution (F CFA) *</label><input type="text" inputMode="numeric" value={form.montant ? fmt(form.montant) : ''} onChange={e => setForm({ ...form, montant: e.target.value.replace(/\D/g, '') })} className="input-field" placeholder="0" required /></div>
            <div className="sm:col-span-2"><label className="label">Compagnie</label><input type="text" value={form.compagnie} onChange={e => setForm({ ...form, compagnie: e.target.value })} className="input-field" placeholder="MSC, MAERSK, OOCL..." /></div>
            <div className="sm:col-span-2"><label className="label">Observation</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!payerCaution}
        onClose={() => setPayerCaution(null)}
        title="Paiement de la caution"
        description={payerCaution?.numero}
        footer={
          <>
            <button type="button" onClick={() => setPayerCaution(null)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-paiement-caution" className="btn-success">Valider le paiement</button>
          </>
        }
      >
        {payerCaution && (
          <form id="form-paiement-caution" onSubmit={handlePayer} className="space-y-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Montant de la caution</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600">{fmt(payerCaution.montant)} F</div>
            </div>
            <dl className="divide-y divide-gray-100 dark:divide-surface-700 text-sm">
              <div className="flex justify-between gap-4 py-2"><dt className="text-gray-500">Dossier</dt><dd className="font-medium">{payerCaution.dossier?.numeroPhysique || payerCaution.dossier?.numero || '—'}</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-gray-500">Compagnie</dt><dd className="font-medium">{payerCaution.compagnie || '—'}</dd></div>
            </dl>
            <div>
              <label className="label">Date de paiement *</label>
              <input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)} className="input-field" required />
            </div>
          </form>
        )}
      </Modal>
      <RowActionsMenu state={rowMenu} onClose={() => setRowMenu(null)} />
    </AppLayout>
  );
}
