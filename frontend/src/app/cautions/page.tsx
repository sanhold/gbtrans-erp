'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { cautionsApi, clientsApi, dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import PickerField from '@/components/ui/PickerField';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';
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
  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));

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
    if (!confirm(`Supprimer la caution ${c.numero} ?`)) return;
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Cautions</h1>
            <p className="text-sm text-gray-500">Dépôts conteneurs auprès des compagnies maritimes</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="stat-card !p-3 !bg-red-50 dark:!bg-red-900/20 border border-red-200 dark:border-red-800 text-center min-w-[110px]">
              <p className="text-[10px] text-red-700 dark:text-red-300 uppercase font-semibold">Caution non activé</p>
              <p className="text-xl font-bold text-red-600">{stats.nonActive}</p>
            </div>
            <div className="stat-card !p-3 !bg-amber-50 dark:!bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center min-w-[110px]">
              <p className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold">Caution en attente</p>
              <p className="text-xl font-bold text-amber-600">{stats.enAttente}</p>
            </div>
            <div className="stat-card !p-3 !bg-purple-50 dark:!bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-center min-w-[110px]">
              <p className="text-[10px] text-purple-700 dark:text-purple-300 uppercase font-semibold">Courrier non déposé</p>
              <p className="text-xl font-bold text-purple-600">{stats.courrierNonDepose}</p>
            </div>
            <div className="stat-card !p-3 !bg-green-50 dark:!bg-green-900/20 border border-green-200 dark:border-green-800 text-center min-w-[110px]">
              <p className="text-[10px] text-green-700 dark:text-green-300 uppercase font-semibold">Courrier déposé</p>
              <p className="text-xl font-bold text-green-600">{stats.courrierDepose}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/cautions/historique" className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Historique
            </Link>
            <button onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Ajouter une Caution
            </button>
          </div>
        </div>

        <div className="card !p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div><label className="label">Date début</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field" /></div>
            <div><label className="label">Date fin</label><input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field" /></div>
            <div>
              <label className="label">Dossier</label>
              <PickerField value={dossierFiltre} onChange={setDossierFiltre} options={dossierOptions} placeholder="Tous" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." className="w-44" />
            </div>
            <div>
              <label className="label">Client</label>
              <PickerField value={clientFiltre} onChange={setClientFiltre} options={clientOptions} placeholder="Tous" title="Sélectionner un client" searchPlaceholder="Raison sociale..." className="w-44" />
            </div>
            <div><label className="label">Compagnie</label><input type="text" value={compagnieFiltre} onChange={e => setCompagnieFiltre(e.target.value)} className="input-field w-32" /></div>
            <div><label className="label">N° BL</label><input type="text" value={blFiltre} onChange={e => setBlFiltre(e.target.value)} className="input-field w-36" /></div>
            <div>
              <label className="label">État Caution</label>
              <select value={etatFiltre} onChange={e => setEtatFiltre(e.target.value)} className="input-field w-40">
                <option value="">Toutes actives (non payées)</option>
                <option value="NON_ACTIVE">Non activé</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="COURRIER_DEPOSE">Courrier déposé</option>
                <option value="TOUS">Toutes (payées incluses)</option>
              </select>
            </div>
            <button onClick={handleAfficher} className="btn-primary">Afficher</button>
            <button onClick={handleActualiser} className="btn-secondary" title="Actualiser">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Id caution</th>
                <th className="table-header">Date caution</th>
                <th className="table-header">N°Dossier</th>
                <th className="table-header">N° BL</th>
                <th className="table-header">Client</th>
                <th className="table-header text-center">Qte</th>
                <th className="table-header text-right">Montant Caution</th>
                <th className="table-header">Compagnie</th>
                <th className="table-header">Date dépôt Courrier</th>
                <th className="table-header">Date Paiement</th>
                <th className="table-header">État</th>
                <th className="table-header">Observation</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-12 text-gray-500">Aucune caution enregistrée</td></tr>
              ) : items.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="Id caution">{c.numero}</td>
                  <td className="table-cell text-xs" data-label="Date caution">{fmtDate(c.dateCaution)}</td>
                  <td className="table-cell font-mono text-xs" data-label="N°Dossier">
                    {c.dossier ? <Link href={`/dossiers/${c.dossier.id}`} className="text-primary-600 hover:underline">{c.dossier.numeroPhysique || c.dossier.numero}</Link> : '-'}
                  </td>
                  <td className="table-cell font-mono text-xs" data-label="N° BL">{c.numeroBL || '-'}</td>
                  <td className="table-cell" data-label="Client">{c.client?.raisonSociale || '-'}</td>
                  <td className="table-cell text-center" data-label="Qte">{c.quantite}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant Caution">{fmt(c.montant)}</td>
                  <td className="table-cell" data-label="Compagnie">{c.compagnie || '-'}</td>
                  <td className="table-cell text-xs" data-label="Date dépôt Courrier">{fmtDate(c.dateDepotCourrier)}</td>
                  <td className="table-cell text-xs" data-label="Date Paiement">{fmtDate(c.datePaiement)}</td>
                  <td className="table-cell" data-label="État"><span className={`badge ${ETAT_BADGE[c.statut]}`}>{ETAT_LABELS[c.statut]}</span></td>
                  <td className="table-cell text-xs max-w-[200px] truncate" data-label="Observation" title={c.observations || ''}>{c.observations || '-'}</td>
                  <td className="table-cell" data-label="Actions">
                    <div className="flex gap-0.5 items-center">
                      <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {(c.statut === 'NON_ACTIVE' || c.statut === 'EN_ATTENTE') && (
                        <button onClick={() => handleDelete(c)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                      {c.statut !== 'PAYEE' && (
                        <>
                          <span className="w-px h-4 bg-gray-200 dark:bg-surface-600 mx-0.5" />
                          <button onClick={() => handleToggleActif(c)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title={c.statut === 'NON_ACTIVE' ? 'Activer' : 'Désactiver'}>
                            <svg className={`w-4 h-4 ${c.statut === 'NON_ACTIVE' ? 'text-gray-400' : 'text-cyan-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </button>
                          {c.statut !== 'NON_ACTIVE' && (c.statut === 'COURRIER_DEPOSE' ? (
                            <button onClick={() => handleAnnulerCourrier(c)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Annuler dépôt courrier">
                              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </button>
                          ) : (
                            <button onClick={() => handleMarquerCourrier(c)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Marquer courrier déposé">
                              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </button>
                          ))}
                          <button onClick={() => { setPayerCaution(c); setDatePaiement(todayISO()); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Marquer payée">
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
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
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
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
                <div><label className="label">Dossier</label><input type="text" readOnly value={payerCaution.dossier?.numero || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
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
    </AppLayout>
  );
}
