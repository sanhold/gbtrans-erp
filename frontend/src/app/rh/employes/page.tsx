'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { rhApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
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
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('RH:VOIR_MONTANTS');
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
        <div className="card !p-3 overflow-x-auto">
          <div className="flex flex-nowrap items-center gap-2 min-w-max">
            <div className="flex-shrink-0 mr-1">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Employés</h1>
              <p className="text-[10px] text-gray-500 whitespace-nowrap">{employes.filter(e => e.actif).length} actif(s)</p>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, matricule, poste)..." className="input-field !py-1.5 text-xs w-56 flex-shrink-0" />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer flex-shrink-0 whitespace-nowrap">
              <input type="checkbox" checked={showInactifs} onChange={e => setShowInactifs(e.target.checked)} className="w-3.5 h-3.5 rounded" />
              Afficher désactivés
            </label>
            <div className="flex gap-2 flex-shrink-0 ml-auto">
              <Link href="/rh/paie" className="btn-secondary !px-3 !py-1.5 text-xs">Paie</Link>
              <button onClick={openCreate} className="btn-primary !px-3 !py-1.5 text-xs">+ Nouvel Employé</button>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead><tr>
              <th className="table-header !text-[10px] !px-1.5 truncate">Matricule</th><th className="table-header !text-[10px] !px-1.5 truncate">Nom</th><th className="table-header !text-[10px] !px-1.5 truncate">Poste</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Contrat</th><th className="table-header !text-[10px] !px-1.5 truncate">Embauche</th>
              <th className="table-header !text-[10px] !px-1.5 truncate text-right">Salaire base</th><th className="table-header !text-[10px] !px-1.5 truncate">Statut</th><th className="table-header !text-[10px] !px-1.5 truncate">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucun employé</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="table-row">
                  <td className="table-cell font-mono font-medium !px-1.5 !text-[10.5px] truncate" data-label="Matricule">{e.matricule}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Nom">{e.prenom} {e.nom}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Poste" title={`${e.poste}${e.departement ? ` — ${e.departement}` : ''}`}>{e.poste}{e.departement ? ` — ${e.departement}` : ''}</td>
                  <td className="table-cell !px-1.5" data-label="Contrat"><span className="badge badge-info !text-[10px] !px-1.5 !py-0 truncate">{TYPE_CONTRAT_LABELS[e.typeContrat] || e.typeContrat}</span></td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Embauche">{new Date(e.dateEmbauche).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Salaire de base">{canSeeMontants ? fmt(e.salaireBase) : '•••••••'}</td>
                  <td className="table-cell !px-1.5" data-label="Statut"><span className={`badge ${e.actif ? 'badge-success' : 'badge-danger'} !text-[10px] !px-1.5 !py-0`}>{e.actif ? 'Actif' : 'Désactivé'}</span></td>
                  <td className="table-cell !px-1.5" data-label="Actions">
                    <div className="flex gap-2 text-[10.5px]">
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
