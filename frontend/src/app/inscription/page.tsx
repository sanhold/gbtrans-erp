'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saasApi } from '@/lib/api';
import PlansGrid from '@/components/marketing/PlansGrid';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

function slugify(v: string) {
  return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
}

// Les sous-domaines ne sont pas encore activés (pas de domaine propre configuré) : le champ
// est masqué et une valeur technique est générée en coulisses, avec un suffixe aléatoire pour
// limiter le risque de collision puisqu'il n'y a plus de vérification de disponibilité visible.
function genererSousDomaineTechnique(raisonSociale: string) {
  const base = slugify(raisonSociale) || 'societe';
  const suffixe = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffixe}`.slice(0, 30);
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}

function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [planCode, setPlanCode] = useState('');
  const [periodicite, setPeriodicite] = useState<'MENSUEL' | 'ANNUEL'>('MENSUEL');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    raisonSociale: '', nom: '', prenom: '', email: '', telephone: '', motDePasse: '', confirmation: '',
  });
  const [activiteTransit, setActiviteTransit] = useState(true);
  const [activiteTransport, setActiviteTransport] = useState(false);

  useEffect(() => {
    const demande = searchParams.get('plan');
    saasApi.plans().then(r => {
      const data = r.data.data || [];
      setPlans(data);
      const defaut = (demande && data.find((p: any) => p.code === demande)) || data.find((p: any) => p.misEnAvant) || data[0];
      if (defaut) setPlanCode(defaut.code);
    }).catch(() => toast.error('Impossible de charger les formules'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planChoisi = useMemo(() => plans.find(p => p.code === planCode), [plans, planCode]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planCode) { toast.error('Choisissez une formule'); return; }
    if (!activiteTransit && !activiteTransport) { toast.error('Choisissez au moins une activité : Transit ou Transport'); return; }
    if (form.motDePasse.length < 8) { toast.error('Le mot de passe doit comporter au moins 8 caractères'); return; }
    if (form.motDePasse !== form.confirmation) { toast.error('Les mots de passe ne correspondent pas'); return; }

    setSaving(true);
    try {
      const res = await saasApi.inscription({
        raisonSociale: form.raisonSociale, email: form.email, motDePasse: form.motDePasse,
        nom: form.nom, prenom: form.prenom, telephone: form.telephone || undefined,
        sousDomaine: genererSousDomaineTechnique(form.raisonSociale), planCode, periodicite,
        activiteTransit, activiteTransport,
      });
      toast.success(res.data.message, { duration: 6000 });
      router.push('/auth/login');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-14 h-14 rounded-2xl mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Créer votre espace GBTRANS</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Essai gratuit, sans engagement — annulable à tout moment</p>
        </div>

        <div className="mb-8">
          <PlansGrid selectedCode={planCode} onSelect={setPlanCode} onPeriodiciteChange={setPeriodicite} compact />
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom de votre entreprise *</label>
              <input type="text" value={form.raisonSociale} onChange={e => updateField('raisonSociale', e.target.value)} className="input-field" placeholder="Ex: Transit Express SARL" required />
            </div>

            <div>
              <label className="label">Votre activité *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiviteTransit(v => !v)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${activiteTransit ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-surface-700'}`}
                >
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">Transit</p>
                  <p className="text-xs text-gray-500 mt-0.5">Dossiers, douane, admissions temporaires, cautions</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiviteTransport(v => !v)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${activiteTransport ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-surface-700'}`}
                >
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">Transport</p>
                  <p className="text-xs text-gray-500 mt-0.5">Flotte de véhicules, chauffeurs, courses</p>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">Vous pouvez sélectionner les deux, et ajouter l&apos;autre activité plus tard depuis vos paramètres.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Votre prénom *</label><input type="text" value={form.prenom} onChange={e => updateField('prenom', e.target.value)} className="input-field" required /></div>
              <div><label className="label">Votre nom *</label><input type="text" value={form.nom} onChange={e => updateField('nom', e.target.value)} className="input-field" required /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Email professionnel *</label><input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className="input-field" required /></div>
              <div><label className="label">Téléphone</label><input type="tel" value={form.telephone} onChange={e => updateField('telephone', e.target.value)} className="input-field" placeholder="+225 07 00 00 00 00" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Mot de passe *</label><input type="password" value={form.motDePasse} onChange={e => updateField('motDePasse', e.target.value)} className="input-field" required minLength={8} /></div>
              <div><label className="label">Confirmation *</label><input type="password" value={form.confirmation} onChange={e => updateField('confirmation', e.target.value)} className="input-field" required minLength={8} /></div>
            </div>

            {planChoisi && (
              <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3 text-sm text-primary-700 dark:text-primary-300">
                Formule <strong>{planChoisi.nom}</strong> — {planChoisi.essaiJours} jours d&apos;essai gratuit, puis {fmt(planChoisi.prixMensuel)} FCFA/mois.
              </div>
            )}

            <button type="submit" disabled={saving} className="btn-primary w-full !py-3 text-sm disabled:opacity-50">
              {saving ? 'Création du compte...' : 'Créer mon compte gratuitement'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Déjà un compte ? <a href="/auth/login" className="text-primary-600 hover:underline">Se connecter</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
