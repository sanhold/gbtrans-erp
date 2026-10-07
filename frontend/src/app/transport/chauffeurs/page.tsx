'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { chauffeursApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUT_LABEL: Record<string, string> = { DISPONIBLE: 'Disponible', EN_COURSE: 'En course', EN_CONGE: 'En congé', INACTIF: 'Inactif' };
const STATUT_BADGE: Record<string, string> = { DISPONIBLE: 'badge-success', EN_COURSE: 'badge-info', EN_CONGE: 'badge-warning', INACTIF: 'badge-gray' };

const FORM_VIDE = { nom: '', prenom: '', telephone: '', email: '', numeroPermis: '', categoriePermis: '', dateExpirationPermis: '', observations: '' };

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const dateProche = (d: any) => d && new Date(d).getTime() < Date.now() + 30 * 86400000;

export default function ChauffeursPage() {
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await chauffeursApi.list({ search: search || undefined });
      setChauffeurs(res.data.data || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ouvrirCreation = () => { setEditingId(null); setForm(FORM_VIDE); setShowModal(true); };
  const ouvrirEdition = (c: any) => {
    setEditingId(c.id);
    setForm({
      nom: c.nom, prenom: c.prenom, telephone: c.telephone || '', email: c.email || '',
      numeroPermis: c.numeroPermis || '', categoriePermis: c.categoriePermis || '',
      dateExpirationPermis: c.dateExpirationPermis ? c.dateExpirationPermis.slice(0, 10) : '', observations: c.observations || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) { await chauffeursApi.update(editingId, form); toast.success('Chauffeur modifié'); }
      else { await chauffeursApi.create(form); toast.success('Chauffeur ajouté'); }
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce chauffeur ?')) return;
    try { await chauffeursApi.delete(id); toast.success('Chauffeur supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="card !p-3 overflow-x-auto">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-nowrap items-center gap-2 min-w-max">
            <div className="flex-shrink-0 mr-1">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Chauffeurs</h1>
              <p className="text-[10px] text-gray-500 whitespace-nowrap">{chauffeurs.length} chauffeur(s)</p>
            </div>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field !py-1.5 text-xs w-64 flex-shrink-0" placeholder="Rechercher..." />
            <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0">Rechercher</button>
            <button type="button" onClick={ouvrirCreation} className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0 ml-auto">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau chauffeur
            </button>
          </form>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Nom</th>
              <th className="table-header">Téléphone</th>
              <th className="table-header">Permis</th>
              <th className="table-header">Expiration permis</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : chauffeurs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun chauffeur</td></tr>
              ) : chauffeurs.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-medium" data-label="Nom">{c.prenom} {c.nom}</td>
                  <td className="table-cell text-xs" data-label="Téléphone">{c.telephone || '-'}</td>
                  <td className="table-cell text-xs" data-label="Permis">{c.numeroPermis || '-'} {c.categoriePermis ? `(${c.categoriePermis})` : ''}</td>
                  <td className={`table-cell text-xs ${dateProche(c.dateExpirationPermis) ? 'text-red-600 font-semibold' : ''}`} data-label="Expiration permis">{fmtDate(c.dateExpirationPermis)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[c.statut]} !text-[10px]`}>{STATUT_LABEL[c.statut]}</span></td>
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-3">
                      <button onClick={() => ouvrirEdition(c)} className="text-xs text-primary-600 hover:underline">Modifier</button>
                      <button onClick={() => supprimer(c.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">{editingId ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Prénom *</label><input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Nom *</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Téléphone</label><input type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">N° permis</label><input type="text" value={form.numeroPermis} onChange={e => setForm({ ...form, numeroPermis: e.target.value })} className="input-field" /></div>
                <div><label className="label">Catégorie permis</label><input type="text" value={form.categoriePermis} onChange={e => setForm({ ...form, categoriePermis: e.target.value })} className="input-field" placeholder="ex: C, D..." /></div>
              </div>
              <div><label className="label">Expiration permis</label><input type="date" value={form.dateExpirationPermis} onChange={e => setForm({ ...form, dateExpirationPermis: e.target.value })} className="input-field" /></div>
              <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
