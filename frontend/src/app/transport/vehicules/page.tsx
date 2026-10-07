'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { vehiculesApi } from '@/lib/api';
import toast from 'react-hot-toast';

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
    if (!confirm('Supprimer ce véhicule ?')) return;
    try { await vehiculesApi.delete(id); toast.success('Véhicule supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="card !p-3 overflow-x-auto">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-nowrap items-center gap-2 min-w-max">
            <div className="flex-shrink-0 mr-1">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Véhicules</h1>
              <p className="text-[10px] text-gray-500 whitespace-nowrap">{vehicules.length} véhicule(s)</p>
            </div>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field !py-1.5 text-xs w-64 flex-shrink-0" placeholder="Rechercher (immatriculation, marque...)" />
            <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0">Rechercher</button>
            <button type="button" onClick={ouvrirCreation} className="btn-primary !px-3 !py-1.5 text-xs flex-shrink-0 ml-auto">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau véhicule
            </button>
          </form>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Immatriculation</th>
              <th className="table-header">Marque / Modèle</th>
              <th className="table-header">Type</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Assurance</th>
              <th className="table-header">Visite technique</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : vehicules.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun véhicule</td></tr>
              ) : vehicules.map(v => (
                <tr key={v.id} className="table-row">
                  <td className="table-cell font-mono font-medium" data-label="Immatriculation">{v.immatriculation}</td>
                  <td className="table-cell" data-label="Marque / Modèle">{[v.marque, v.modele].filter(Boolean).join(' ') || '-'}</td>
                  <td className="table-cell" data-label="Type">{TYPE_LABEL[v.type]}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[v.statut]} !text-[10px]`}>{STATUT_LABEL[v.statut]}</span></td>
                  <td className={`table-cell text-xs ${dateProche(v.dateExpirationAssurance) ? 'text-red-600 font-semibold' : ''}`} data-label="Assurance">{fmtDate(v.dateExpirationAssurance)}</td>
                  <td className={`table-cell text-xs ${dateProche(v.dateExpirationVisiteTechnique) ? 'text-red-600 font-semibold' : ''}`} data-label="Visite technique">{fmtDate(v.dateExpirationVisiteTechnique)}</td>
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-3">
                      <button onClick={() => ouvrirEdition(v)} className="text-xs text-primary-600 hover:underline">Modifier</button>
                      <button onClick={() => supprimer(v.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
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
              <h2 className="text-lg font-bold">{editingId ? 'Modifier le véhicule' : 'Nouveau véhicule'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Immatriculation *</label><input type="text" value={form.immatriculation} onChange={e => setForm({ ...form, immatriculation: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Marque</label><input type="text" value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} className="input-field" /></div>
                <div><label className="label">Modèle</label><input type="text" value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Capacité charge (kg)</label><input type="number" value={form.capaciteChargeKg} onChange={e => setForm({ ...form, capaciteChargeKg: e.target.value })} className="input-field" /></div>
                <div><label className="label">Capacité volume (m³)</label><input type="number" value={form.capaciteVolumeM3} onChange={e => setForm({ ...form, capaciteVolumeM3: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">N° assurance</label><input type="text" value={form.numeroAssurance} onChange={e => setForm({ ...form, numeroAssurance: e.target.value })} className="input-field" /></div>
                <div><label className="label">Compagnie assurance</label><input type="text" value={form.compagnieAssurance} onChange={e => setForm({ ...form, compagnieAssurance: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Expiration assurance</label><input type="date" value={form.dateExpirationAssurance} onChange={e => setForm({ ...form, dateExpirationAssurance: e.target.value })} className="input-field" /></div>
                <div><label className="label">Expiration visite technique</label><input type="date" value={form.dateExpirationVisiteTechnique} onChange={e => setForm({ ...form, dateExpirationVisiteTechnique: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Kilométrage</label><input type="number" value={form.kilometrage} onChange={e => setForm({ ...form, kilometrage: e.target.value })} className="input-field" /></div>
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
