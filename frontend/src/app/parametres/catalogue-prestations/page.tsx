'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { catalogueApi } from '@/lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'DOUANE', 'DOUANE & COMPAGNIE', 'DEBOURS DOUANE', 'DEBOURS DOUANE & COMPAGNIE', 'DOUANE ELIBU-NOE-E',
  'COMPAGNIE MARITIME', 'FRAIS PORTUAIRES', 'GUICHET UNIQUE', 'GUICHET UNIQUE/IMMATRICULATION',
  'EXPORT ET FRET', 'TRANSPORT', 'PENALITES PORTUAIRES', 'AUTRES FRAIS', 'DIVERS',
];
const CAT_COLORS: Record<string, string> = {
  'DOUANE': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'DOUANE & COMPAGNIE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  'DEBOURS DOUANE': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'DEBOURS DOUANE & COMPAGNIE': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  'DOUANE ELIBU-NOE-E': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  'COMPAGNIE MARITIME': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'FRAIS PORTUAIRES': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'GUICHET UNIQUE': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'GUICHET UNIQUE/IMMATRICULATION': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  'EXPORT ET FRET': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'TRANSPORT': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'PENALITES PORTUAIRES': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'AUTRES FRAIS': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'DIVERS': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

const emptyForm = { categorie: CATEGORIES[0], code: '', designation: '', montantDefaut: '', tauxTVA: '18', estTVA: true };

function suggestCode(prestations: any[], categorie: string): string {
  const codes = prestations.filter(p => p.categorie === categorie).map(p => p.code as string).filter(Boolean);
  const parsed = codes
    .map(c => { const m = c.match(/^([A-Za-zÀ-ÿ-]*)(\d+)$/); return m ? { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length } : null; })
    .filter((p): p is { prefix: string; num: number; width: number } => !!p);
  if (parsed.length > 0) {
    const counts: Record<string, number> = {};
    parsed.forEach(p => { counts[p.prefix] = (counts[p.prefix] || 0) + 1; });
    const bestPrefix = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const group = parsed.filter(p => p.prefix === bestPrefix);
    const maxNum = Math.max(...group.map(p => p.num));
    const width = Math.max(...group.map(p => p.width));
    return `${bestPrefix}${String(maxNum + 1).padStart(width, '0')}`;
  }
  const initials = (categorie.match(/[A-Za-zÀ-ÿ]+/g) || []).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'PR';
  return `${initials}01`;
}

export default function CataloguePrestationsPage() {
  const [prestations, setPrestations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categorieFiltre, setCategorieFiltre] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [customCategorie, setCustomCategorie] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);

  const load = () => {
    setLoading(true);
    catalogueApi.list()
      .then(r => setPrestations(r.data.data || []))
      .catch(() => setPrestations([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const allCategories = [...new Set([...CATEGORIES, ...prestations.map(p => p.categorie)])];

  const openCreate = () => {
    setEditing(null);
    setCodeTouched(false);
    setCustomCategorie('');
    setForm({ ...emptyForm, code: suggestCode(prestations, emptyForm.categorie) });
    setShowModal(true);
  };
  const openEdit = (p: any) => {
    setEditing(p);
    setCodeTouched(true);
    setCustomCategorie('');
    setForm({
      categorie: p.categorie, code: p.code, designation: p.designation,
      montantDefaut: p.montantDefaut != null ? String(p.montantDefaut) : '',
      tauxTVA: String(p.tauxTVA), estTVA: p.estTVA,
    });
    setShowModal(true);
  };

  const setFormCategorie = (categorie: string) => {
    setForm(prev => ({ ...prev, categorie, code: (editing || codeTouched) ? prev.code : suggestCode(prestations, categorie) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const categorie = form.categorie === '__new__' ? customCategorie.trim().toUpperCase() : form.categorie;
    if (!categorie) { toast.error('Indiquez le nom de la nouvelle catégorie'); return; }
    if (!form.code.trim() || !form.designation.trim()) { toast.error('Code et désignation requis'); return; }
    setSaving(true);
    try {
      const payload = {
        categorie, code: form.code.trim().toUpperCase(), designation: form.designation.trim(),
        montantDefaut: form.montantDefaut ? parseFloat(form.montantDefaut) : null,
        tauxTVA: form.estTVA ? (parseFloat(form.tauxTVA) || 18) : 0,
        estTVA: form.estTVA,
      };
      if (editing) {
        await catalogueApi.update(editing.id, payload);
        toast.success('Prestation modifiée');
      } else {
        await catalogueApi.create({ ...payload, ordre: prestations.filter(p => p.categorie === categorie).length + 1 });
        toast.success('Prestation ajoutée au catalogue');
      }
      setShowModal(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const toggleActif = async (p: any) => {
    try { await catalogueApi.update(p.id, { actif: !p.actif }); load(); }
    catch { toast.error('Erreur'); }
  };

  const handleDelete = async (p: any) => {
    if (!confirm(`Supprimer définitivement "${p.designation}" du catalogue ?`)) return;
    try { await catalogueApi.delete(p.id); toast.success('Prestation supprimée'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur (peut-être déjà utilisée dans des documents)'); }
  };

  const filtres = prestations
    .filter(p => !categorieFiltre || p.categorie === categorieFiltre)
    .filter(p => !search || p.designation.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

  const parCategorie: Record<string, any[]> = {};
  for (const p of filtres) { (parCategorie[p.categorie] ||= []).push(p); }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/parametres" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Paramètres</Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catalogue des Prestations</h1>
              <p className="text-sm text-gray-500">{prestations.length} prestation(s) — utilisées lors de la création de proformas, offres et factures</p>
            </div>
            <button onClick={openCreate} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouvelle Prestation
            </button>
          </div>
        </div>

        <div className="card !p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Recherche</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="Code, désignation..." />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setCategorieFiltre('')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${!categorieFiltre ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-surface-700 dark:text-gray-300'}`}>Toutes</button>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setCategorieFiltre(categorieFiltre === cat ? '' : cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categorieFiltre === cat ? (CAT_COLORS[cat] || 'bg-gray-100 text-gray-700') + ' ring-2 ring-offset-1 ring-primary-300' : (CAT_COLORS[cat] || 'bg-gray-100 text-gray-700') + ' opacity-60 hover:opacity-100'}`}>{cat}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</div>
        ) : filtres.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">Aucune prestation dans le catalogue. Créez la première.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(parCategorie).map(([cat, items]) => (
              <div key={cat} className="card !p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-surface-700 flex items-center gap-2">
                  <span className={`badge ${CAT_COLORS[cat] || 'badge-gray'}`}>{cat}</span>
                  <span className="text-xs text-gray-400">{items.length} prestation(s)</span>
                </div>
                <div className="table-container !shadow-none !border-0">
                  <table className="w-full">
                    <thead><tr><th className="table-header">Code</th><th className="table-header">Désignation</th><th className="table-header text-right">Montant par défaut</th><th className="table-header">TVA</th><th className="table-header">Statut</th><th className="table-header">Actions</th></tr></thead>
                    <tbody>
                      {items.map(p => (
                        <tr key={p.id} className="table-row">
                          <td className="table-cell font-mono text-xs font-semibold text-primary-600" data-label="Code">{p.code}</td>
                          <td className="table-cell" data-label="Désignation">{p.designation}</td>
                          <td className="table-cell text-right font-mono" data-label="Montant">{p.montantDefaut != null ? `${fmt(p.montantDefaut)} XOF` : '-'}</td>
                          <td className="table-cell text-xs" data-label="TVA">{p.estTVA ? `${fmt(p.tauxTVA)}%` : 'Exonéré'}</td>
                          <td className="table-cell" data-label="Statut">
                            <button onClick={() => toggleActif(p)} className={`badge ${p.actif ? 'badge-success' : 'badge-gray'} cursor-pointer`}>{p.actif ? 'Actif' : 'Inactif'}</button>
                          </td>
                          <td className="table-cell" data-label="Actions">
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated w-full max-w-md" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editing ? 'Modifier la prestation' : 'Nouvelle Prestation'}</h2>

              <div>
                <label className="label">Catégorie *</label>
                {form.categorie === '__new__' ? (
                  <div className="flex gap-2">
                    <input type="text" autoFocus value={customCategorie} onChange={e => { const v = e.target.value.toUpperCase(); setCustomCategorie(v); if (!editing && !codeTouched) setForm(prev => ({ ...prev, code: suggestCode(prestations, v) })); }} className="input-field" placeholder="NOM DE LA NOUVELLE CATEGORIE" />
                    <button type="button" onClick={() => { setFormCategorie(allCategories[0]); setCustomCategorie(''); }} className="btn-secondary text-sm px-3 whitespace-nowrap">Annuler</button>
                  </div>
                ) : (
                  <select value={form.categorie} onChange={e => setFormCategorie(e.target.value)} className="input-field">
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ Nouvelle catégorie…</option>
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Code * {!editing && <span className="text-gray-400 font-normal">(généré, modifiable)</span>}</label>
                  <input type="text" value={form.code} onChange={e => { setCodeTouched(true); setForm({ ...form, code: e.target.value.toUpperCase() }); }} className="input-field font-mono" placeholder="TRA-DED" required />
                </div>
                <div>
                  <label className="label">Montant par défaut</label>
                  <input type="number" value={form.montantDefaut} onChange={e => setForm({ ...form, montantDefaut: e.target.value })} className="input-field" min="0" />
                </div>
              </div>
              <div>
                <label className="label">Désignation *</label>
                <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" required />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.estTVA} onChange={e => setForm({ ...form, estTVA: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-500" />
                  <span className="text-sm">Soumis à TVA</span>
                </label>
                {form.estTVA && (
                  <div className="flex items-center gap-2">
                    <input type="number" value={form.tauxTVA} onChange={e => setForm({ ...form, tauxTVA: e.target.value })} className="input-field !w-20" min="0" max="100" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Ajouter au catalogue'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
