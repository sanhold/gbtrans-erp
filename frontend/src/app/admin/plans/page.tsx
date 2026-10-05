'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { platformApi, platformAuth } from '@/lib/platformApi';
import toast from 'react-hot-toast';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [featuresText, setFeaturesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { setIsSuperAdmin(!!platformAuth.getAdmin()?.superAdmin); }, []);

  const load = () => {
    setLoading(true);
    platformApi.plans().then(r => setPlans(r.data.data || [])).catch(() => toast.error('Erreur de chargement')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      nom: p.nom, description: p.description || '', prixMensuel: p.prixMensuel, prixAnnuel: p.prixAnnuel || '',
      maxUtilisateurs: p.maxUtilisateurs ?? '', maxDossiersParMois: p.maxDossiersParMois ?? '',
      essaiJours: p.essaiJours, misEnAvant: p.misEnAvant, actif: p.actif,
    });
    setFeaturesText((p.fonctionnalites || []).join('\n'));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await platformApi.majPlan(editing.id, {
        ...form,
        prixMensuel: Number(form.prixMensuel),
        prixAnnuel: form.prixAnnuel ? Number(form.prixAnnuel) : null,
        maxUtilisateurs: form.maxUtilisateurs === '' ? null : Number(form.maxUtilisateurs),
        maxDossiersParMois: form.maxDossiersParMois === '' ? null : Number(form.maxDossiersParMois),
        essaiJours: Number(form.essaiJours),
        fonctionnalites: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
      });
      toast.success('Formule mise à jour');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

  return (
    <AdminShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Formules d&apos;abonnement</h1>
          <p className="text-sm text-gray-500">Visibles publiquement sur la page tarifs et à l&apos;inscription.</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.id} className={`card !p-5 ${!p.actif ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{p.nom}</h3>
                  {!p.actif && <span className="badge badge-gray !text-[10px]">Masquée</span>}
                </div>
                <p className="text-sm text-gray-500 mb-3">{p.description}</p>
                <div className="text-xl font-extrabold mb-1">{fmt(p.prixMensuel)} FCFA<span className="text-xs font-medium text-gray-400">/mois</span></div>
                <p className="text-xs text-gray-400 mb-3">
                  {p.maxUtilisateurs ?? 'Illimité'} utilisateur(s) · {p.maxDossiersParMois ?? 'Illimité'} dossier(s)/mois · {p.essaiJours}j d&apos;essai
                </p>
                <button
                  onClick={() => openEdit(p)}
                  disabled={!isSuperAdmin}
                  title={!isSuperAdmin ? 'Compte de démonstration : lecture seule' : undefined}
                  className="btn-secondary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Modifier
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Modifier — {editing.nom}</h3>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="label">Nom</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" /></div>
              <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Prix mensuel (FCFA)</label><input type="number" value={form.prixMensuel} onChange={e => setForm({ ...form, prixMensuel: e.target.value })} className="input-field" /></div>
                <div><label className="label">Prix annuel (FCFA)</label><input type="number" value={form.prixAnnuel} onChange={e => setForm({ ...form, prixAnnuel: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Max utilisateurs (vide = illimité)</label><input type="number" value={form.maxUtilisateurs} onChange={e => setForm({ ...form, maxUtilisateurs: e.target.value })} className="input-field" /></div>
                <div><label className="label">Max dossiers/mois (vide = illimité)</label><input type="number" value={form.maxDossiersParMois} onChange={e => setForm({ ...form, maxDossiersParMois: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Jours d&apos;essai</label><input type="number" value={form.essaiJours} onChange={e => setForm({ ...form, essaiJours: e.target.value })} className="input-field" /></div>
              <div><label className="label">Fonctionnalités affichées (une par ligne)</label><textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} className="input-field" rows={6} /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.misEnAvant} onChange={e => setForm({ ...form, misEnAvant: e.target.checked })} /> Mise en avant</label>
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.actif} onChange={e => setForm({ ...form, actif: e.target.checked })} /> Visible publiquement</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-surface-700">
              <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
