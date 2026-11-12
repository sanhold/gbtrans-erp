'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import PickerField from '@/components/ui/PickerField';
import { courriersApi, modelesCourrierApi, dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUT_LABELS: Record<string, string> = { BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', RECU: 'Reçu', TRAITE: 'Traité', ARCHIVE: 'Archivé', ANNULE: 'Annulé' };
const STATUT_BADGE: Record<string, string> = { BROUILLON: 'badge-gray', ENVOYE: 'badge-info', RECU: 'badge-info', TRAITE: 'badge-success', ARCHIVE: 'badge-gray', ANNULE: 'badge-danger' };
const PRIORITE_LABELS: Record<string, string> = { BASSE: 'Basse', NORMALE: 'Normale', HAUTE: 'Haute', URGENTE: 'Urgente' };
const PRIORITE_BADGE: Record<string, string> = { BASSE: 'badge-gray', NORMALE: 'badge-info', HAUTE: 'badge-warning', URGENTE: 'badge-danger' };

const ICON_BTN = 'inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded hover:bg-gray-100 dark:hover:bg-surface-700';

const emptyForm = {
  modeleId: '', tiers: '', objet: '', contenu: '', priorite: 'NORMALE',
  dossierId: '', reference: '', statutInitial: '', dateEvenement: todayISO(), observations: '',
};

export default function CourriersPage() {
  const [tab, setTab] = useState<'ENTRANT' | 'SORTANT'>('ENTRANT');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statutFiltre, setStatutFiltre] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const confirmer = useConfirm();

  const [modeles, setModeles] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params: any = { page, limit, type: tab };
    if (appliedSearch) params.search = appliedSearch;
    if (statutFiltre) params.statut = statutFiltre;
    courriersApi.list(params)
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { load(); }, [tab, page, limit, appliedSearch, statutFiltre]);

  useEffect(() => {
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    modelesCourrierApi.list({ type: tab, actif: 'true' }).then(r => setModeles(r.data.data || [])).catch(() => setModeles([]));
  }, [tab]);

  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, statutInitial: tab === 'ENTRANT' ? 'RECU' : 'BROUILLON' });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      modeleId: '', tiers: (tab === 'ENTRANT' ? c.expediteur : c.destinataire) || '',
      objet: c.objet || '', contenu: c.contenu || '', priorite: c.priorite || 'NORMALE',
      dossierId: c.dossiers?.[0]?.dossier?.id || '', reference: c.reference || '',
      statutInitial: '', dateEvenement: todayISO(), observations: c.observations || '',
    });
    setShowModal(true);
  };

  const applyModele = (modeleId: string) => {
    const m = modeles.find(x => x.id === modeleId);
    setForm(f => ({ ...f, modeleId, objet: m?.objet || f.objet, contenu: m?.contenu || f.contenu }));
  };

  const applyDossier = (dossierId: string) => {
    const d = dossiers.find(x => x.id === dossierId);
    setForm(f => ({ ...f, dossierId, tiers: f.tiers || d?.client?.raisonSociale || '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.objet) { toast.error('Objet requis'); return; }
    setSaving(true);
    try {
      if (editing) {
        const data: any = {
          objet: form.objet, contenu: form.contenu, priorite: form.priorite,
          reference: form.reference || undefined, observations: form.observations || undefined,
          dossierId: form.dossierId || null,
          [tab === 'ENTRANT' ? 'expediteur' : 'destinataire']: form.tiers || undefined,
        };
        await courriersApi.update(editing.id, data);
        toast.success('Courrier modifié');
      } else {
        const data: any = {
          type: tab, objet: form.objet, contenu: form.contenu, priorite: form.priorite,
          reference: form.reference || undefined, observations: form.observations || undefined,
          dossierId: form.dossierId || undefined,
          statut: form.statutInitial,
          [tab === 'ENTRANT' ? 'expediteur' : 'destinataire']: form.tiers || undefined,
          [tab === 'ENTRANT' ? 'dateReception' : 'dateEnvoi']: form.statutInitial === (tab === 'ENTRANT' ? 'RECU' : 'ENVOYE') ? form.dateEvenement : undefined,
        };
        await courriersApi.create(data);
        toast.success('Courrier créé');
      }
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: any) => {
    if (!(await confirmer({ titre: `Supprimer le courrier ${c.numero} ?`, message: 'Cette action est irréversible.', danger: true, confirmer: 'Supprimer' }))) return;
    try { await courriersApi.delete(c.id); toast.success('Courrier supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleStatut = async (c: any, statut: string) => {
    try { await courriersApi.changerStatut(c.id, statut); toast.success('Statut modifié'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Courriers"
          subtitle={`${total} courrier(s) ${tab === 'ENTRANT' ? 'reçu(s)' : 'envoyé(s)'}`}
          secondaryActions={[{ label: 'Modèles de courrier', href: '/parametres/modeles-courrier' }]}
          actions={
            <button type="button" onClick={openCreate} className="btn-primary hidden lg:inline-flex">
              <svg aria-hidden="true" className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau courrier
            </button>
          }
        />

        <div className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-full sm:w-fit" role="tablist">
          {(['ENTRANT', 'SORTANT'] as const).map(t => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === t ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}>{t === 'ENTRANT' ? 'Reçus' : 'Envoyés'}</button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="card !p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1" placeholder="N°, objet, expéditeur/destinataire..." aria-label="Rechercher un courrier" />
            <button type="button" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters} className="btn-secondary sm:hidden">
              Filtres{statutFiltre ? ' (1)' : ''}
            </button>
            <select value={statutFiltre} onChange={e => { setStatutFiltre(e.target.value); setPage(1); }} className={`input-field sm:w-44 ${showFilters ? '' : 'max-sm:hidden'}`} aria-label="Filtrer par statut">
              <option value="">Tous statuts</option>
              {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button type="submit" className="btn-primary">Afficher</button>
          </div>
        </form>

        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Actions</th>
                <th className="table-header">N°</th>
                <th className="table-header">Date</th>
                <th className="table-header">{tab === 'ENTRANT' ? 'Expéditeur' : 'Destinataire'}</th>
                <th className="table-header">Objet</th>
                <th className="table-header">Dossier</th>
                <th className="table-header">Priorité</th>
                <th className="table-header">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={8} />
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-600">
                  <p className="mb-3">Aucun courrier {tab === 'ENTRANT' ? 'reçu' : 'envoyé'}.</p>
                  <button type="button" onClick={openCreate} className="btn-primary">Nouveau courrier</button>
                </td></tr>
              ) : items.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex gap-1 items-center">
                      <button type="button" onClick={() => openEdit(c)} className={ICON_BTN} title="Modifier" aria-label="Modifier">
                        <svg aria-hidden="true" className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {c.statut === 'BROUILLON' && (
                        <button type="button" onClick={() => handleDelete(c)} className={ICON_BTN} title="Supprimer" aria-label="Supprimer">
                          <svg aria-hidden="true" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                      {tab === 'SORTANT' && c.statut === 'BROUILLON' && (
                        <button type="button" onClick={() => handleStatut(c, 'ENVOYE')} className={ICON_BTN} title="Marquer envoyé" aria-label="Marquer envoyé">
                          <svg aria-hidden="true" className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                      )}
                      {(c.statut === 'ENVOYE' || c.statut === 'RECU') && (
                        <button type="button" onClick={() => handleStatut(c, 'TRAITE')} className={ICON_BTN} title="Marquer traité" aria-label="Marquer traité">
                          <svg aria-hidden="true" className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                      )}
                      {['ENVOYE', 'RECU', 'TRAITE'].includes(c.statut) && (
                        <button type="button" onClick={() => handleStatut(c, 'ARCHIVE')} className={ICON_BTN} title="Archiver" aria-label="Archiver">
                          <svg aria-hidden="true" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="table-cell font-medium text-primary-600" data-label="N°" title={c.numero}>{c.numero}</td>
                  <td className="table-cell" data-label="Date">{fmtDate(c.dateReception || c.dateEnvoi || c.dateCreation)}</td>
                  <td className="table-cell" data-label={tab === 'ENTRANT' ? 'Expéditeur' : 'Destinataire'}>{(tab === 'ENTRANT' ? c.expediteur : c.destinataire) || '-'}</td>
                  <td className="table-cell" data-label="Objet" title={c.objet}>{c.objet}</td>
                  <td className="table-cell font-mono col-opt" data-label="Dossier">
                    {c.dossiers?.[0]?.dossier ? <Link href={`/dossiers/${c.dossiers[0].dossier.id}`} className="text-primary-600 hover:underline">{c.dossiers[0].dossier.numeroPhysique || c.dossiers[0].dossier.numero}</Link> : '-'}
                  </td>
                  <td className="table-cell col-opt" data-label="Priorité"><span className={`badge ${PRIORITE_BADGE[c.priorite]}`}>{PRIORITE_LABELS[c.priorite]}</span></td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[c.statut]}`}>{STATUT_LABELS[c.statut]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>

      <Sheet open={showModal} onClose={() => setShowModal(false)} title={editing ? `Modifier ${editing.numero}` : `Nouveau courrier ${tab === 'ENTRANT' ? 'reçu' : 'envoyé'}`} size="2xl" fullScreen>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!editing && modeles.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="label">Modèle</label>
                  <select value={form.modeleId} onChange={e => applyModele(e.target.value)} className="input-field">
                    <option value="">-- Aucun (saisie libre) --</option>
                    {modeles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">{tab === 'ENTRANT' ? 'Expéditeur' : 'Destinataire'}</label>
                <input type="text" value={form.tiers} onChange={e => setForm({ ...form, tiers: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Dossier lié</label>
                <PickerField value={form.dossierId} onChange={applyDossier} options={dossierOptions} placeholder="-- Aucun --" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." />
              </div>
              <div className="sm:col-span-2"><label className="label">Objet *</label><input type="text" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} className="input-field" required /></div>
              <div className="sm:col-span-2"><label className="label">Contenu</label><textarea value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })} className="input-field" rows={6} /></div>
              <div>
                <label className="label">Priorité</label>
                <select value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })} className="input-field">
                  {Object.entries(PRIORITE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
              {!editing && (
                <>
                  <div>
                    <label className="label">Statut initial</label>
                    <select value={form.statutInitial} onChange={e => setForm({ ...form, statutInitial: e.target.value })} className="input-field">
                      {tab === 'ENTRANT' ? (
                        <><option value="RECU">Reçu</option><option value="BROUILLON">Brouillon (pas encore enregistré officiellement)</option></>
                      ) : (
                        <><option value="BROUILLON">Brouillon (à envoyer plus tard)</option><option value="ENVOYE">Envoyé maintenant</option></>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="label">Date {tab === 'ENTRANT' ? 'de réception' : "d'envoi"}</label>
                    <input type="date" value={form.dateEvenement} onChange={e => setForm({ ...form, dateEvenement: e.target.value })} className="input-field" disabled={form.statutInitial === 'BROUILLON'} />
                  </div>
                </>
              )}
              <div className="sm:col-span-2"><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
            </div>
          <div className="sticky bottom-0 -mx-4 -mb-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary w-full sm:w-auto">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</button>
          </div>
        </form>
      </Sheet>
      <FAB label="Nouveau courrier" onClick={openCreate} />
    </AppLayout>
  );
}
