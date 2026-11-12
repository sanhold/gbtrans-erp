'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { chauffeursApi } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import FormSheet, { FormSection } from '@/components/forms/FormSheet';
import ListToolbar from '@/components/tables/ListToolbar';
import EmptyRow from '@/components/tables/EmptyRow';

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
  const confirmer = useConfirm();

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
    if (!(await confirmer({ titre: 'Supprimer ce chauffeur ?', message: 'Cette action est irréversible.', danger: true, confirmer: 'Supprimer' }))) return;
    try { await chauffeursApi.delete(id); toast.success('Chauffeur supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-2">
        <PageHeader
          title="Chauffeurs"
          subtitle={`${chauffeurs.length} chauffeur(s)`}
          actions={<button type="button" onClick={ouvrirCreation} className="btn-primary hidden lg:inline-flex">Nouveau chauffeur</button>}
        />
        <ListToolbar value={search} onChange={setSearch} onSubmit={load} />

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Actions</th>
              <th className="table-header">Nom</th>
              <th className="table-header">Téléphone</th>
              <th className="table-header">Permis</th>
              <th className="table-header">Expiration permis</th>
              <th className="table-header">Statut</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} />
              ) : chauffeurs.length === 0 ? (
                <EmptyRow colSpan={6} message="Aucun chauffeur" ctaLabel="Ajouter un chauffeur" onCta={ouvrirCreation} />
              ) : chauffeurs.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-3">
                      <button onClick={() => ouvrirEdition(c)} className="text-sm font-medium text-primary-600 hover:underline px-2 py-1.5">Modifier</button>
                      <button onClick={() => supprimer(c.id)} className="text-sm font-medium text-red-600 hover:underline px-2 py-1.5">Supprimer</button>
                    </div>
                  </td>
                  <td className="table-cell font-medium" data-label="Nom">{c.prenom} {c.nom}</td>
                  <td className="table-cell text-xs col-opt" data-label="Téléphone">{c.telephone || '-'}</td>
                  <td className="table-cell text-xs" data-label="Permis">{c.numeroPermis || '-'} {c.categoriePermis ? `(${c.categoriePermis})` : ''}</td>
                  <td className={`table-cell text-xs ${dateProche(c.dateExpirationPermis) ? 'text-red-600 font-semibold' : ''}`} data-label="Expiration permis">{fmtDate(c.dateExpirationPermis)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[c.statut]} !text-[10px]`}>{STATUT_LABEL[c.statut]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <FAB label="Nouveau chauffeur" onClick={ouvrirCreation} />

      <FormSheet
        open={showModal} onClose={() => setShowModal(false)} size="lg" onSubmit={handleSubmit} saving={saving}
        title={editingId ? 'Modifier le chauffeur' : 'Nouveau chauffeur'} submitLabel={editingId ? 'Modifier' : 'Créer'}
      >
        <FormSection title="Identité">
          <div><label className="label">Prénom *</label><input type="text" autoComplete="off" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Nom *</label><input type="text" autoComplete="off" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Téléphone</label><input type="tel" inputMode="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
          <div><label className="label">Email</label><input type="email" inputMode="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
        </FormSection>
        <FormSection title="Permis de conduire">
          <div><label className="label">N° permis</label><input type="text" value={form.numeroPermis} onChange={e => setForm({ ...form, numeroPermis: e.target.value })} className="input-field" /></div>
          <div><label className="label">Catégorie permis</label><input type="text" value={form.categoriePermis} onChange={e => setForm({ ...form, categoriePermis: e.target.value })} className="input-field" placeholder="ex: C, D..." /></div>
          <div><label className="label">Expiration permis</label><input type="date" value={form.dateExpirationPermis} onChange={e => setForm({ ...form, dateExpirationPermis: e.target.value })} className="input-field" /></div>
        </FormSection>
        <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
      </FormSheet>
    </AppLayout>
  );
}
