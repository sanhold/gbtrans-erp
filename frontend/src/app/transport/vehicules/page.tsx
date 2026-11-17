'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Tronque, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import BoutonIcone, { IconeModifier, IconeSupprimer } from '@/components/tables/BoutonIcone';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { vehiculesApi } from '@/lib/api';
import { type Colonne } from '@/components/tables/DataTable';
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
  const router = useRouter();
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

  const echeance = (d: any) => (
    <span className={dateProche(d) ? 'text-red-600 font-semibold' : ''}>{fmtDate(d)}</span>
  );

  const colonnes: Colonne<any>[] = [
    { cle: 'immat', libelle: 'Véhicule', rendu: v => <Link href={`/transport/vehicules/${v.id}`} className="font-mono text-[13px] font-semibold text-primary-600 hover:underline">{v.immatriculation}</Link>, texte: v => v.immatriculation },
    { cle: 'modele', libelle: 'Marque / modèle', masquerSous: 'xl', videSi: v => !(v.marque || v.modele), rendu: v => <Tronque texte={[v.marque, v.modele].filter(Boolean).join(' ')} largeur="14rem" />, texte: v => [v.marque, v.modele].filter(Boolean).join(' ') },
    { cle: 'type', libelle: 'Type', rendu: v => TYPE_LABEL[v.type] || v.type, texte: v => TYPE_LABEL[v.type] || v.type },
    { cle: 'statut', libelle: 'Statut', rendu: v => <StatutPastille libelle={STATUT_LABEL[v.statut] || v.statut} ton={tonDepuisBadge(STATUT_BADGE[v.statut])} />, texte: v => STATUT_LABEL[v.statut] || v.statut },
    { cle: 'assurance', libelle: 'Assurance', rendu: v => echeance(v.dateExpirationAssurance), texte: v => fmtDate(v.dateExpirationAssurance) },
    { cle: 'visite', libelle: 'Visite technique', rendu: v => echeance(v.dateExpirationVisiteTechnique), texte: v => fmtDate(v.dateExpirationVisiteTechnique) },
  ];

  const vide = <EmptyState titre="Aucun véhicule" description="Ajoutez votre premier véhicule." action={<button type="button" onClick={ouvrirCreation} className="btn-primary">Nouveau véhicule</button>} />;

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Véhicules"
          sousTitre={`${vehicules.length} véhicule(s)`}
          actions={
            <button type="button" onClick={ouvrirCreation} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="sm:hidden">Nouveau</span><span className="hidden sm:inline">Nouveau véhicule</span>
            </button>
          }
        />

        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="card !p-3 sm:!p-4">
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-end">
            <div><label className="label">Recherche</label><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" placeholder="Immatriculation, marque..." /></div>
            <button type="submit" className="btn-primary">Rechercher</button>
          </div>
        </form>

        <ListeResponsive
          colonnes={colonnes}
          lignes={vehicules}
          cleLigne={(v) => v.id}
          chargement={loading}
          nomExport="vehicules"
          vide={vide}
          carte={(v) => ({
            titre: <span className="font-mono">{v.immatriculation}</span>,
            sousTitre: `${[v.marque, v.modele].filter(Boolean).join(' ') || '—'} · ${TYPE_LABEL[v.type] || v.type}`,
            statut: <StatutPastille libelle={STATUT_LABEL[v.statut] || v.statut} ton={tonDepuisBadge(STATUT_BADGE[v.statut])} />,
            details: <>Assurance {echeance(v.dateExpirationAssurance)} · Visite {echeance(v.dateExpirationVisiteTechnique)}</>,
          })}
          onClic={(v) => router.push(`/transport/vehicules/${v.id}`)}
          actions={(v) => (
            <>
              <BoutonIcone titre="Modifier" ton="primaire" onClick={() => ouvrirEdition(v)}><IconeModifier /></BoutonIcone>
              <BoutonIcone titre="Supprimer" ton="danger" onClick={() => supprimer(v.id)}><IconeSupprimer /></BoutonIcone>
            </>
          )}
        />
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Modifier le véhicule' : 'Nouveau véhicule'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-vehicule" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}</button>
          </>
        }
      >
        <form id="form-vehicule" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Immatriculation *</label><input type="text" value={form.immatriculation} onChange={e => setForm({ ...form, immatriculation: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Marque</label><input type="text" value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} className="input-field" /></div>
                <div><label className="label">Modèle</label><input type="text" value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Capacité charge (kg)</label><input type="number" value={form.capaciteChargeKg} onChange={e => setForm({ ...form, capaciteChargeKg: e.target.value })} className="input-field" /></div>
                <div><label className="label">Capacité volume (m³)</label><input type="number" value={form.capaciteVolumeM3} onChange={e => setForm({ ...form, capaciteVolumeM3: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">N° assurance</label><input type="text" value={form.numeroAssurance} onChange={e => setForm({ ...form, numeroAssurance: e.target.value })} className="input-field" /></div>
                <div><label className="label">Compagnie assurance</label><input type="text" value={form.compagnieAssurance} onChange={e => setForm({ ...form, compagnieAssurance: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Expiration assurance</label><input type="date" value={form.dateExpirationAssurance} onChange={e => setForm({ ...form, dateExpirationAssurance: e.target.value })} className="input-field" /></div>
                <div><label className="label">Expiration visite technique</label><input type="date" value={form.dateExpirationVisiteTechnique} onChange={e => setForm({ ...form, dateExpirationVisiteTechnique: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Kilométrage</label><input type="number" value={form.kilometrage} onChange={e => setForm({ ...form, kilometrage: e.target.value })} className="input-field" /></div>
              <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
              </form>
      </Modal>
    </AppLayout>
  );
}
