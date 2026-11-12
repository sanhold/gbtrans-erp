'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import PickerField from '@/components/ui/PickerField';
import RowActionsMenu, { ActionsButton, openRowMenu, RowMenuState, RowAction } from '@/components/ui/RowActionsMenu';
import { atApi, clientsApi, dossiersApi, documentsApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import { generateATCertBlob, downloadBlob } from '@/lib/generateATPdf';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import SheetActions from '@/components/forms/SheetActions';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import FiltersToggle from '@/components/forms/FiltersToggle';
import { ProlongationSheet, ApurementSheet, HistoriqueProlongationsSheet, ETAT_LABELS } from '@/components/at/ATSheets';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const ETAT_BADGE: Record<string, string> = { NON_APURE: 'badge-gray', EXPIRE: 'badge-danger', APURE: 'badge-success' };

const emptyForm = {
  clientId: '', dossierId: '', declarant: '', nature: '', designation: '',
  declarationEntree: '', bureauEntree: '', dateDeclaration: '', dateExpiration: '',
  delaiMois: '24', alerteJours: '90', montantCaution: '', observations: '',
};

export default function ATPage() {
  const { hasPermission } = useAuthStore();
  const canSignature = hasPermission('DOCUMENTS:SIGNATURE');
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
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [prolongerAt, setProlongerAt] = useState<any>(null);
  const [prolongerForm, setProlongerForm] = useState({ nouvelleDateExpiration: '', nouveauNumeroDeclaration: '', afficherSignature: false });

  const [apurerAt, setApurerAt] = useState<any>(null);
  const [apurerForm, setApurerForm] = useState({ dateApurement: new Date().toISOString().slice(0, 10), referenceApurement: '', afficherSignature: false });

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
    clientsApi.listRef().then(r => setClients(r.data.data || [])).catch(() => {});
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
    loadStats();
  }, []);

  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));
  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openAtMenu = (e: React.MouseEvent, at: any) => {
    const dossier = at.dossiers?.[0];
    const actions: RowAction[] = [
      { label: 'Modifier', onClick: () => openEdit(at) },
      { label: 'Historique des prolongations', onClick: () => openHistorique(at) },
      { label: 'Prolonger', onClick: () => setProlongerAt(at), hidden: at.etat === 'APURE' },
      { label: 'Apurer', onClick: () => setApurerAt(at), hidden: at.etat === 'APURE', tone: 'text-green-700' },
    ];
    openRowMenu(setRowMenu, e, [
      { label: 'AT', value: at.numero },
      { label: 'Client', value: at.client?.raisonSociale || '-' },
      { label: 'Dossier', value: dossier ? (dossier.numeroPhysique || dossier.numero) : '-' },
    ], actions);
  };

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
    description: string,
    afficherSignature?: boolean
  ) => {
    try {
      const { blob, filename } = await generateATCertBlob(type, {
        numero: at.numero,
        designation: at.designation,
        nature: at.nature,
        dossierNumero: at.dossiers?.[0]?.numeroPhysique || at.dossiers?.[0]?.numero,
        clientNom: at.client?.raisonSociale,
      }, data, canSignature && afficherSignature);

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
      const afficherSignature = prolongerForm.afficherSignature;
      setProlongerAt(null);
      setProlongerForm({ nouvelleDateExpiration: '', nouveauNumeroDeclaration: '', afficherSignature: false });
      load();
      loadStats();
      archiverCertificat('PROLONGATION', at, {
        dateProlongation,
        ancienneDateExpiration: at.dateExpiration,
        nouvelleDateExpiration: prolongerForm.nouvelleDateExpiration,
        ancienNumeroDeclaration: at.declarationEntree,
        nouveauNumeroDeclaration: prolongerForm.nouveauNumeroDeclaration,
      }, `Certificat de prolongation — AT ${at.numero}`, afficherSignature);
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
      const afficherSignature = apurerForm.afficherSignature;
      setApurerAt(null);
      setApurerForm({ dateApurement: new Date().toISOString().slice(0, 10), referenceApurement: '', afficherSignature: false });
      load();
      loadStats();
      archiverCertificat('APUREMENT', at, { dateApurement, referenceApurement }, `Certificat d'apurement — AT ${at.numero}`, afficherSignature);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Admissions temporaires"
          subtitle="Non apurées, expirées & historique"
          secondaryActions={[{ label: 'Historique AT', href: '/at/historique' }]}
          actions={<button type="button" onClick={openCreate} className="btn-primary hidden lg:inline-flex">
            <svg aria-hidden="true" className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvel AT
          </button>}
        />
        <div className="flex flex-wrap gap-2" aria-label="Alertes">
          <span className="badge badge-danger !text-xs md:!text-[13px] md:!text-[11px]">À échéance proche : {stats.expireBientot}</span>
          <span className="badge badge-danger !text-xs md:!text-[13px] md:!text-[11px]">Expirées : {stats.expire}</span>
        </div>
        <FiltersToggle count={(appliedSearch ? 1 : 0) + (etatFiltre ? 1 : 0)}>
          <div className="card !p-3">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center gap-2">
              <input type="search" value={search} onChange={e => setSearch(e.target.value)} className="input-field md:!py-1.5 md:text-xs md:w-64" placeholder="N° AT, désignation, déclarant..." aria-label="Rechercher une AT" />
              <select value={etatFiltre} onChange={e => { setEtatFiltre(e.target.value); setPage(1); }} aria-label="État" className="input-field md:!py-1.5 md:text-xs md:w-56 min-w-0">
                <option value="">Non apurées + Expirées</option>
                <option value="NON_APURE">Non apuré uniquement</option>
                <option value="EXPIRE">Expiré uniquement</option>
                <option value="TOUS">Toutes (y compris apurées)</option>
              </select>
              <button type="submit" className="btn-primary min-h-[44px] md:min-h-0 md:!py-1.5 md:text-xs">Afficher</button>
            </form>
          </div>
        </FiltersToggle>

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '5%' }} />
              </colgroup>
            <thead>
              <tr>
                <th className="table-header !text-[10px] !px-1.5 truncate">Actions</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Id. AT</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Date Créat.</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">N° Dossier</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Client</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Designation</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Declarant</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">N° déclar.</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Nature</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Bureau</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Date décl.</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Échéance</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Délais</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Alerte</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Restant</th>
                <th className="table-header !text-[10px] !px-1.5 truncate text-right">Garantie</th>
                <th className="table-header !text-[10px] !px-1.5 truncate">Etat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={17} />
              ) : items.length === 0 ? (
                <tr><td colSpan={17} className="text-center py-12 text-gray-500">Aucune admission temporaire trouvée<br /><button type="button" onClick={openCreate} className="btn-primary mt-3">Nouvel AT</button></td></tr>
              ) : items.map(at => {
                const enAlerte = at.etat !== 'APURE' && at.joursRestants <= (at.alerteJours ?? 90);
                const rowClass = at.etat === 'EXPIRE' ? 'text-red-600' : enAlerte ? 'text-amber-600' : '';
                return (
                  <tr key={at.id} className={`table-row cursor-pointer ${rowClass}`} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; openAtMenu(e, at); }}>
                    <td className="table-cell !px-1" data-label="Actions">
                      <ActionsButton onOpen={(e) => openAtMenu(e, at)} />
                    </td>
                    <td className="table-cell font-medium text-primary-600 !px-1.5 !text-[13px] md:!text-[11px] truncate" data-label="Id. AT" title={at.numero}>{at.numero}</td>
                    <td className="table-cell !text-[13px] md:!text-[10.5px] !px-1.5 truncate col-opt" data-label="Date Création">{fmtDate(at.dateCreation)}</td>
                    <td className="table-cell font-mono !text-[13px] md:!text-[10.5px] !px-1.5 truncate col-opt" data-label="N° Dossier">
                      {at.dossiers?.[0] ? <Link href={`/dossiers/${at.dossiers[0].id}`} className="text-primary-600 hover:underline">{at.dossiers[0].numeroPhysique || at.dossiers[0].numero}</Link> : '-'}
                    </td>
                    <td className="table-cell !px-1.5 !text-[13px] md:!text-[11px] truncate" data-label="Client" title={at.client?.raisonSociale || undefined}>{at.client?.raisonSociale || '-'}</td>
                    <td className="table-cell !px-1.5 !text-[13px] md:!text-[11px] truncate" data-label="Designation" title={at.designation}>{at.designation}</td>
                    <td className="table-cell !px-1.5 !text-[13px] md:!text-[11px] truncate col-opt" data-label="Declarant" title={at.declarant || undefined}>{at.declarant || '-'}</td>
                    <td className="table-cell font-mono !text-[13px] md:!text-[10.5px] !px-1.5 truncate col-opt" data-label="N° déclaration" title={at.declarationEntree || undefined}>{at.declarationEntree || '-'}</td>
                    <td className="table-cell !px-1.5 !text-[13px] md:!text-[11px] truncate col-opt" data-label="Nature" title={at.nature || undefined}>{at.nature || '-'}</td>
                    <td className="table-cell !px-1.5 !text-[13px] md:!text-[11px] truncate col-opt" data-label="Bureau" title={at.bureauEntree || undefined}>{at.bureauEntree || '-'}</td>
                    <td className="table-cell !text-[13px] md:!text-[10.5px] !px-1.5 truncate col-opt" data-label="Date déclaration">{fmtDate(at.dateDeclaration)}</td>
                    <td className="table-cell !text-[13px] md:!text-[10.5px] !px-1.5 truncate" data-label="Échéance">{fmtDate(at.dateExpiration)}</td>
                    <td className="table-cell text-center !text-[13px] md:!text-[10.5px] !px-1 truncate col-opt" data-label="Delais">{at.delaiMois != null ? `${at.delaiMois}m` : '-'}</td>
                    <td className="table-cell text-center !text-[13px] md:!text-[10.5px] !px-1 truncate col-opt" data-label="Temps Alerte">{at.alerteJours != null ? `${at.alerteJours}j` : '-'}</td>
                    <td className={`table-cell font-semibold !text-[13px] md:!text-[10.5px] !px-1 md:text-center ${rowClass}`} data-label="Temps restant">{at.etat === 'EXPIRE' ? 'Expiré' : `${at.joursRestants} j`}{at.etat !== 'APURE' && at.etat !== 'EXPIRE' && enAlerte ? <span className="md:hidden"> · échéance proche</span> : null}</td>
                    <td className="table-cell text-right font-mono !text-[13px] md:!text-[10.5px] !px-1.5 truncate col-opt" data-label="Montant Garantie">{fmt(at.montantCaution)}</td>
                    <td className="table-cell !px-1.5" data-label="État"><span className={`badge ${ETAT_BADGE[at.etat]} !text-xs md:!text-[10px] !px-1.5 !py-0 truncate`}>{ETAT_LABELS[at.etat]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-surface-700">
            <span className="text-xs text-gray-600 dark:text-gray-300">Total : {total}</span>
          </div>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>

        <Sheet open={showModal} onClose={() => setShowModal(false)} title={editing ? `Modifier ${editing.numero}` : 'Nouvel AT'} size="3xl">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><label className="label">Désignation *</label><input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" required /></div>
                  <div>
                    <label className="label">Client</label>
                    <PickerField value={form.clientId} onChange={id => setForm({ ...form, clientId: id })} options={clientOptions} placeholder="-- Aucun --" title="Sélectionner un client" searchPlaceholder="Raison sociale..." />
                  </div>
                  <div>
                    <label className="label">Dossier *</label>
                    <PickerField value={form.dossierId} onChange={id => setForm({ ...form, dossierId: id })} options={dossierOptions} placeholder="-- Sélectionner --" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." required={!editing} />
                  </div>
                  <div><label className="label">Déclarant</label><input type="text" value={form.declarant} onChange={e => setForm({ ...form, declarant: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Nature</label><input type="text" value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value })} className="input-field" /></div>
                  <div><label className="label">N° déclaration</label><input type="text" value={form.declarationEntree} onChange={e => setForm({ ...form, declarationEntree: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Bureau</label><input type="text" value={form.bureauEntree} onChange={e => setForm({ ...form, bureauEntree: e.target.value })} className="input-field" placeholder="CIAB7" /></div>
                  <div><label className="label">Date déclaration</label><input type="date" value={form.dateDeclaration} onChange={e => setForm({ ...form, dateDeclaration: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Date Échéance *</label><input type="date" value={form.dateExpiration} onChange={e => setForm({ ...form, dateExpiration: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Délais (mois)</label><input type="number" inputMode="decimal" value={form.delaiMois} onChange={e => setForm({ ...form, delaiMois: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Temps Alerte (jours)</label><input type="number" inputMode="decimal" value={form.alerteJours} onChange={e => setForm({ ...form, alerteJours: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Montant Garantie</label><input type="number" inputMode="decimal" value={form.montantCaution} onChange={e => setForm({ ...form, montantCaution: e.target.value })} className="input-field" /></div>
                  <div className="sm:col-span-2"><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
                </div>
                <SheetActions onCancel={() => setShowModal(false)} loading={saving} submitLabel={editing ? 'Modifier' : 'Créer'} />
              </form>
            
        </Sheet>

        <ProlongationSheet at={prolongerAt} form={prolongerForm} setForm={setProlongerForm} canSignature={canSignature} onClose={() => setProlongerAt(null)} onSubmit={handleProlonger} />
        <ApurementSheet at={apurerAt} form={apurerForm} setForm={setApurerForm} canSignature={canSignature} onClose={() => setApurerAt(null)} onSubmit={handleApurer} />
        <HistoriqueProlongationsSheet at={historiqueAt} list={historiqueList} loading={historiqueLoading} onClose={() => setHistoriqueAt(null)} />
        <FAB label="Nouvel AT" onClick={openCreate} />
      </div>
    <RowActionsMenu state={rowMenu} onClose={() => setRowMenu(null)} />
    </AppLayout>
  );
}
