'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { vehiculesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import FormSheet, { FormSection } from '@/components/forms/FormSheet';
import ListToolbar from '@/components/tables/ListToolbar';
import EmptyRow from '@/components/tables/EmptyRow';

const TYPE_LABEL: Record<string, string> = { CAMION: 'Camion', REMORQUE: 'Remorque', CAMIONNETTE: 'Camionnette', VOITURE: 'Voiture', MOTO: 'Moto', AUTRE: 'Autre' };
const STATUT_LABEL: Record<string, string> = { DISPONIBLE: 'Disponible', EN_COURSE: 'En course', EN_MAINTENANCE: 'En maintenance', HORS_SERVICE: 'Hors service' };
const STATUT_BADGE: Record<string, string> = { DISPONIBLE: 'badge-success', EN_COURSE: 'badge-info', EN_MAINTENANCE: 'badge-warning', HORS_SERVICE: 'badge-danger' };

const FORM_VIDE = {
  immatriculation: '', marque: '', modele: '', type: 'CAMION', capaciteChargeKg: '', capaciteVolumeM3: '',
  numeroAssurance: '', compagnieAssurance: '', dateExpirationAssurance: '', dateExpirationVisiteTechnique: '', kilometrage: '', observations: '',
};

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const dateProche = (d: any) => d && new Date(d).getTime() < Date.now() + 30 * 86400000;

export default function VehiculesPage() {
  const [vehicules, setVehicules] = useState<any[]>([]);
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
      const res = await vehiculesApi.list({ search: search || undefined });
      setVehicules(res.data.data || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ouvrirCreation = () => { setEditingId(null); setForm(FORM_VIDE); setShowModal(true); };
  const ouvrirEdition = (v: any) => {
    setEditingId(v.id);
    setForm({
      immatriculation: v.immatriculation, marque: v.marque || '', modele: v.modele || '', type: v.type,
      capaciteChargeKg: v.capaciteChargeKg || '', capaciteVolumeM3: v.capaciteVolumeM3 || '',
      numeroAssurance: v.numeroAssurance || '', compagnieAssurance: v.compagnieAssurance || '',
      dateExpirationAssurance: v.dateExpirationAssurance ? v.dateExpirationAssurance.slice(0, 10) : '',
      dateExpirationVisiteTechnique: v.dateExpirationVisiteTechnique ? v.dateExpirationVisiteTechnique.slice(0, 10) : '',
      kilometrage: v.kilometrage || '', observations: v.observations || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) { await vehiculesApi.update(editingId, form); toast.success('Véhicule modifié'); }
      else { await vehiculesApi.create(form); toast.success('Véhicule ajouté'); }
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const supprimer = async (id: string) => {
    if (!(await confirmer({ titre: 'Supprimer ce véhicule ?', message: 'Cette action est irréversible.', danger: true, confirmer: 'Supprimer' }))) return;
    try { await vehiculesApi.delete(id); toast.success('Véhicule supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-2">
        <PageHeader
          title="Véhicules"
          subtitle={`${vehicules.length} véhicule(s)`}
          actions={<button type="button" onClick={ouvrirCreation} className="btn-primary hidden lg:inline-flex">Nouveau véhicule</button>}
        />
        <ListToolbar value={search} onChange={setSearch} onSubmit={load} placeholder="Rechercher (immatriculation, marque...)" />

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Actions</th>
              <th className="table-header">Immatriculation</th>
              <th className="table-header">Marque / Modèle</th>
              <th className="table-header">Type</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Assurance</th>
              <th className="table-header">Visite technique</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} />
              ) : vehicules.length === 0 ? (
                <EmptyRow colSpan={7} message="Aucun véhicule" ctaLabel="Ajouter un véhicule" onCta={ouvrirCreation} />
              ) : vehicules.map(v => (
                <tr key={v.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-3">
                      <button onClick={() => ouvrirEdition(v)} className="text-sm font-medium text-primary-600 hover:underline px-2 py-1.5">Modifier</button>
                      <button onClick={() => supprimer(v.id)} className="text-sm font-medium text-red-600 hover:underline px-2 py-1.5">Supprimer</button>
                    </div>
                  </td>
                  <td className="table-cell font-mono font-medium" data-label="Immatriculation">
                    <Link href={`/transport/vehicules/${v.id}`} className="text-primary-600 hover:underline">{v.immatriculation}</Link>
                  </td>
                  <td className="table-cell" data-label="Marque / Modèle">{[v.marque, v.modele].filter(Boolean).join(' ') || '-'}</td>
                  <td className="table-cell" data-label="Type">{TYPE_LABEL[v.type]}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[v.statut]} !text-[10px]`}>{STATUT_LABEL[v.statut]}</span></td>
                  <td className={`table-cell text-xs ${dateProche(v.dateExpirationAssurance) ? 'text-red-600 font-semibold' : ''}`} data-label="Assurance">{fmtDate(v.dateExpirationAssurance)}</td>
                  <td className={`table-cell text-xs ${dateProche(v.dateExpirationVisiteTechnique) ? 'text-red-600 font-semibold' : ''}`} data-label="Visite technique">{fmtDate(v.dateExpirationVisiteTechnique)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <FAB label="Nouveau véhicule" onClick={ouvrirCreation} />

      <FormSheet
        open={showModal} onClose={() => setShowModal(false)} size="lg" onSubmit={handleSubmit} saving={saving}
        title={editingId ? 'Modifier le véhicule' : 'Nouveau véhicule'} submitLabel={editingId ? 'Modifier' : 'Créer'}
      >
        <FormSection title="Identification">
          <div><label className="label">Immatriculation *</label><input type="text" autoCapitalize="characters" value={form.immatriculation} onChange={e => setForm({ ...form, immatriculation: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Marque</label><input type="text" value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} className="input-field" /></div>
          <div><label className="label">Modèle</label><input type="text" value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} className="input-field" /></div>
        </FormSection>
        <FormSection title="Capacités">
          <div><label className="label">Capacité charge (kg)</label><input type="number" inputMode="decimal" value={form.capaciteChargeKg} onChange={e => setForm({ ...form, capaciteChargeKg: e.target.value })} className="input-field" /></div>
          <div><label className="label">Capacité volume (m³)</label><input type="number" inputMode="decimal" value={form.capaciteVolumeM3} onChange={e => setForm({ ...form, capaciteVolumeM3: e.target.value })} className="input-field" /></div>
          <div><label className="label">Kilométrage</label><input type="number" inputMode="numeric" value={form.kilometrage} onChange={e => setForm({ ...form, kilometrage: e.target.value })} className="input-field" /></div>
        </FormSection>
        <FormSection title="Assurance et visite technique">
          <div><label className="label">N° assurance</label><input type="text" value={form.numeroAssurance} onChange={e => setForm({ ...form, numeroAssurance: e.target.value })} className="input-field" /></div>
          <div><label className="label">Compagnie assurance</label><input type="text" value={form.compagnieAssurance} onChange={e => setForm({ ...form, compagnieAssurance: e.target.value })} className="input-field" /></div>
          <div><label className="label">Expiration assurance</label><input type="date" value={form.dateExpirationAssurance} onChange={e => setForm({ ...form, dateExpirationAssurance: e.target.value })} className="input-field" /></div>
          <div><label className="label">Expiration visite technique</label><input type="date" value={form.dateExpirationVisiteTechnique} onChange={e => setForm({ ...form, dateExpirationVisiteTechnique: e.target.value })} className="input-field" /></div>
        </FormSection>
        <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
      </FormSheet>
    </AppLayout>
  );
}
