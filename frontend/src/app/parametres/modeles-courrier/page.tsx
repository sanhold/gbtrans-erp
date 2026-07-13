'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { modelesCourrierApi } from '@/lib/api';
import toast from 'react-hot-toast';

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
    if (!confirm(`Supprimer le modèle "${m.nom}" ?`)) return;
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
          <Link href="/parametres" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Paramètres</Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modèles de courrier</h1>
              <p className="text-sm text-gray-500">Modèles réutilisables pour la rédaction rapide des courriers à envoyer</p>
            </div>
            <button onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau Modèle
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : items.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <p className="text-gray-500 mb-4">Aucun modèle de courrier configuré.</p>
            <button onClick={openCreate} className="btn-primary">Créer un modèle</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {items.map(m => (
              <div key={m.id} className={`card hover:shadow-elevated transition-shadow ${!m.actif ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{m.nom}</h3>
                      <span className={`badge ${TYPE_BADGE[m.type]}`}>{TYPE_LABELS[m.type]}</span>
                      {!m.actif && <span className="badge badge-gray">Inactif</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Objet : {m.objet}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleToggleActif(m)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title={m.actif ? 'Désactiver' : 'Activer'}>
                      <svg className={`w-4 h-4 ${m.actif ? 'text-cyan-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </button>
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(m)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 whitespace-pre-wrap line-clamp-4">{m.contenu}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal création / édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">{editing ? 'Modifier le modèle' : 'Nouveau Modèle de courrier'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Nom du modèle *</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required placeholder="Avis d'arrivée marchandise" /></div>
                <div>
                  <label className="label">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                    <option value="SORTANT">Sortant</option>
                    <option value="ENTRANT">Entrant</option>
                    <option value="INTERNE">Interne</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="label">Objet *</label><input type="text" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} className="input-field" required placeholder="Avis d'arrivée — Dossier {DOSSIER}" /></div>
                <div className="col-span-2"><label className="label">Contenu *</label><textarea value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })} className="input-field font-mono text-sm" rows={10} required placeholder={'Cher(e) {CLIENT},\n\nNous vous informons que votre dossier {DOSSIER} (BL {NUMERO_BL}) est arrivé.\n\nCordialement,\n{SOCIETE}'} /></div>
                {editing && (
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.actif} onChange={e => setForm({ ...form, actif: e.target.checked })} className="w-4 h-4 rounded" />
                      Modèle actif
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-surface-700 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Variables disponibles (cliquer pour copier) :</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map(v => (
                    <button key={v.code} type="button" onClick={() => copyVariable(v.code)} title={v.label}
                      className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                      {v.code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer le modèle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
