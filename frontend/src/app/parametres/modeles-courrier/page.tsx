'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { modelesCourrierApi } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import FormSheet from '@/components/forms/FormSheet';

const TYPE_LABELS: Record<string, string> = { SORTANT: 'Sortant', ENTRANT: 'Entrant', INTERNE: 'Interne' };
const TYPE_BADGE: Record<string, string> = { SORTANT: 'badge-info', ENTRANT: 'badge-warning', INTERNE: 'badge-gray' };

const VARIABLES = [
  { code: '{SOCIETE}', label: 'Raison sociale de la société' },
  { code: '{CLIENT}', label: 'Nom du client' },
  { code: '{DOSSIER}', label: 'N° du dossier' },
  { code: '{NUMERO_BL}', label: 'N° BL / connaissement' },
  { code: '{COMPAGNIE}', label: 'Compagnie maritime' },
  { code: '{DATE}', label: 'Date du jour' },
];

const emptyForm = { nom: '', type: 'SORTANT', objet: '', contenu: '', actif: true };

export default function ModelesCourrierPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const confirmer = useConfirm();

  const load = () => {
    setLoading(true);
    modelesCourrierApi.list().then(r => setItems(r.data.data || [])).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({ nom: m.nom, type: m.type, objet: m.objet, contenu: m.contenu, actif: m.actif });
    setShowModal(true);
  };

  const copyVariable = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success(`${code} copié`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.objet || !form.contenu) { toast.error('Nom, objet et contenu requis'); return; }
    setSaving(true);
    try {
      if (editing) { await modelesCourrierApi.update(editing.id, form); toast.success('Modèle modifié'); }
      else { await modelesCourrierApi.create(form); toast.success('Modèle créé'); }
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m: any) => {
    if (!(await confirmer({ titre: 'Supprimer ce modèle ?', message: `Modèle « ${m.nom} »`, danger: true, confirmer: 'Supprimer' }))) return;
    try { await modelesCourrierApi.delete(m.id); toast.success('Modèle supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleToggleActif = async (m: any) => {
    try { await modelesCourrierApi.update(m.id, { actif: !m.actif }); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/parametres" className="inline-flex items-center min-h-[44px] text-sm text-primary-600 hover:underline">← Paramètres</Link>
          <PageHeader
            title="Modèles de courrier"
            subtitle="Modèles réutilisables pour la rédaction rapide des courriers à envoyer"
            className="!mb-0"
            actions={<button type="button" onClick={openCreate} className="btn-primary hidden lg:inline-flex">+ Nouveau Modèle</button>}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : items.length === 0 ? (
          <div className="card text-center py-12">
            <svg aria-hidden="true" className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Aucun modèle de courrier configuré.</p>
            <button onClick={openCreate} className="btn-primary">Créer un modèle</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {items.map(m => (
              <div key={m.id} className={`card hover:shadow-elevated transition-shadow ${!m.actif ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{m.nom}</h3>
                      <span className={`badge ${TYPE_BADGE[m.type]}`}>{TYPE_LABELS[m.type]}</span>
                      {!m.actif && <span className="badge badge-gray">Inactif</span>}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Objet : {m.objet}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => handleToggleActif(m)} className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-surface-700" title={m.actif ? 'Désactiver' : 'Activer'} aria-label={`${m.actif ? 'Désactiver' : 'Activer'} le modèle ${m.nom}`} aria-pressed={m.actif}>
                      <svg className={`w-4 h-4 ${m.actif ? 'text-cyan-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </button>
                    <button type="button" onClick={() => openEdit(m)} className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier" aria-label={`Modifier le modèle ${m.nom}`}>
                      <svg aria-hidden="true" className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button type="button" onClick={() => handleDelete(m)} className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer" aria-label={`Supprimer le modèle ${m.nom}`}>
                      <svg aria-hidden="true" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-4">{m.contenu}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <FAB label="Nouveau modèle" onClick={openCreate} />

      <FormSheet
        open={showModal} onClose={() => setShowModal(false)} size="3xl" onSubmit={handleSave} saving={saving}
        title={editing ? 'Modifier le modèle' : 'Nouveau Modèle de courrier'} submitLabel={editing ? 'Modifier' : 'Créer le modèle'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label htmlFor="mc-nom" className="label">Nom du modèle *</label><input id="mc-nom" type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required placeholder="Avis d'arrivée marchandise" /></div>
          <div>
            <label htmlFor="mc-type" className="label">Type</label>
            <select id="mc-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
              <option value="SORTANT">Sortant</option>
              <option value="ENTRANT">Entrant</option>
              <option value="INTERNE">Interne</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label htmlFor="mc-objet" className="label">Objet *</label><input id="mc-objet" type="text" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} className="input-field" required placeholder="Avis d'arrivée — Dossier {DOSSIER}" /></div>
          <div className="sm:col-span-2"><label htmlFor="mc-contenu" className="label">Contenu *</label><textarea id="mc-contenu" value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })} className="input-field font-mono" rows={10} required placeholder={'Cher(e) {CLIENT},\n\nNous vous informons que votre dossier {DOSSIER} (BL {NUMERO_BL}) est arrivé.\n\nCordialement,\n{SOCIETE}'} /></div>
          {editing && (
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 min-h-[44px] text-sm cursor-pointer">
                <input type="checkbox" checked={form.actif} onChange={e => setForm({ ...form, actif: e.target.checked })} className="w-5 h-5 rounded" />
                Modèle actif
              </label>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-surface-700 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Variables disponibles (toucher pour copier) :</p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map(v => (
              <button key={v.code} type="button" onClick={() => copyVariable(v.code)} title={v.label} aria-label={`Copier ${v.code} : ${v.label}`}
                className="min-h-[40px] px-3 rounded-full text-xs font-mono bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                {v.code}
              </button>
            ))}
          </div>
        </div>
      </FormSheet>
    </AppLayout>
  );
}
