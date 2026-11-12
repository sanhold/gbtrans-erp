'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { rhApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import FormSheet, { FormSection } from '@/components/forms/FormSheet';
import EmptyRow from '@/components/tables/EmptyRow';

const TYPE_CONTRAT_LABELS: Record<string, string> = {
  CDI: 'CDI', CDD: 'CDD', STAGE: 'Stage', JOURNALIER: 'Journalier', CONSULTANT: 'Consultant',
};
const SITUATION_LABELS: Record<string, string> = {
  CELIBATAIRE: 'Célibataire', MARIE: 'Marié(e)', DIVORCE: 'Divorcé(e)', VEUF: 'Veuf/Veuve',
};

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

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
  const confirmer = useConfirm();

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
    if (!(await confirmer({ titre: `${e.actif ? 'Désactiver' : 'Réactiver'} l'employé ?`, message: `${e.prenom} ${e.nom}`, danger: e.actif, confirmer: e.actif ? 'Désactiver' : 'Réactiver' }))) return;
    try { await rhApi.employes.toggleStatut(e.id); toast.success(e.actif ? 'Employé désactivé' : 'Employé réactivé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const filtered = employes
    .filter(e => showInactifs || e.actif)
    .filter(e => !search || `${e.nom} ${e.prenom} ${e.matricule} ${e.poste}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Employés"
          subtitle={`${employes.filter(e => e.actif).length} actif(s)`}
          actions={(
            <div className="flex gap-2">
              <Link href="/rh/paie" className="btn-secondary">Paie</Link>
              <button type="button" onClick={openCreate} className="btn-primary hidden lg:inline-flex">+ Nouvel Employé</button>
            </div>
          )}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <input type="search" inputMode="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, matricule, poste)..." aria-label="Rechercher un employé" className="input-field flex-1 min-w-[200px] sm:max-w-sm" />
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showInactifs} onChange={e => setShowInactifs(e.target.checked)} className="w-5 h-5 rounded" />
            Afficher désactivés
          </label>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Actions</th>
              <th className="table-header">Matricule</th>
              <th className="table-header">Nom</th>
              <th className="table-header">Poste</th>
              <th className="table-header">Contrat</th>
              <th className="table-header">Embauche</th>
              <th className="table-header  truncate text-right">Salaire base</th>
              <th className="table-header">Statut</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={8} />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={8} message="Aucun employé" ctaLabel="Ajouter un employé" onCta={openCreate} />
              ) : filtered.map(e => (
                <tr key={e.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex gap-3 text-sm">
                      <button onClick={() => openEdit(e)} className="font-medium text-primary-600 hover:underline px-1.5 py-1.5">Modifier</button>
                      <button onClick={() => handleToggleStatut(e)} className={`font-medium px-1.5 py-1.5 hover:underline ${e.actif ? 'text-red-600' : 'text-green-700'}`}>{e.actif ? 'Désactiver' : 'Réactiver'}</button>
                    </div>
                  </td>
                  <td className="table-cell font-mono font-medium" data-label="Matricule">{e.matricule}</td>
                  <td className="table-cell" data-label="Nom">{e.prenom} {e.nom}</td>
                  <td className="table-cell" data-label="Poste" title={`${e.poste}${e.departement ? ` — ${e.departement}` : ''}`}>{e.poste}{e.departement ? ` — ${e.departement}` : ''}</td>
                  <td className="table-cell" data-label="Contrat"><span className="badge badge-info truncate">{TYPE_CONTRAT_LABELS[e.typeContrat] || e.typeContrat}</span></td>
                  <td className="table-cell col-opt" data-label="Embauche">{new Date(e.dateEmbauche).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono" data-label="Salaire de base">{canSeeMontants ? fmt(e.salaireBase) : '•••••••'}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${e.actif ? 'badge-success' : 'badge-danger'} `}>{e.actif ? 'Actif' : 'Désactivé'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FAB label="Nouvel employé" onClick={openCreate} />

      <FormSheet
        open={showModal} onClose={() => setShowModal(false)} size="2xl" onSubmit={handleSave} saving={saving}
        title={editing ? "Modifier l'employé" : 'Nouvel Employé'} submitLabel={editing ? 'Modifier' : 'Créer'}
      >
        <FormSection title="Identité">
          <div><label className="label">Matricule *</label><input type="text" autoCapitalize="characters" value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value.toUpperCase() })} className="input-field" disabled={!!editing} required /></div>
          <div><label className="label">Prénom *</label><input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Nom *</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Situation familiale</label>
            <select value={form.situationFamiliale} onChange={e => setForm({ ...form, situationFamiliale: e.target.value })} className="input-field">
              {Object.entries(SITUATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">Nombre d'enfants</label><input type="number" min="0" inputMode="numeric" value={form.nombreEnfants} onChange={e => setForm({ ...form, nombreEnfants: e.target.value })} className="input-field" /></div>
        </FormSection>
        <FormSection title="Poste et contrat">
          <div><label className="label">Poste *</label><input type="text" value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Département</label><input type="text" value={form.departement} onChange={e => setForm({ ...form, departement: e.target.value })} className="input-field" /></div>
          <div><label className="label">Type de contrat</label>
            <select value={form.typeContrat} onChange={e => setForm({ ...form, typeContrat: e.target.value })} className="input-field">
              {Object.entries(TYPE_CONTRAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">Date d'embauche *</label><input type="date" value={form.dateEmbauche} onChange={e => setForm({ ...form, dateEmbauche: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Salaire de base (XOF) *</label><input type="number" min="0" inputMode="numeric" value={form.salaireBase} onChange={e => setForm({ ...form, salaireBase: e.target.value })} className="input-field" required /></div>
        </FormSection>
        <FormSection title="Coordonnées">
          <div><label className="label">Téléphone</label><input type="tel" inputMode="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
          <div><label className="label">Email</label><input type="email" inputMode="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
          <div><label className="label">Adresse</label><input type="text" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="input-field" /></div>
        </FormSection>
        <FormSection title="Administratif">
          <div><label className="label">N° CNPS</label><input type="text" value={form.numeroCNPS} onChange={e => setForm({ ...form, numeroCNPS: e.target.value })} className="input-field" /></div>
          <div><label className="label">Compte bancaire</label><input type="text" value={form.compteBancaire} onChange={e => setForm({ ...form, compteBancaire: e.target.value })} className="input-field" /></div>
        </FormSection>
      </FormSheet>
    </AppLayout>
  );
}
