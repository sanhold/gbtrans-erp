'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { rhApi } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPE_CONTRAT_LABELS: Record<string, string> = {
  CDI: 'CDI', CDD: 'CDD', STAGE: 'Stage', JOURNALIER: 'Journalier', CONSULTANT: 'Consultant',
};
const SITUATION_LABELS: Record<string, string> = {
  CELIBATAIRE: 'Célibataire', MARIE: 'Marié(e)', DIVORCE: 'Divorcé(e)', VEUF: 'Veuf/Veuve',
};

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

const emptyForm = {
  matricule: '', nom: '', prenom: '', dateNaissance: '', sexe: '', situationFamiliale: 'CELIBATAIRE',
  nombreEnfants: '0', telephone: '', email: '', adresse: '', poste: '', departement: '',
  typeContrat: 'CDI', dateEmbauche: '', salaireBase: '', numeroCNPS: '', compteBancaire: '', observations: '',
};

export default function EmployesPage() {
  const [employes, setEmployes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactifs, setShowInactifs] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    rhApi.employes.list()
      .then(r => setEmployes(r.data.data || []))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({
      matricule: e.matricule, nom: e.nom, prenom: e.prenom,
      dateNaissance: e.dateNaissance ? e.dateNaissance.slice(0, 10) : '',
      sexe: e.sexe || '', situationFamiliale: e.situationFamiliale, nombreEnfants: String(e.nombreEnfants),
      telephone: e.telephone || '', email: e.email || '', adresse: e.adresse || '',
      poste: e.poste, departement: e.departement || '', typeContrat: e.typeContrat,
      dateEmbauche: e.dateEmbauche.slice(0, 10), salaireBase: String(e.salaireBase),
      numeroCNPS: e.numeroCNPS || '', compteBancaire: e.compteBancaire || '', observations: e.observations || '',
    });
    setShowModal(true);
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await rhApi.employes.update(editing.id, form);
        toast.success('Employé modifié');
      } else {
        await rhApi.employes.create(form);
        toast.success('Employé créé');
      }
      setShowModal(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleToggleStatut = async (e: any) => {
    if (!confirm(`${e.actif ? 'Désactiver' : 'Réactiver'} l'employé ${e.prenom} ${e.nom} ?`)) return;
    try { await rhApi.employes.toggleStatut(e.id); toast.success(e.actif ? 'Employé désactivé' : 'Employé réactivé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const filtered = employes
    .filter(e => showInactifs || e.actif)
    .filter(e => !search || `${e.nom} ${e.prenom} ${e.matricule} ${e.poste}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employés</h1>
            <p className="text-sm text-gray-500">{employes.filter(e => e.actif).length} employé(s) actif(s)</p>
          </div>
          <div className="flex gap-2">
            <Link href="/rh/paie" className="btn-secondary text-sm">Paie</Link>
            <button onClick={openCreate} className="btn-primary text-sm">+ Nouvel Employé</button>
          </div>
        </div>

        <div className="card !p-3 flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, matricule, poste)..." className="input-field pl-9 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={showInactifs} onChange={e => setShowInactifs(e.target.checked)} className="w-4 h-4 rounded" />
            Afficher les employés désactivés
          </label>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Matricule</th><th className="table-header">Nom</th><th className="table-header">Poste</th>
              <th className="table-header">Contrat</th><th className="table-header">Embauche</th>
              <th className="table-header text-right">Salaire de base</th><th className="table-header">Statut</th><th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucun employé</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="table-row">
                  <td className="table-cell font-mono text-xs font-medium" data-label="Matricule">{e.matricule}</td>
                  <td className="table-cell" data-label="Nom">{e.prenom} {e.nom}</td>
                  <td className="table-cell text-xs" data-label="Poste">{e.poste}{e.departement ? ` — ${e.departement}` : ''}</td>
                  <td className="table-cell" data-label="Contrat"><span className="badge badge-info">{TYPE_CONTRAT_LABELS[e.typeContrat] || e.typeContrat}</span></td>
                  <td className="table-cell text-xs" data-label="Embauche">{new Date(e.dateEmbauche).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono" data-label="Salaire de base">{fmt(e.salaireBase)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${e.actif ? 'badge-success' : 'badge-danger'}`}>{e.actif ? 'Actif' : 'Désactivé'}</span></td>
                  <td className="table-cell" data-label="Actions">
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => openEdit(e)} className="text-primary-500 hover:underline">Modifier</button>
                      <button onClick={() => handleToggleStatut(e)} className={e.actif ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'}>{e.actif ? 'Désactiver' : 'Réactiver'}</button>
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
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">{editing ? 'Modifier l\'employé' : 'Nouvel Employé'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Matricule *</label><input type="text" value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value.toUpperCase() })} className="input-field" disabled={!!editing} required /></div>
                <div><label className="label">Poste *</label><input type="text" value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Prénom *</label><input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Nom *</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Département</label><input type="text" value={form.departement} onChange={e => setForm({ ...form, departement: e.target.value })} className="input-field" /></div>
                <div><label className="label">Type de contrat</label>
                  <select value={form.typeContrat} onChange={e => setForm({ ...form, typeContrat: e.target.value })} className="input-field">
                    {Object.entries(TYPE_CONTRAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="label">Date d&apos;embauche *</label><input type="date" value={form.dateEmbauche} onChange={e => setForm({ ...form, dateEmbauche: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Situation familiale</label>
                  <select value={form.situationFamiliale} onChange={e => setForm({ ...form, situationFamiliale: e.target.value })} className="input-field">
                    {Object.entries(SITUATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="label">Nombre d&apos;enfants</label><input type="number" min="0" value={form.nombreEnfants} onChange={e => setForm({ ...form, nombreEnfants: e.target.value })} className="input-field" /></div>
                <div><label className="label">Salaire de base (XOF) *</label><input type="number" min="0" value={form.salaireBase} onChange={e => setForm({ ...form, salaireBase: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Téléphone</label><input type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">N° CNPS</label><input type="text" value={form.numeroCNPS} onChange={e => setForm({ ...form, numeroCNPS: e.target.value })} className="input-field" /></div>
                <div><label className="label">Compte bancaire</label><input type="text" value={form.compteBancaire} onChange={e => setForm({ ...form, compteBancaire: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Adresse</label><input type="text" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="input-field" /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
