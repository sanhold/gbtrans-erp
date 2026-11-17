'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { Numero, Discret, Tronque, Tiers, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import BoutonIcone, { IconeModifier, IconeSupprimer, IconeValider, IconeEnvoyer, IconeArchiver } from '@/components/tables/BoutonIcone';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Tabs from '@/components/ui/Tabs';
import FiltresDepliables from '@/components/ui/FiltresDepliables';
import PickerField from '@/components/ui/PickerField';
import { courriersApi, modelesCourrierApi, dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUT_LABELS: Record<string, string> = { BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', RECU: 'Reçu', TRAITE: 'Traité', ARCHIVE: 'Archivé', ANNULE: 'Annulé' };
const STATUT_BADGE: Record<string, string> = { BROUILLON: 'badge-gray', ENVOYE: 'badge-info', RECU: 'badge-info', TRAITE: 'badge-success', ARCHIVE: 'badge-gray', ANNULE: 'badge-danger' };
const PRIORITE_LABELS: Record<string, string> = { BASSE: 'Basse', NORMALE: 'Normale', HAUTE: 'Haute', URGENTE: 'Urgente' };
const PRIORITE_BADGE: Record<string, string> = { BASSE: 'badge-gray', NORMALE: 'badge-info', HAUTE: 'badge-warning', URGENTE: 'badge-danger' };

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

  const [modeles, setModeles] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { page, limit, type: tab };
    if (appliedSearch) params.search = appliedSearch;
    if (statutFiltre) params.statut = statutFiltre;
    courriersApi.list(params)
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab, page, limit, appliedSearch, statutFiltre]);

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    modelesCourrierApi.list({ type: tab, actif: 'true' }).then(r => setModeles(r.data.data || [])).catch(() => setModeles([]));
  }, [tab]);

  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / limit));

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
    if (!confirm(`Supprimer le courrier ${c.numero} ?`)) return;
    try { await courriersApi.delete(c.id); toast.success('Courrier supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleStatut = async (c: any, statut: string) => {
    try { await courriersApi.changerStatut(c.id, statut); toast.success('Statut modifié'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const actions = (c: any) => (
    <>
      <BoutonIcone titre="Modifier" ton="primaire" onClick={() => openEdit(c)}><IconeModifier /></BoutonIcone>
      {tab === 'SORTANT' && c.statut === 'BROUILLON' && <BoutonIcone titre="Marquer envoyé" onClick={() => handleStatut(c, 'ENVOYE')}><IconeEnvoyer /></BoutonIcone>}
      {(c.statut === 'ENVOYE' || c.statut === 'RECU') && <BoutonIcone titre="Marquer traité" onClick={() => handleStatut(c, 'TRAITE')}><IconeValider /></BoutonIcone>}
      {['ENVOYE', 'RECU', 'TRAITE'].includes(c.statut) && <BoutonIcone titre="Archiver" onClick={() => handleStatut(c, 'ARCHIVE')}><IconeArchiver /></BoutonIcone>}
      {c.statut === 'BROUILLON' && <BoutonIcone titre="Supprimer" ton="danger" onClick={() => handleDelete(c)}><IconeSupprimer /></BoutonIcone>}
    </>
  );

  const tiers = (c: any) => (tab === 'ENTRANT' ? c.expediteur : c.destinataire) || null;
  const dossierDe = (c: any) => c.dossiers?.[0]?.dossier;
  const dateDe = (c: any) => fmtDate(c.dateReception || c.dateEnvoi || c.dateCreation);

  const colonnes: Colonne<any>[] = [
    { cle: 'courrier', libelle: 'N° courrier', rendu: c => <Numero>{c.numero}</Numero>, texte: c => c.numero },
    { cle: 'date', libelle: 'Date', rendu: c => <Discret>{dateDe(c)}</Discret>, texte: c => String(dateDe(c) ?? '') },
    { cle: 'tiers', libelle: tab === 'ENTRANT' ? 'Expéditeur' : 'Destinataire', rendu: c => <Tiers nom={tiers(c)} />, texte: c => tiers(c) || '' },
    { cle: 'objet', libelle: 'Objet', rendu: c => <Tronque texte={c.objet} />, texte: c => c.objet || '' },
    { cle: 'dossier', libelle: 'Dossier', masquerSous: 'xl', rendu: c => (dossierDe(c) ? <Link href={`/dossiers/${dossierDe(c).id}`} onClick={e => e.stopPropagation()} className="font-mono text-primary-600 hover:underline">{dossierDe(c).numeroPhysique || dossierDe(c).numero}</Link> : '—'), texte: c => dossierDe(c)?.numeroPhysique || dossierDe(c)?.numero || '' },
    { cle: 'priorite', libelle: 'Priorité', rendu: c => <StatutPastille libelle={PRIORITE_LABELS[c.priorite] || c.priorite} ton={tonDepuisBadge(PRIORITE_BADGE[c.priorite])} />, texte: c => PRIORITE_LABELS[c.priorite] || c.priorite },
    { cle: 'statut', libelle: 'Statut', rendu: c => <StatutPastille libelle={STATUT_LABELS[c.statut] || c.statut} ton={tonDepuisBadge(STATUT_BADGE[c.statut])} />, texte: c => STATUT_LABELS[c.statut] || c.statut },
  ];

  const vide = <EmptyState titre={`Aucun courrier ${tab === 'ENTRANT' ? 'reçu' : 'envoyé'}`} description="Enregistrez un courrier avec le bouton « Nouveau »." action={<button type="button" onClick={openCreate} className="btn-primary">Nouveau courrier</button>} />;

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Courriers"
          sousTitre="Courriers reçus et envoyés"
          sousTitreMasqueMobile
          actions={
            <>
              <Link href="/parametres/modeles-courrier" className="btn-secondary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">Modèles</Link>
              <button type="button" onClick={openCreate} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="sm:hidden">Nouveau</span><span className="hidden sm:inline">Nouveau courrier</span>
              </button>
            </>
          }
        />

        <Tabs ariaLabel="Type de courrier" value={tab} onChange={(k) => setTab(k as 'ENTRANT' | 'SORTANT')} items={[{ key: 'ENTRANT', label: 'Reçus' }, { key: 'SORTANT', label: 'Envoyés' }]} />

        <FiltresDepliables actifs={(appliedSearch ? 1 : 0) + (statutFiltre ? 1 : 0)}>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem_auto] gap-3 items-end">
              <div><label className="label">Recherche</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="N°, objet, expéditeur/destinataire..." /></div>
              <div>
                <label className="label">Statut</label>
                <select value={statutFiltre} onChange={e => { setStatutFiltre(e.target.value); setPage(1); }} className="input-field">
                  <option value="">Tous</option>
                  {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
            cleLigne={(c) => c.id}
            chargement={loading}
            nomExport="courriers"
            actionsToujoursVisibles
            actions={actions}
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-24" />)
          ) : items.length === 0 ? (
            <div className="card">{vide}</div>
          ) : items.map(c => (
            <div key={c.id} className="card !p-0 overflow-hidden">
              <div className="px-4 pt-3 pb-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-primary-600 dark:text-primary-300 truncate">{c.numero}</span>
                  <StatutPastille libelle={STATUT_LABELS[c.statut] || c.statut} ton={tonDepuisBadge(STATUT_BADGE[c.statut])} />
                </div>
                <div className="text-[13px] font-medium text-gray-900 dark:text-white line-clamp-2">{c.objet}</div>
                <div className="text-xs text-gray-500 truncate">{tiers(c) || '—'} · {dateDe(c)}</div>
                <div className="flex items-center gap-2 text-xs">
                  <StatutPastille libelle={PRIORITE_LABELS[c.priorite] || c.priorite} ton={tonDepuisBadge(PRIORITE_BADGE[c.priorite])} />
                  {dossierDe(c) && <Link href={`/dossiers/${dossierDe(c).id}`} className="font-mono text-primary-600">{dossierDe(c).numeroPhysique || dossierDe(c).numero}</Link>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 pb-3">{actions(c)}</div>
            </div>
          ))}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} /></div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Modifier ${editing.numero}` : `Nouveau courrier ${tab === 'ENTRANT' ? 'reçu' : 'envoyé'}`}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-courrier" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</button>
          </>
        }
      >
        <form id="form-courrier" onSubmit={handleSave} className="space-y-4">
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
        </form>
      </Modal>
    </AppLayout>
  );
}
