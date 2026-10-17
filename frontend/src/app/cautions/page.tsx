'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
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

  useEffect(() => { load(); }, [page, limit]);

  useEffect(() => {
    dossiersApi.list({ limit: 500 }).then(r => setDossiers(r.data.data || [])).catch(() => {});
    clientsApi.list({ limit: 500 }).then(r => setClients(r.data.data || [])).catch(() => {});
    loadStats();
  }, []);

  const handleAfficher = () => { setPage(1); load(); };
  const handleActualiser = () => { load(); loadStats(); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="card !p-3 overflow-x-auto">
          <div className="flex flex-nowrap items-center gap-2 min-w-max">
            <div className="flex-shrink-0 mr-1">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Cautions</h1>
              <p className="text-[10px] text-gray-500 whitespace-nowrap">Dépôts conteneurs</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 border-x border-gray-200 dark:border-surface-700 px-2">
              <span className="badge badge-danger !text-[10px] !px-1.5 !py-0.5" title="Non activé">{stats.nonActive}</span>
              <span className="badge badge-warning !text-[10px] !px-1.5 !py-0.5" title="En attente">{stats.enAttente}</span>
              <span className="badge !text-[10px] !px-1.5 !py-0.5 bg-purple-100 text-purple-800" title="Courrier non déposé">{stats.courrierNonDepose}</span>
              <span className="badge badge-success !text-[10px] !px-1.5 !py-0.5" title="Courrier déposé">{stats.courrierDepose}</span>
            </div>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field !py-1.5 text-xs w-32 flex-shrink-0" title="Date début" />
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field !py-1.5 text-xs w-32 flex-shrink-0" title="Date fin" />
            <PickerField value={dossierFiltre} onChange={setDossierFiltre} options={dossierOptions} placeholder="Dossier" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." className="!py-1.5 text-xs w-28 flex-shrink-0" />
            <PickerField value={clientFiltre} onChange={setClientFiltre} options={clientOptions} placeholder="Client" title="Sélectionner un client" searchPlaceholder="Raison sociale..." className="!py-1.5 text-xs w-28 flex-shrink-0" />
            <input type="text" value={compagnieFiltre} onChange={e => setCompagnieFiltre(e.target.value)} className="input-field !py-1.5 text-xs w-24 flex-shrink-0" placeholder="Compagnie" />
            <input type="text" value={blFiltre} onChange={e => setBlFiltre(e.target.value)} className="input-field !py-1.5 text-xs w-24 flex-shrink-0" placeholder="N° BL" />
            <select value={etatFiltre} onChange={e => setEtatFiltre(e.target.value)} className="input-field !py-1.5 text-xs w-32 flex-shrink-0">
              <option value="">Actives (non payées)</option>
              <option value="NON_ACTIVE">Non activé</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="COURRIER_DEPOSE">Courrier déposé</option>
              <option value="TOUS">Toutes (payées incl.)</option>
            </select>
            <button onClick={handleAfficher} className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0">Afficher</button>
            <button onClick={handleActualiser} className="btn-secondary !px-2 !py-1.5 flex-shrink-0" title="Actualiser">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <Link href="/cautions/historique" className="btn-secondary !px-3 !py-1.5 text-xs flex-shrink-0">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Historique
            </Link>
            <button onClick={openCreate} className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Ajouter
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="w-full table-fixed table-strict">
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="table-header !text-[10px] !px-1.5 truncate">Actions</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Id caution</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Date caution</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">N°Dossier</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">N° BL</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Client</th>
                <th className="table-header !text-[10px] !px-1.5 truncate text-center">Qte</th>
                <th className="table-header !text-[10px] !px-1.5 truncate text-right">Montant</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Compagnie</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Dépôt Courrier</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Paiement</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">État</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Observation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-12 text-gray-500">Aucune caution enregistrée</td></tr>
              ) : items.map(c => (
                <tr key={c.id} className="table-row cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; openCautionMenu(e, c); }}>
                  <td className="table-cell !px-1" data-label="Actions">
                    <ActionsButton onOpen={(e) => openCautionMenu(e, c)} />
                  </td>
                  <td className="table-cell font-medium text-primary-600 !px-1.5 !text-[11px] truncate" data-label="Id caution" title={c.numero}>{c.numero}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date caution">{fmtDate(c.dateCaution)}</td>
                  <td className="table-cell font-mono !text-[10.5px] !px-1.5 truncate" data-label="N°Dossier">
                    {c.dossier ? <Link href={`/dossiers/${c.dossier.id}`} className="text-primary-600 hover:underline">{c.dossier.numeroPhysique || c.dossier.numero}</Link> : '-'}
                  </td>
                  <td className="table-cell font-mono !text-[10.5px] !px-1.5 truncate" data-label="N° BL" title={c.numeroBL || undefined}>{c.numeroBL || '-'}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Client" title={c.client?.raisonSociale || undefined}>{c.client?.raisonSociale || '-'}</td>
                  <td className="table-cell text-center !px-1 !text-[10.5px]" data-label="Qte">{c.quantite}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Montant Caution">{fmt(c.montant)}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Compagnie" title={c.compagnie || undefined}>{c.compagnie || '-'}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date dépôt Courrier">{fmtDate(c.dateDepotCourrier)}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date Paiement">{fmtDate(c.datePaiement)}</td>
                  <td className="table-cell !px-1.5" data-label="État"><span className={`badge ${ETAT_BADGE[c.statut]} !text-[10px] !px-1.5 !py-0 truncate`}>{ETAT_LABELS[c.statut]}</span></td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Observation" title={c.observations || ''}>{c.observations || '-'}</td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-surface-600 font-semibold">
                  <td className="table-cell" colSpan={6}>Somme / Compteur (page)</td>
                  <td className="table-cell text-right font-mono">{fmt(sommeMontant)}</td>
                  <td className="table-cell" colSpan={5}>{total} caution(s)</td>
                </tr>
              </tfoot>
            )}
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>

        {/* Modal création / édition */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">{editing ? `Modifier Caution N°${editing.numero}` : 'Ajouter une Caution'}</h2>
                <button onClick={() => setShowModal(false)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
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
                  <div><label className="label">Qte</label><input type="number" min="1" value={form.quantite} onChange={e => setForm({ ...form, quantite: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Montant Caution *</label><input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Compagnie</label><input type="text" value={form.compagnie} onChange={e => setForm({ ...form, compagnie: e.target.value })} className="input-field" placeholder="MSC, MAERSK, OOCL..." /></div>
                  <div className="col-span-2"><label className="label">Observation</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Paiement */}
        {payerCaution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-3 bg-green-600 text-white">
                <h2 className="text-base font-bold">Paiement de la Caution</h2>
                <button onClick={() => setPayerCaution(null)} className="p-1 rounded hover:bg-white/10"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handlePayer} className="p-6 space-y-4">
                <div><label className="label">Dossier</label><input type="text" readOnly value={payerCaution.dossier?.numeroPhysique || payerCaution.dossier?.numero || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                <div><label className="label">Compagnie</label><input type="text" readOnly value={payerCaution.compagnie || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                <div><label className="label">Montant Caution</label><input type="text" readOnly value={`${fmt(payerCaution.montant)} F`} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                <div>
                  <label className="label text-green-600 font-semibold">Date Paiement *</label>
                  <input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)} className="input-field !bg-green-50 dark:!bg-green-900/20 border-green-300" required />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setPayerCaution(null)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-success">Valider le paiement</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    <RowActionsMenu state={rowMenu} onClose={() => setRowMenu(null)} />
    </AppLayout>
  );
}
