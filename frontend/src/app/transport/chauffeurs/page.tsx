'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Tiers, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import BoutonIcone, { IconeModifier, IconeSupprimer } from '@/components/tables/BoutonIcone';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { chauffeursApi } from '@/lib/api';
import { type Colonne } from '@/components/tables/DataTable';
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

  const permis = (c: any) => `${c.numeroPermis || '—'}${c.categoriePermis ? ` (${c.categoriePermis})` : ''}`;
  const echeance = (d: any) => <span className={dateProche(d) ? 'text-red-600 font-semibold' : ''}>{fmtDate(d)}</span>;

  const colonnes: Colonne<any>[] = [
    { cle: 'nom', libelle: 'Chauffeur', rendu: c => <Tiers nom={`${c.prenom} ${c.nom}`} />, texte: c => `${c.prenom} ${c.nom}` },
    { cle: 'tel', libelle: 'Téléphone', rendu: c => c.telephone || '—', texte: c => c.telephone || '' },
    { cle: 'permis', libelle: 'Permis', rendu: c => permis(c), texte: c => permis(c) },
    { cle: 'exp', libelle: 'Expiration permis', rendu: c => echeance(c.dateExpirationPermis), texte: c => fmtDate(c.dateExpirationPermis) },
    { cle: 'statut', libelle: 'Statut', rendu: c => <StatutPastille libelle={STATUT_LABEL[c.statut] || c.statut} ton={tonDepuisBadge(STATUT_BADGE[c.statut])} />, texte: c => STATUT_LABEL[c.statut] || c.statut },
  ];

  const vide = <EmptyState titre="Aucun chauffeur" description="Ajoutez votre premier chauffeur." action={<button type="button" onClick={ouvrirCreation} className="btn-primary">Nouveau chauffeur</button>} />;

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Chauffeurs"
          sousTitre={`${chauffeurs.length} chauffeur(s)`}
          actions={
            <button type="button" onClick={ouvrirCreation} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="sm:hidden">Nouveau</span><span className="hidden sm:inline">Nouveau chauffeur</span>
            </button>
          }
        />

        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="card !p-3 sm:!p-4">
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-end">
            <div><label className="label">Recherche</label><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" placeholder="Nom, téléphone, permis..." /></div>
            <button type="submit" className="btn-primary">Rechercher</button>
          </div>
        </form>

        <ListeResponsive
          colonnes={colonnes}
          lignes={chauffeurs}
          cleLigne={(c) => c.id}
          chargement={loading}
          nomExport="chauffeurs"
          vide={vide}
          carte={(c) => ({
            titre: `${c.prenom} ${c.nom}`,
            sousTitre: c.telephone || '—',
            statut: <StatutPastille libelle={STATUT_LABEL[c.statut] || c.statut} ton={tonDepuisBadge(STATUT_BADGE[c.statut])} />,
            details: <>Permis {permis(c)} · expire {echeance(c.dateExpirationPermis)}</>,
          })}
          actions={(c) => (
            <>
              <BoutonIcone titre="Modifier" ton="primaire" onClick={() => ouvrirEdition(c)}><IconeModifier /></BoutonIcone>
              <BoutonIcone titre="Supprimer" ton="danger" onClick={() => supprimer(c.id)}><IconeSupprimer /></BoutonIcone>
            </>
          )}
        />
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-chauffeur" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}</button>
          </>
        }
      >
        <form id="form-chauffeur" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Prénom *</label><input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Nom *</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Téléphone</label><input type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">N° permis</label><input type="text" value={form.numeroPermis} onChange={e => setForm({ ...form, numeroPermis: e.target.value })} className="input-field" /></div>
                <div><label className="label">Catégorie permis</label><input type="text" value={form.categoriePermis} onChange={e => setForm({ ...form, categoriePermis: e.target.value })} className="input-field" placeholder="ex: C, D..." /></div>
              </div>
              <div><label className="label">Expiration permis</label><input type="date" value={form.dateExpirationPermis} onChange={e => setForm({ ...form, dateExpirationPermis: e.target.value })} className="input-field" /></div>
              <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
              </form>
      </Modal>
    </AppLayout>
  );
}
