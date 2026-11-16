'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, Tiers, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import FicheDetail from '@/components/ui/FicheDetail';
import FiltresDepliables from '@/components/ui/FiltresDepliables';
import PickerField from '@/components/ui/PickerField';
import RowActionsMenu, { ActionsButton, openRowMenu, RowMenuState, RowAction } from '@/components/ui/RowActionsMenu';
import { atApi, clientsApi, dossiersApi, documentsApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import { generateATCertBlob, downloadBlob } from '@/lib/generateATPdf';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const ETAT_LABELS: Record<string, string> = { NON_APURE: 'Non apuré', EXPIRE: 'Expiré', APURE: 'Apuré' };
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
  const [detail, setDetail] = useState<any | null>(null);

  const loadStats = () => {
    atApi.list({ etat: 'TOUS', limit: 500 }).then(res => {
      const all = res.data.data || [];
      const expireBientot = all.filter((a: any) => a.etat === 'NON_APURE' && a.joursRestants <= (a.alerteJours ?? 90)).length;
      const expire = all.filter((a: any) => a.etat === 'EXPIRE').length;
      setStats({ expireBientot, expire });
    }).catch(() => {});
  };

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { page, limit };
    if (appliedSearch) params.search = appliedSearch;
    if (etatFiltre) params.etat = etatFiltre;
    atApi.list(params)
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page, limit, appliedSearch, etatFiltre]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    clientsApi.listRef().then(r => setClients(r.data.data || [])).catch(() => {});
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
    loadStats();
  }, []);

  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));
  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / limit));

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

  const alerte = (at: any) => at.etat !== 'APURE' && at.joursRestants <= (at.alerteJours ?? 90);
  const tonRestant = (at: any) => (at.etat === 'EXPIRE' ? 'text-red-600' : alerte(at) ? 'text-amber-600' : 'text-gray-500');
  const dossierDe = (at: any) => at.dossiers?.[0];
  const numDossier = (at: any) => (dossierDe(at) ? dossierDe(at).numeroPhysique || dossierDe(at).numero : null);

  const colonnes: Colonne<any>[] = [
    { cle: 'at', libelle: 'AT', rendu: at => <DoubleLigne mono haut={at.numero} bas={fmtDate(at.dateCreation)} />, texte: at => at.numero },
    { cle: 'client', libelle: 'Client', rendu: at => <Tiers nom={at.client?.raisonSociale} detail={numDossier(at) ? `Dossier ${numDossier(at)}` : undefined} />, texte: at => at.client?.raisonSociale || '' },
    { cle: 'designation', libelle: 'Désignation', masquerSous: 'xl', rendu: at => <DoubleLigne haut={<span className="font-medium">{at.designation}</span>} bas={at.nature} />, texte: at => at.designation || '' },
    { cle: 'echeance', libelle: 'Échéance', rendu: at => <div className="leading-tight"><div>{fmtDate(at.dateExpiration)}</div><div className={`mt-0.5 text-xs font-semibold ${tonRestant(at)}`}>{at.etat === 'APURE' ? 'Apurée' : `${at.joursRestants} j restants`}</div></div>, texte: at => fmtDate(at.dateExpiration) },
    { cle: 'garantie', libelle: 'Garantie', align: 'right', masquerSous: '2xl', rendu: at => <Montant valeur={at.montantCaution} />, texte: at => String(at.montantCaution ?? '') },
    { cle: 'etat', libelle: 'État', rendu: at => <StatutPastille libelle={ETAT_LABELS[at.etat] || at.etat} ton={tonDepuisBadge(ETAT_BADGE[at.etat])} />, texte: at => ETAT_LABELS[at.etat] || at.etat },
  ];

  const vide = <EmptyState titre="Aucune admission temporaire" description="Créez une AT pour suivre son échéance et son apurement." action={<button type="button" onClick={openCreate} className="btn-primary">Nouvelle AT</button>} />;

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Admissions temporaires"
          sousTitre="Non apurées, expirées et historique"
          sousTitreMasqueMobile
          actions={
            <>
              <Link href="/at/historique" className="btn-secondary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">Historique</Link>
              <button type="button" onClick={openCreate} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="sm:hidden">Nouvelle</span><span className="hidden sm:inline">Nouvelle AT</span>
              </button>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="card !p-2.5 sm:!p-3 text-center"><div className="text-lg sm:text-xl font-bold tabular-nums text-amber-600">{stats.expireBientot}</div><div className="text-[11px] text-gray-500">Expirent bientôt</div></div>
          <div className="card !p-2.5 sm:!p-3 text-center"><div className="text-lg sm:text-xl font-bold tabular-nums text-red-600">{stats.expire}</div><div className="text-[11px] text-gray-500">Expirées</div></div>
        </div>

        <FiltresDepliables actifs={(appliedSearch ? 1 : 0) + (etatFiltre ? 1 : 0)}>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_16rem_auto] gap-3 items-end">
              <div><label className="label">Recherche</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="N° AT, désignation, déclarant..." /></div>
              <div>
                <label className="label">Situation</label>
                <select value={etatFiltre} onChange={e => { setEtatFiltre(e.target.value); setPage(1); }} className="input-field">
                  <option value="">Non apurées + expirées</option>
                  <option value="NON_APURE">Non apurées uniquement</option>
                  <option value="EXPIRE">Expirées uniquement</option>
                  <option value="TOUS">Toutes (apurées incluses)</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full sm:w-auto">Afficher</button>
            </div>
          </form>
        </FiltresDepliables>

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={items}
            cleLigne={(at) => at.id}
            onClicLigne={setDetail}
            chargement={loading}
            nomExport="admissions-temporaires"
            actionsToujoursVisibles
            actions={(at) => <ActionsButton onOpen={(e) => openAtMenu(e, at)} />}
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-28" />)
          ) : items.length === 0 ? (
            <div className="card">{vide}</div>
          ) : items.map(at => (
            <div key={at.id} className="card !p-0 overflow-hidden">
              <button type="button" onClick={() => setDetail(at)} className="w-full text-left px-4 pt-3 pb-2 space-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-primary-600 dark:text-primary-300 truncate">{at.numero}</span>
                  <StatutPastille libelle={ETAT_LABELS[at.etat] || at.etat} ton={tonDepuisBadge(ETAT_BADGE[at.etat])} />
                </span>
                <span className="block text-[13px] font-medium text-gray-900 dark:text-white line-clamp-2">{at.designation}</span>
                <span className="block text-xs text-gray-500 truncate">{at.client?.raisonSociale || '—'}{numDossier(at) ? ` · ${numDossier(at)}` : ''}</span>
                <span className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Échéance {fmtDate(at.dateExpiration)}</span>
                  <span className={`font-semibold ${tonRestant(at)}`}>{at.etat === 'APURE' ? 'Apurée' : `${at.joursRestants} j restants`}</span>
                </span>
              </button>
              <div className="flex justify-end px-4 pb-3"><ActionsButton onOpen={(e) => openAtMenu(e, at)} /></div>
            </div>
          ))}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} /></div>
        </div>
      </div>

      {/* Détail d'une AT */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.designation || 'Admission temporaire'} description={detail?.numero}>
        {detail && (
          <FicheDetail
            mise={{ libelle: detail.etat === 'APURE' ? 'Apurée' : 'Temps restant', valeur: detail.etat === 'APURE' ? '—' : `${detail.joursRestants} j`, ton: detail.etat === 'EXPIRE' ? 'negatif' : alerte(detail) ? 'neutre' : 'positif' }}
            lignes={[
              ['Client', detail.client?.raisonSociale],
              ['Dossier', numDossier(detail)],
              ['Déclarant', detail.declarant],
              ['Nature', detail.nature],
              ['N° déclaration', detail.declarationEntree],
              ['Bureau', detail.bureauEntree],
              ['Date de déclaration', detail.dateDeclaration ? fmtDate(detail.dateDeclaration) : null],
              ['Échéance', fmtDate(detail.dateExpiration)],
              ['Délai', detail.delaiMois != null ? `${detail.delaiMois} mois` : null],
              ['Alerte', detail.alerteJours != null ? `${detail.alerteJours} jours avant` : null],
              ['Montant de la garantie', detail.montantCaution ? `${fmt(detail.montantCaution)} F` : null],
              ['Observations', detail.observations],
              ['État', ETAT_LABELS[detail.etat] || detail.etat],
            ]}
          />
        )}
      </Modal>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Modifier ${editing.numero}` : 'Nouvelle admission temporaire'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-at" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</button>
          </>
        }
      >
        <form id="form-at" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="label">Désignation *</label><input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" required /></div>
            <div>
              <label className="label">Client</label>
              <PickerField value={form.clientId} onChange={id => setForm({ ...form, clientId: id })} options={clientOptions} placeholder="-- Aucun --" title="Sélectionner un client" searchPlaceholder="Raison sociale..." />
            </div>
            <div>
              <label className="label">Dossier *</label>
              <PickerField value={form.dossierId} onChange={id => setForm({ ...form, dossierId: id })} options={dossierOptions} placeholder="-- Sélectionner --" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." />
            </div>
            <div><label className="label">Déclarant</label><input type="text" value={form.declarant} onChange={e => setForm({ ...form, declarant: e.target.value })} className="input-field" /></div>
            <div><label className="label">Nature</label><input type="text" value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value })} className="input-field" /></div>
            <div><label className="label">N° déclaration</label><input type="text" value={form.declarationEntree} onChange={e => setForm({ ...form, declarationEntree: e.target.value })} className="input-field" /></div>
            <div><label className="label">Bureau</label><input type="text" value={form.bureauEntree} onChange={e => setForm({ ...form, bureauEntree: e.target.value })} className="input-field" /></div>
            <div><label className="label">Date de déclaration</label><input type="date" value={form.dateDeclaration} onChange={e => setForm({ ...form, dateDeclaration: e.target.value })} className="input-field" /></div>
            <div><label className="label">Date d&apos;échéance *</label><input type="date" value={form.dateExpiration} onChange={e => setForm({ ...form, dateExpiration: e.target.value })} className="input-field" required /></div>
            <div><label className="label">Délai (mois)</label><input type="number" value={form.delaiMois} onChange={e => setForm({ ...form, delaiMois: e.target.value })} className="input-field" /></div>
            <div><label className="label">Alerte (jours avant)</label><input type="number" value={form.alerteJours} onChange={e => setForm({ ...form, alerteJours: e.target.value })} className="input-field" /></div>
            <div><label className="label">Montant garantie (F CFA)</label><input type="text" inputMode="numeric" value={form.montantCaution ? fmt(form.montantCaution) : ''} onChange={e => setForm({ ...form, montantCaution: e.target.value.replace(/\D/g, '') })} className="input-field" placeholder="0" /></div>
            <div className="sm:col-span-2"><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!prolongerAt}
        onClose={() => setProlongerAt(null)}
        title="Prolonger l'admission temporaire"
        description={prolongerAt ? `${prolongerAt.numero} — échéance actuelle ${fmtDate(prolongerAt.dateExpiration)}` : undefined}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setProlongerAt(null)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-prolonger" className="btn-primary !bg-amber-600 hover:!bg-amber-700">Valider la prolongation</button>
          </>
        }
      >
        {prolongerAt && (
          <form id="form-prolonger" onSubmit={handleProlonger} className="space-y-4">
            <dl className="divide-y divide-gray-100 dark:divide-surface-700 text-sm rounded-xl border border-gray-100 dark:border-surface-700 px-3">
              {([
                ['Désignation', prolongerAt.designation],
                ['Dossier', numDossier(prolongerAt)],
                ['Nature', prolongerAt.nature],
                ['Date de déclaration', prolongerAt.dateDeclaration ? fmtDate(prolongerAt.dateDeclaration) : null],
                ['Ancien N° déclaration', prolongerAt.declarationEntree],
                ['État', ETAT_LABELS[prolongerAt.etat]],
              ] as [string, any][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-gray-500">{k}</dt><dd className="text-right font-medium break-words">{v}</dd></div>
              ))}
            </dl>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-amber-600 font-semibold">Nouvelle date d&apos;échéance *</label>
                <input type="date" value={prolongerForm.nouvelleDateExpiration} onChange={e => setProlongerForm({ ...prolongerForm, nouvelleDateExpiration: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="label text-amber-600 font-semibold">Nouveau N° de déclaration *</label>
                <input type="text" value={prolongerForm.nouveauNumeroDeclaration} onChange={e => setProlongerForm({ ...prolongerForm, nouveauNumeroDeclaration: e.target.value })} className="input-field" required />
              </div>
            </div>
            <label className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 w-fit ${canSignature ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} title={!canSignature ? 'Permission requise : DOCUMENTS:SIGNATURE' : undefined}>
              <input type="checkbox" checked={prolongerForm.afficherSignature} disabled={!canSignature} onChange={e => setProlongerForm({ ...prolongerForm, afficherSignature: e.target.checked })} className="rounded border-gray-300" />
              Afficher la signature sur le certificat
            </label>
          </form>
        )}
      </Modal>

      <Modal
        open={!!apurerAt}
        onClose={() => setApurerAt(null)}
        title="Apurer l'admission temporaire"
        description={apurerAt ? `${apurerAt.numero} — ${apurerAt.designation || ''}` : undefined}
        footer={
          <>
            <button type="button" onClick={() => setApurerAt(null)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-apurer" className="btn-success">Valider l&apos;apurement</button>
          </>
        }
      >
        {apurerAt && (
          <form id="form-apurer" onSubmit={handleApurer} className="space-y-4">
            {numDossier(apurerAt) && <p className="text-sm text-gray-500">Dossier <span className="font-medium text-gray-900 dark:text-white">{numDossier(apurerAt)}</span></p>}
            <div>
              <label className="label text-red-600 font-semibold">Date d&apos;apurement *</label>
              <input type="date" value={apurerForm.dateApurement} onChange={e => setApurerForm({ ...apurerForm, dateApurement: e.target.value })} className="input-field" required />
            </div>
            <div><label className="label">Référence d&apos;apurement</label><input type="text" value={apurerForm.referenceApurement} onChange={e => setApurerForm({ ...apurerForm, referenceApurement: e.target.value })} className="input-field" /></div>
            <label className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 w-fit ${canSignature ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} title={!canSignature ? 'Permission requise : DOCUMENTS:SIGNATURE' : undefined}>
              <input type="checkbox" checked={apurerForm.afficherSignature} disabled={!canSignature} onChange={e => setApurerForm({ ...apurerForm, afficherSignature: e.target.checked })} className="rounded border-gray-300" />
              Afficher la signature sur le certificat
            </label>
          </form>
        )}
      </Modal>

      <Modal open={!!historiqueAt} onClose={() => setHistoriqueAt(null)} title="Historique des prolongations" description={historiqueAt ? `${historiqueAt.numero} — ${historiqueAt.designation}` : undefined} size="lg">
        {historiqueLoading ? (
          <div className="space-y-2">{[0, 1].map(i => <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-surface-700 animate-pulse" />)}</div>
        ) : historiqueList.length === 0 ? (
          <EmptyState titre="Aucune prolongation" description="Cette AT n'a pas encore été prolongée." />
        ) : (
          <ul className="space-y-2">
            {historiqueList.map(h => (
              <li key={h.id} className="rounded-xl border border-gray-100 dark:border-surface-700 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{fmtDate(h.dateProlongation)}</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">+{h.dureeProlongationJours} jours</span>
                </div>
                <div className="mt-1 text-gray-600 dark:text-gray-300">Échéance : {fmtDate(h.ancienneDateExpiration)} → <span className="font-medium text-primary-600">{fmtDate(h.nouvelleDateExpiration)}</span></div>
                <div className="text-xs text-gray-500">Déclaration : {h.ancienNumeroDeclaration || '—'} → <span className="font-mono font-medium">{h.nouveauNumeroDeclaration}</span>{h.utilisateur ? ` · ${h.utilisateur}` : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <RowActionsMenu state={rowMenu} onClose={() => setRowMenu(null)} />
    </AppLayout>
  );
}
