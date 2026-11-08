'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { platformApi, platformAuth } from '@/lib/platformApi';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';
const limite = (n: any, illimite: string, unite: string) => n == null ? illimite : `${n} ${unite}`;

function Ligne({ icone, children }: { icone: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
      <svg className="w-4 h-4 flex-shrink-0 text-primary-500 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={icone} /></svg>
      <span>{children}</span>
    </li>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [featuresText, setFeaturesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { setIsSuperAdmin(!!platformAuth.getAdmin()?.superAdmin); }, []);

  const load = () => {
    setLoading(true);
    setErreur(false);
    platformApi.plans().then(r => setPlans(r.data.data || [])).catch(() => setErreur(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      nom: p.nom, description: p.description || '', prixMensuel: p.prixMensuel, prixAnnuel: p.prixAnnuel || '',
      maxUtilisateurs: p.maxUtilisateurs ?? '', maxDossiersParMois: p.maxDossiersParMois ?? '',
      essaiJours: p.essaiJours, misEnAvant: p.misEnAvant, actif: p.actif,
      backupFrequenceMinJours: p.backupFrequenceMinJours ?? 7,
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
        backupFrequenceMinJours: Number(form.backupFrequenceMinJours),
        fonctionnalites: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
      });
      toast.success('Formule mise à jour');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <AdminShell>
      <PageHeader
        titre="Formules d'abonnement"
        sousTitre="Visibles sur la page tarifs et à l'inscription. Une formule masquée reste attribuée aux sociétés qui l'ont déjà."
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72 hidden xl:block" /></div>
      ) : erreur ? (
        <div className="card"><ErrorState titre="Impossible de charger les formules" onRetry={load} /></div>
      ) : plans.length === 0 ? (
        <div className="card"><EmptyState titre="Aucune formule" description="Aucune formule d'abonnement n'est enregistrée." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(p => (
            <article key={p.id} className={`card !p-5 flex flex-col ${p.misEnAvant ? 'ring-2 ring-primary-500' : ''} ${!p.actif ? 'opacity-60' : ''}`} aria-label={`Formule ${p.nom}`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">{p.nom}</h2>
                <div className="flex flex-wrap justify-end gap-1">
                  {p.misEnAvant && <span className="badge badge-info !text-[10px]">Mise en avant</span>}
                  {!p.actif && <span className="badge badge-gray !text-[10px]">Masquée</span>}
                </div>
              </div>
              {p.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{p.description}</p>}

              <p className="mt-4 text-[28px] leading-none font-extrabold tracking-tight text-gray-900 dark:text-white">
                {fmt(p.prixMensuel)}<span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">FCFA / mois</span>
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{p.prixAnnuel ? `${fmt(p.prixAnnuel)} FCFA par an` : 'Pas de tarif annuel'}</p>

              <ul className="mt-4 space-y-2 pt-4 border-t border-gray-100 dark:border-white/10">
                <Ligne icone="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0z">{limite(p.maxUtilisateurs, 'Utilisateurs illimités', 'utilisateur(s)')}</Ligne>
                <Ligne icone="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z">{limite(p.maxDossiersParMois, 'Dossiers illimités', 'dossier(s) / mois')}</Ligne>
                <Ligne icone="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z">{p.essaiJours} jours d&apos;essai</Ligne>
              </ul>

              {Array.isArray(p.fonctionnalites) && p.fonctionnalites.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {p.fonctionnalites.slice(0, 4).map((f: string) => (
                    <li key={f} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                  {p.fonctionnalites.length > 4 && <li className="text-xs text-gray-400 pl-6">+ {p.fonctionnalites.length - 4} autre(s)</li>}
                </ul>
              )}

              <div className="mt-auto pt-5">
                <button
                  onClick={() => openEdit(p)}
                  disabled={!isSuperAdmin}
                  title={!isSuperAdmin ? 'Compte en lecture seule' : undefined}
                  className="btn-secondary w-full"
                >
                  Modifier la formule
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Modifier la formule ${editing.nom}` : ''}
        size="lg"
        footer={
          <>
            <button onClick={() => setEditing(null)} className="btn-secondary">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        }
      >
        <div className="space-y-3">
          <div><label htmlFor="p-nom" className="label">Nom</label><input id="p-nom" type="text" value={form.nom ?? ''} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" /></div>
          <div><label htmlFor="p-desc" className="label">Description</label><textarea id="p-desc" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="p-pm" className="label">Prix mensuel (FCFA)</label><input id="p-pm" type="number" inputMode="numeric" value={form.prixMensuel ?? ''} onChange={e => setForm({ ...form, prixMensuel: e.target.value })} className="input-field" /></div>
            <div><label htmlFor="p-pa" className="label">Prix annuel (FCFA)</label><input id="p-pa" type="number" inputMode="numeric" value={form.prixAnnuel ?? ''} onChange={e => setForm({ ...form, prixAnnuel: e.target.value })} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="p-mu" className="label">Utilisateurs max (vide = illimité)</label><input id="p-mu" type="number" inputMode="numeric" value={form.maxUtilisateurs ?? ''} onChange={e => setForm({ ...form, maxUtilisateurs: e.target.value })} className="input-field" /></div>
            <div><label htmlFor="p-md" className="label">Dossiers / mois max (vide = illimité)</label><input id="p-md" type="number" inputMode="numeric" value={form.maxDossiersParMois ?? ''} onChange={e => setForm({ ...form, maxDossiersParMois: e.target.value })} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="p-essai" className="label">Jours d&apos;essai</label><input id="p-essai" type="number" inputMode="numeric" value={form.essaiJours ?? ''} onChange={e => setForm({ ...form, essaiJours: e.target.value })} className="input-field" /></div>
            <div>
              <label htmlFor="p-backup" className="label">Sauvegarde minimale autorisée</label>
              <select id="p-backup" value={form.backupFrequenceMinJours ?? 7} onChange={e => setForm({ ...form, backupFrequenceMinJours: e.target.value })} className="input-field">
                <option value={7}>Hebdomadaire seulement</option>
                <option value={3}>Jusqu&apos;à tous les 3 jours</option>
                <option value={1}>Quotidienne</option>
              </select>
            </div>
          </div>
          <div><label htmlFor="p-feat" className="label">Fonctionnalités affichées (une par ligne)</label><textarea id="p-feat" value={featuresText} onChange={e => setFeaturesText(e.target.value)} className="input-field" rows={5} /></div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4 rounded" checked={!!form.misEnAvant} onChange={e => setForm({ ...form, misEnAvant: e.target.checked })} /> Mise en avant</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4 rounded" checked={!!form.actif} onChange={e => setForm({ ...form, actif: e.target.checked })} /> Visible publiquement</label>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
