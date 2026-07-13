'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { atApi, clientsApi, dossiersApi, documentsApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import { generateATCertBlob, downloadBlob } from '@/lib/generateATPdf';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const ETAT_LABELS: Record<string, string> = { NON_APURE: 'Non apuré', EXPIRE: 'Expiré', APURE: 'Apuré' };
const ETAT_BADGE: Record<string, string> = { NON_APURE: 'badge-gray', EXPIRE: 'badge-danger', APURE: 'badge-success' };

const emptyForm = {
  clientId: '', dossierId: '', declarant: '', nature: '', designation: '',
  declarationEntree: '', bureauEntree: '', dateDeclaration: '', dateExpiration: '',
  delaiMois: '24', alerteJours: '90', montantCaution: '', observations: '',
};

export default function ATPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [etatFiltre, setEtatFiltre] = useState('');
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [prolongerAt, setProlongerAt] = useState<any>(null);
  const [prolongerForm, setProlongerForm] = useState({ nouvelleDateExpiration: '', nouveauNumeroDeclaration: '' });

  const [apurerAt, setApurerAt] = useState<any>(null);
  const [apurerForm, setApurerForm] = useState({ dateApurement: new Date().toISOString().slice(0, 10), referenceApurement: '' });

  const [historiqueAt, setHistoriqueAt] = useState<any>(null);
  const [historiqueList, setHistoriqueList] = useState<any[]>([]);
  const [historiqueLoading, setHistoriqueLoading] = useState(false);

  const openHistorique = (at: any) => {
    setHistoriqueAt(at);
    setHistoriqueLoading(true);
    atApi.prolongations(at.id)
      .then(res => setHistoriqueList(res.data.data || []))
      .catch(() => setHistoriqueList([]))
      .finally(() => setHistoriqueLoading(false));
  };

  const [stats, setStats] = useState({ expireBientot: 0, expire: 0 });

  const loadStats = () => {
    atApi.list({ etat: 'TOUS', limit: 500 }).then(res => {
      const all = res.data.data || [];
      const expireBientot = all.filter((a: any) => a.etat === 'NON_APURE' && a.joursRestants <= (a.alerteJours ?? 90)).length;
      const expire = all.filter((a: any) => a.etat === 'EXPIRE').length;
      setStats({ expireBientot, expire });
    }).catch(() => {});
  };

  const load = () => {
    setLoading(true);
    const params: any = { page, limit };
    if (appliedSearch) params.search = appliedSearch;
    if (etatFiltre) params.etat = etatFiltre;
    atApi.list(params)
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, limit, appliedSearch, etatFiltre]);

  useEffect(() => {
    clientsApi.list({ limit: 500 }).then(r => setClients(r.data.data || [])).catch(() => {});
    dossiersApi.list({ limit: 500 }).then(r => setDossiers(r.data.data || [])).catch(() => {});
    loadStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (at: any) => {
    setEditing(at);
    setForm({
      clientId: at.clientId || '', dossierId: at.dossiers?.[0]?.id || '', declarant: at.declarant || '',
      nature: at.nature || '', designation: at.designation || '',
      declarationEntree: at.declarationEntree || '', bureauEntree: at.bureauEntree || '',
      dateDeclaration: at.dateDeclaration ? at.dateDeclaration.slice(0, 10) : '',
      dateExpiration: at.dateExpiration ? at.dateExpiration.slice(0, 10) : '',
      delaiMois: at.delaiMois != null ? String(at.delaiMois) : '', alerteJours: at.alerteJours != null ? String(at.alerteJours) : '90',
      montantCaution: at.montantCaution != null ? String(at.montantCaution) : '', observations: at.observations || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        clientId: form.clientId || undefined,
        dossierId: form.dossierId || undefined,
        delaiMois: form.delaiMois ? Number(form.delaiMois) : undefined,
        alerteJours: form.alerteJours ? Number(form.alerteJours) : undefined,
        montantCaution: form.montantCaution ? Number(form.montantCaution) : undefined,
      };
      if (editing) {
        await atApi.update(editing.id, data);
        toast.success('AT modifiée');
      } else {
        await atApi.create(data);
        toast.success('AT créée');
      }
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const archiverCertificat = async (
    type: 'PROLONGATION' | 'APUREMENT',
    at: any,
    data: any,
    description: string
  ) => {
    try {
      const { blob, filename } = await generateATCertBlob(type, {
        numero: at.numero,
        designation: at.designation,
        nature: at.nature,
        dossierNumero: at.dossiers?.[0]?.numero,
        clientNom: at.client?.raisonSociale,
      }, data);

      downloadBlob(blob, filename);

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('categorie', type === 'PROLONGATION' ? 'CERTIFICAT_PROLONGATION_AT' : 'CERTIFICAT_APUREMENT_AT');
      formData.append('admissionTemporaireId', at.id);
      formData.append('description', description);
      await documentsApi.upload(formData);
      toast.success('Certificat PDF archivé dans les Archives Numériques');
    } catch {
      toast.error('Certificat généré mais non archivé (erreur d\'archivage)');
    }
  };

  const handleProlonger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prolongerAt) return;
    if (!prolongerForm.nouvelleDateExpiration || !prolongerForm.nouveauNumeroDeclaration) {
      toast.error('Nouvelle date d\'échéance et N° Nouveau Déclaration requis');
      return;
    }
    try {
      await atApi.prolonger(prolongerAt.id, prolongerForm);
      toast.success('AT prolongée');
      const at = prolongerAt;
      const dateProlongation = new Date().toISOString();
      setProlongerAt(null);
      setProlongerForm({ nouvelleDateExpiration: '', nouveauNumeroDeclaration: '' });
      load();
      loadStats();
      archiverCertificat('PROLONGATION', at, {
        dateProlongation,
        ancienneDateExpiration: at.dateExpiration,
        nouvelleDateExpiration: prolongerForm.nouvelleDateExpiration,
        ancienNumeroDeclaration: at.declarationEntree,
        nouveauNumeroDeclaration: prolongerForm.nouveauNumeroDeclaration,
      }, `Certificat de prolongation — AT ${at.numero}`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleApurer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apurerAt) return;
    if (!apurerForm.dateApurement) { toast.error('Date d\'apurement requise'); return; }
    try {
      await atApi.apurer(apurerAt.id, {
        dateApurement: apurerForm.dateApurement,
        referenceApurement: apurerForm.referenceApurement || undefined,
      });
      toast.success('AT apurée');
      const at = apurerAt;
      const dateApurement = apurerForm.dateApurement;
      const referenceApurement = apurerForm.referenceApurement;
      setApurerAt(null);
      setApurerForm({ dateApurement: new Date().toISOString().slice(0, 10), referenceApurement: '' });
      load();
      loadStats();
      archiverCertificat('APUREMENT', at, { dateApurement, referenceApurement }, `Certificat d'apurement — AT ${at.numero}`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admissions Temporaires</h1>
            <p className="text-sm text-gray-500">Suivi des AT non apurées, expirées et historique d&apos;apurement</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="stat-card !p-3 !bg-red-50 dark:!bg-red-900/20 border border-red-200 dark:border-red-800 text-center min-w-[130px]">
              <p className="text-[10px] text-red-700 dark:text-red-300 uppercase font-semibold">AT expire bientôt</p>
              <p className="text-xl font-bold text-red-600">{stats.expireBientot}</p>
            </div>
            <div className="stat-card !p-3 !bg-red-50 dark:!bg-red-900/20 border border-red-200 dark:border-red-800 text-center min-w-[130px]">
              <p className="text-[10px] text-red-700 dark:text-red-300 uppercase font-semibold">AT expiré</p>
              <p className="text-xl font-bold text-red-600">{stats.expire}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/at/historique" className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Historique AT
            </Link>
            <button onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouvelle AT
            </button>
          </div>
        </div>

        <div className="card !p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="label">Recherche</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="N° AT, désignation, déclarant..." />
            </div>
            <div>
              <label className="label">Etat</label>
              <select value={etatFiltre} onChange={e => { setEtatFiltre(e.target.value); setPage(1); }} className="input-field w-48">
                <option value="">Non apurées + Expirées</option>
                <option value="NON_APURE">Non apuré uniquement</option>
                <option value="EXPIRE">Expiré uniquement</option>
                <option value="TOUS">Toutes (y compris apurées)</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">Afficher</button>
          </form>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Id. AT</th>
                <th className="table-header">Date Création</th>
                <th className="table-header">N° Dossier</th>
                <th className="table-header">Client</th>
                <th className="table-header">Designation</th>
                <th className="table-header">Declarant</th>
                <th className="table-header">N° déclaration</th>
                <th className="table-header">Nature</th>
                <th className="table-header">Bureau</th>
                <th className="table-header">Date déclaration</th>
                <th className="table-header">Date Échéance</th>
                <th className="table-header">Delais</th>
                <th className="table-header">Temps Alerte</th>
                <th className="table-header">Temps Restant</th>
                <th className="table-header text-right">Montant Garantie</th>
                <th className="table-header">Etat</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={17} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={17} className="text-center py-12 text-gray-500">Aucune admission temporaire trouvée</td></tr>
              ) : items.map(at => {
                const enAlerte = at.etat !== 'APURE' && at.joursRestants <= (at.alerteJours ?? 90);
                const rowClass = at.etat === 'EXPIRE' ? 'text-red-600' : enAlerte ? 'text-amber-600' : '';
                return (
                  <tr key={at.id} className={`table-row ${rowClass}`}>
                    <td className="table-cell font-medium text-primary-600" data-label="Id. AT">{at.numero}</td>
                    <td className="table-cell text-xs" data-label="Date Création">{fmtDate(at.dateCreation)}</td>
                    <td className="table-cell font-mono text-xs" data-label="N° Dossier">
                      {at.dossiers?.[0] ? <Link href={`/dossiers/${at.dossiers[0].id}`} className="text-primary-600 hover:underline">{at.dossiers[0].numero}</Link> : '-'}
                    </td>
                    <td className="table-cell" data-label="Client">{at.client?.raisonSociale || '-'}</td>
                    <td className="table-cell" data-label="Designation">{at.designation}</td>
                    <td className="table-cell" data-label="Declarant">{at.declarant || '-'}</td>
                    <td className="table-cell font-mono text-xs" data-label="N° déclaration">{at.declarationEntree || '-'}</td>
                    <td className="table-cell" data-label="Nature">{at.nature || '-'}</td>
                    <td className="table-cell" data-label="Bureau">{at.bureauEntree || '-'}</td>
                    <td className="table-cell text-xs" data-label="Date déclaration">{fmtDate(at.dateDeclaration)}</td>
                    <td className="table-cell text-xs" data-label="Date Échéance">{fmtDate(at.dateExpiration)}</td>
                    <td className="table-cell text-center" data-label="Delais">{at.delaiMois != null ? `${at.delaiMois} Mois` : '-'}</td>
                    <td className="table-cell text-center" data-label="Temps Alerte">{at.alerteJours != null ? `${at.alerteJours} Jour(s)` : '-'}</td>
                    <td className={`table-cell text-center font-semibold ${rowClass}`} data-label="Temps Restant">{at.joursRestants} Jours</td>
                    <td className="table-cell text-right font-mono" data-label="Montant Garantie">{fmt(at.montantCaution)}</td>
                    <td className="table-cell" data-label="Etat"><span className={`badge ${ETAT_BADGE[at.etat]}`}>{ETAT_LABELS[at.etat]}</span></td>
                    <td className="table-cell" data-label="Actions">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(at)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => openHistorique(at)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Historique des prolongations">
                          <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </button>
                        {at.etat !== 'APURE' && (
                          <>
                            <button onClick={() => setProlongerAt(at)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Prolonger">
                              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button onClick={() => setApurerAt(at)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Apurer">
                              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-surface-700">
            <span className="text-xs text-gray-500">Compteur : {total}</span>
          </div>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>

        {/* Modal création / édition */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">{editing ? `Modifier ${editing.numero}` : 'Nouvelle AT'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="label">Désignation *</label><input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" required /></div>
                  <div>
                    <label className="label">Client</label>
                    <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="input-field">
                      <option value="">-- Aucun --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Dossier *</label>
                    <select value={form.dossierId} onChange={e => setForm({ ...form, dossierId: e.target.value })} className="input-field" required={!editing}>
                      <option value="">-- Sélectionner --</option>
                      {dossiers.map(d => <option key={d.id} value={d.id}>{d.numero}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Déclarant</label><input type="text" value={form.declarant} onChange={e => setForm({ ...form, declarant: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Nature</label><input type="text" value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value })} className="input-field" /></div>
                  <div><label className="label">N° déclaration</label><input type="text" value={form.declarationEntree} onChange={e => setForm({ ...form, declarationEntree: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Bureau</label><input type="text" value={form.bureauEntree} onChange={e => setForm({ ...form, bureauEntree: e.target.value })} className="input-field" placeholder="CIAB7" /></div>
                  <div><label className="label">Date déclaration</label><input type="date" value={form.dateDeclaration} onChange={e => setForm({ ...form, dateDeclaration: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Date Échéance *</label><input type="date" value={form.dateExpiration} onChange={e => setForm({ ...form, dateExpiration: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Délais (mois)</label><input type="number" value={form.delaiMois} onChange={e => setForm({ ...form, delaiMois: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Temps Alerte (jours)</label><input type="number" value={form.alerteJours} onChange={e => setForm({ ...form, alerteJours: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Montant Garantie</label><input type="number" value={form.montantCaution} onChange={e => setForm({ ...form, montantCaution: e.target.value })} className="input-field" /></div>
                  <div className="col-span-2"><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Fiche Prolongation */}
        {prolongerAt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 bg-amber-600 text-white">
                <h2 className="text-base font-bold">Fiche Prolongation</h2>
                <button onClick={() => setProlongerAt(null)} className="p-1 rounded hover:bg-white/10"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleProlonger} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Date Déclaration</label><input type="text" readOnly value={fmtDate(prolongerAt.dateDeclaration)} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                  <div><label className="label">Date Échéance actuelle</label><input type="text" readOnly value={fmtDate(prolongerAt.dateExpiration)} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                  <div><label className="label">Nature du dossier</label><input type="text" readOnly value={prolongerAt.nature || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                  <div><label className="label">Désignation du document</label><input type="text" readOnly value={prolongerAt.designation || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                  <div><label className="label">Dossier</label><input type="text" readOnly value={prolongerAt.dossiers?.[0]?.numero || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                  <div><label className="label">Etat AT</label><input type="text" readOnly value={ETAT_LABELS[prolongerAt.etat]} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                  <div className="col-span-2"><label className="label">N° Ancien Déclaration</label><input type="text" readOnly value={prolongerAt.declarationEntree || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-surface-700">
                  <div>
                    <label className="label text-amber-600 font-semibold">Nouvelle Date Échéance *</label>
                    <input type="date" value={prolongerForm.nouvelleDateExpiration} onChange={e => setProlongerForm({ ...prolongerForm, nouvelleDateExpiration: e.target.value })} className="input-field !bg-amber-50 dark:!bg-amber-900/20 border-amber-300" required />
                  </div>
                  <div>
                    <label className="label text-amber-600 font-semibold">N° Nouveau Déclaration *</label>
                    <input type="text" value={prolongerForm.nouveauNumeroDeclaration} onChange={e => setProlongerForm({ ...prolongerForm, nouveauNumeroDeclaration: e.target.value })} className="input-field !bg-amber-50 dark:!bg-amber-900/20 border-amber-300" required />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setProlongerAt(null)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary !bg-amber-600 hover:!bg-amber-700">Valider</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Fiche Apurement (fermeture définitive) */}
        {apurerAt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-3 bg-green-600 text-white">
                <h2 className="text-base font-bold">Fiche Apurement</h2>
                <button onClick={() => setApurerAt(null)} className="p-1 rounded hover:bg-white/10"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleApurer} className="p-6 space-y-4">
                <div><label className="label">Dossier</label><input type="text" readOnly value={apurerAt.dossiers?.[0]?.numero || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                <div><label className="label">Désignation</label><input type="text" readOnly value={apurerAt.designation || '-'} className="input-field bg-gray-100 dark:bg-surface-700" /></div>
                <div>
                  <label className="label text-red-600 font-semibold">Date d&apos;apurement *</label>
                  <input type="date" value={apurerForm.dateApurement} onChange={e => setApurerForm({ ...apurerForm, dateApurement: e.target.value })} className="input-field !bg-red-50 dark:!bg-red-900/20 border-red-300" required />
                </div>
                <div><label className="label">Référence apurement</label><input type="text" value={apurerForm.referenceApurement} onChange={e => setApurerForm({ ...apurerForm, referenceApurement: e.target.value })} className="input-field" /></div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setApurerAt(null)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-success">Valider</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Historique des Prolongations */}
        {historiqueAt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <div>
                  <h2 className="text-lg font-bold">Historique des prolongations</h2>
                  <p className="text-sm text-gray-500">{historiqueAt.numero} — {historiqueAt.designation}</p>
                </div>
                <button onClick={() => setHistoriqueAt(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-6">
                <div className="table-container !shadow-none !border-0">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Date Prolongation</th>
                        <th className="table-header">Ancienne Échéance</th>
                        <th className="table-header">Nouvelle Échéance</th>
                        <th className="table-header">Ancien N° Déclaration</th>
                        <th className="table-header">Nouveau N° Déclaration</th>
                        <th className="table-header text-center">Durée ajoutée</th>
                        <th className="table-header">Utilisateur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historiqueLoading ? (
                        <tr><td colSpan={7} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
                      ) : historiqueList.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucune prolongation enregistrée pour cette AT</td></tr>
                      ) : historiqueList.map(h => (
                        <tr key={h.id} className="table-row">
                          <td className="table-cell text-xs" data-label="Date Prolongation">{fmtDate(h.dateProlongation)}</td>
                          <td className="table-cell text-xs" data-label="Ancienne Échéance">{fmtDate(h.ancienneDateExpiration)}</td>
                          <td className="table-cell text-xs font-medium text-primary-600" data-label="Nouvelle Échéance">{fmtDate(h.nouvelleDateExpiration)}</td>
                          <td className="table-cell font-mono text-xs" data-label="Ancien N° Déclaration">{h.ancienNumeroDeclaration || '-'}</td>
                          <td className="table-cell font-mono text-xs font-medium text-primary-600" data-label="Nouveau N° Déclaration">{h.nouveauNumeroDeclaration}</td>
                          <td className="table-cell text-center" data-label="Durée ajoutée">{h.dureeProlongationJours} Jours</td>
                          <td className="table-cell text-xs" data-label="Utilisateur">{h.utilisateur || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
