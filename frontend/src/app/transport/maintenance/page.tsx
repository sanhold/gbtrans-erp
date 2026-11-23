'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeSupprimer } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant, StatutPastille } from '@/components/tables/cellules';
import { maintenanceApi, vehiculesApi } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPE_LABEL: Record<string, string> = { VIDANGE: 'Vidange', REPARATION: 'Réparation', VISITE_TECHNIQUE: 'Visite technique', ASSURANCE: 'Assurance', PNEUS: 'Pneus', AUTRE: 'Autre' };

const FORM_VIDE = { vehiculeId: '', type: 'VIDANGE', date: '', kilometrage: '', cout: '', prestataire: '', description: '', prochaineDateRappel: '', observations: '' };

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const fmtMontant = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';

const joursRestants = (d: any) => d ? Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
const urgenceClasse = (j: number | null) => {
  if (j == null) return 'bg-gray-100 text-gray-600 dark:bg-surface-700 dark:text-gray-300';
  if (j < 0) return 'bg-red-600 text-white';
  if (j <= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (j <= 15) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-gray-100 text-gray-600 dark:bg-surface-700 dark:text-gray-300';
};
const urgenceLabel = (j: number | null) => {
  if (j == null) return '';
  if (j < 0) return `en retard de ${Math.abs(j)} j`;
  if (j === 0) return "aujourd'hui";
  return `dans ${j} j`;
};

function AlerteRow({ immatriculation, date }: { immatriculation: string; date: any }) {
  const j = joursRestants(date);
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700">
      <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">{immatriculation}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400">{fmtDate(date)}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${urgenceClasse(j)}`}>{urgenceLabel(j)}</span>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [alertes, setAlertes] = useState<any>(null);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(FORM_VIDE);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [m, a, v] = await Promise.all([maintenanceApi.list(), maintenanceApi.alertes(), vehiculesApi.list({ actif: 'true' })]);
      setMaintenances(m.data.data || []);
      setAlertes(a.data.data);
      setVehicules(v.data.data || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const ouvrirCreation = () => { setForm(FORM_VIDE); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceApi.create(form);
      toast.success('Maintenance enregistrée');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cet enregistrement de maintenance ?')) return;
    try { await maintenanceApi.delete(id); toast.success('Maintenance supprimée'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const nbAlertes = (alertes?.vehiculesAssurance?.length || 0) + (alertes?.vehiculesVisite?.length || 0) + (alertes?.maintenancesRappel?.length || 0);

  return (
    <AppLayout>
      <div className="space-y-5">
        <PageHeader
          titre="Maintenance véhicules"
          sousTitre={`${maintenances.length} intervention(s) enregistrée(s)`}
          icone="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.1-.6-.6-2.1z"
          actions={<button onClick={ouvrirCreation} className="btn-primary"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Nouvelle intervention</button>}
        />

        {!loading && nbAlertes > 0 && (
          <div className="card !border-l-4 !border-amber-500 bg-amber-50/60 dark:bg-amber-900/10">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                Échéances à surveiller
              </h3>
              <span className="badge badge-warning">{nbAlertes} alerte{nbAlertes > 1 ? 's' : ''} · 30 prochains jours</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {alertes.vehiculesAssurance.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Assurance ({alertes.vehiculesAssurance.length})</p>
                  <div className="space-y-1.5">
                    {alertes.vehiculesAssurance.map((v: any) => <AlerteRow key={`a-${v.id}`} immatriculation={v.immatriculation} date={v.dateExpirationAssurance} />)}
                  </div>
                </div>
              )}
              {alertes.vehiculesVisite.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Visite technique ({alertes.vehiculesVisite.length})</p>
                  <div className="space-y-1.5">
                    {alertes.vehiculesVisite.map((v: any) => <AlerteRow key={`vt-${v.id}`} immatriculation={v.immatriculation} date={v.dateExpirationVisiteTechnique} />)}
                  </div>
                </div>
              )}
              {alertes.maintenancesRappel.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Rappels maintenance ({alertes.maintenancesRappel.length})</p>
                  <div className="space-y-1.5">
                    {alertes.maintenancesRappel.map((m: any) => <AlerteRow key={m.id} immatriculation={`${m.vehicule?.immatriculation} · ${TYPE_LABEL[m.type]}`} date={m.prochaineDateRappel} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <ListeResponsive
          colonnes={[
            { cle: 'vehicule', libelle: 'Véhicule', texte: (m: any) => m.vehicule?.immatriculation || '', rendu: (m: any) => <Numero>{m.vehicule?.immatriculation}</Numero> },
            { cle: 'type', libelle: 'Type', texte: (m: any) => TYPE_LABEL[m.type] || m.type, rendu: (m: any) => <StatutPastille libelle={TYPE_LABEL[m.type] || m.type} ton="info" /> },
            { cle: 'date', libelle: 'Date', texte: (m: any) => fmtDate(m.date), rendu: (m: any) => <Discret>{fmtDate(m.date)}</Discret> },
            { cle: 'cout', libelle: 'Coût', align: 'right' as const, texte: (m: any) => String(m.cout ?? ''), rendu: (m: any) => <Montant valeur={m.cout} unite="FCFA" /> },
            { cle: 'prestataire', libelle: 'Prestataire', masquerSous: 'xl' as const, texte: (m: any) => m.prestataire || '', rendu: (m: any) => <Tronque texte={m.prestataire} largeur="14rem" /> },
            { cle: 'rappel', libelle: 'Prochain rappel', masquerSous: 'xl' as const, texte: (m: any) => fmtDate(m.prochaineDateRappel), rendu: (m: any) => <Discret>{fmtDate(m.prochaineDateRappel)}</Discret> },
          ]}
          lignes={maintenances}
          cleLigne={(m: any) => m.id}
          chargement={loading}
          nomExport="maintenance-vehicules"
          actions={(m: any) => <BoutonIcone titre="Supprimer" ton="danger" onClick={() => supprimer(m.id)}><IconeSupprimer /></BoutonIcone>}
          carte={(m: any) => ({ titre: m.vehicule?.immatriculation, sousTitre: TYPE_LABEL[m.type] || m.type, droite: <Montant valeur={m.cout} unite="FCFA" />, details: `${fmtDate(m.date)}${m.prestataire ? ' · ' + m.prestataire : ''}` })}
          vide={<EmptyState titre="Aucune maintenance enregistrée" description="Ajoutez une intervention avec le bouton en haut à droite." />}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Nouvelle intervention</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Véhicule *</label>
                  <select value={form.vehiculeId} onChange={e => setForm({ ...form, vehiculeId: e.target.value })} className="input-field" required>
                    <option value="">Sélectionner...</option>
                    {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
                  </select>
                </div>
                <div><label className="label">Type *</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Date *</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Kilométrage</label><input type="number" value={form.kilometrage} onChange={e => setForm({ ...form, kilometrage: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Coût (FCFA)</label><input type="number" value={form.cout} onChange={e => setForm({ ...form, cout: e.target.value })} className="input-field" /></div>
                <div><label className="label">Prestataire</label><input type="text" value={form.prestataire} onChange={e => setForm({ ...form, prestataire: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} /></div>
              <div>
                <label className="label">Prochain rappel (optionnel)</label>
                <input type="date" value={form.prochaineDateRappel} onChange={e => setForm({ ...form, prochaineDateRappel: e.target.value })} className="input-field" />
                <p className="text-[11px] text-gray-400 mt-1">Pour Assurance/Visite technique, met aussi à jour l&apos;échéance du véhicule.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
