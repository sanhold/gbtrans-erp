'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeModifier, IconeArchiver, IconeValider } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Tiers, Montant, StatutPastille } from '@/components/tables/cellules';
import { rhApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const TYPE_CONTRAT_LABELS: Record<string, string> = {
  CDI: 'CDI', CDD: 'CDD', STAGE: 'Stage', JOURNALIER: 'Journalier', CONSULTANT: 'Consultant',
};
const SITUATION_LABELS: Record<string, string> = {
  CELIBATAIRE: 'Célibataire', MARIE: 'Marié(e)', DIVORCE: 'Divorcé(e)', VEUF: 'Veuf/Veuve',
};


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
        <PageHeader
          titre="Employés"
          sousTitre={`${employes.filter(e => e.actif).length} actif(s)`}
          icone="M9 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-3 3-5 7-5s7 2 7 5M17 11a3 3 0 100-6M19 15c2 .5 3 2 3 5"
          actions={
            <>
              <Link href="/rh/paie" className="btn-secondary">Paie</Link>
              <button onClick={openCreate} className="btn-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nouvel employé
              </button>
            </>
          }
        />

        <div className="card !p-2.5 sm:!p-3 flex flex-wrap items-center gap-3">
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, matricule, poste)…" aria-label="Rechercher un employé" className="input-field flex-1 min-w-[14rem]" />
          <label className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-300 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showInactifs} onChange={e => setShowInactifs(e.target.checked)} className="w-4 h-4 rounded" />
            Afficher les désactivés
          </label>
        </div>

        <ListeResponsive
          colonnes={[
            { cle: 'matricule', libelle: 'Matricule', texte: (e: any) => e.matricule, rendu: (e: any) => <Numero>{e.matricule}</Numero> },
            { cle: 'nom', libelle: 'Employé', texte: (e: any) => `${e.prenom} ${e.nom}`, rendu: (e: any) => <Tiers nom={`${e.prenom} ${e.nom}`} /> },
            { cle: 'poste', libelle: 'Poste', texte: (e: any) => e.poste || '', rendu: (e: any) => <Tronque texte={e.poste} largeur="14rem" /> },
            { cle: 'dept', libelle: 'Département', masquerSous: 'xl' as const, videSi: (e: any) => !e.departement, texte: (e: any) => e.departement || '', rendu: (e: any) => <Tronque texte={e.departement} largeur="12rem" /> },
            { cle: 'contrat', libelle: 'Contrat', texte: (e: any) => TYPE_CONTRAT_LABELS[e.typeContrat] || e.typeContrat, rendu: (e: any) => <StatutPastille libelle={TYPE_CONTRAT_LABELS[e.typeContrat] || e.typeContrat} ton="info" /> },
            { cle: 'embauche', libelle: 'Embauche', masquerSous: 'xl' as const, texte: (e: any) => new Date(e.dateEmbauche).toLocaleDateString('fr-FR'), rendu: (e: any) => <Discret>{new Date(e.dateEmbauche).toLocaleDateString('fr-FR')}</Discret> },
            { cle: 'salaire', libelle: 'Salaire de base', align: 'right' as const, texte: (e: any) => String(e.salaireBase ?? ''), rendu: (e: any) => (canSeeMontants ? <Montant valeur={e.salaireBase} /> : '•••••••') },
            { cle: 'statut', libelle: 'Statut', texte: (e: any) => (e.actif ? 'Actif' : 'Désactivé'), rendu: (e: any) => <StatutPastille libelle={e.actif ? 'Actif' : 'Désactivé'} ton={e.actif ? 'success' : 'danger'} /> },
          ]}
          lignes={filtered}
          cleLigne={(e: any) => e.id}
          chargement={loading}
          nomExport="employes"
          actions={(e: any) => (
            <>
              <BoutonIcone titre="Modifier" ton="primaire" onClick={() => openEdit(e)}><IconeModifier /></BoutonIcone>
              <BoutonIcone titre={e.actif ? 'Désactiver' : 'Réactiver'} ton={e.actif ? 'neutre' : 'primaire'} onClick={() => handleToggleStatut(e)}>{e.actif ? <IconeArchiver /> : <IconeValider />}</BoutonIcone>
            </>
          )}
          onClic={(e: any) => openEdit(e)}
          carte={(e: any) => ({ titre: `${e.prenom} ${e.nom}`, sousTitre: [e.poste, e.departement].filter(Boolean).join(' — ') || undefined, statut: <StatutPastille libelle={e.actif ? 'Actif' : 'Désactivé'} ton={e.actif ? 'success' : 'danger'} />, droite: canSeeMontants ? <Montant valeur={e.salaireBase} /> : '•••••••', details: `${e.matricule} · ${TYPE_CONTRAT_LABELS[e.typeContrat] || e.typeContrat}` })}
          vide={<EmptyState titre="Aucun employé" description="Ajoutez votre premier employé avec le bouton en haut à droite." />}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">{editing ? 'Modifier l\'employé' : 'Nouvel Employé'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Matricule *</label><input type="text" value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value.toUpperCase() })} className="input-field" disabled={!!editing} required /></div>
                <div><label className="label">Poste *</label><input type="text" value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Prénom *</label><input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Nom *</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="label">Département</label><input type="text" value={form.departement} onChange={e => setForm({ ...form, departement: e.target.value })} className="input-field" /></div>
                <div><label className="label">Type de contrat</label>
                  <select value={form.typeContrat} onChange={e => setForm({ ...form, typeContrat: e.target.value })} className="input-field">
                    {Object.entries(TYPE_CONTRAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="label">Date d&apos;embauche *</label><input type="date" value={form.dateEmbauche} onChange={e => setForm({ ...form, dateEmbauche: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="label">Situation familiale</label>
                  <select value={form.situationFamiliale} onChange={e => setForm({ ...form, situationFamiliale: e.target.value })} className="input-field">
                    {Object.entries(SITUATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="label">Nombre d&apos;enfants</label><input type="number" min="0" value={form.nombreEnfants} onChange={e => setForm({ ...form, nombreEnfants: e.target.value })} className="input-field" /></div>
                <div><label className="label">Salaire de base (XOF) *</label><input type="number" min="0" value={form.salaireBase} onChange={e => setForm({ ...form, salaireBase: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Téléphone</label><input type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
