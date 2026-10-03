'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/api';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

function slugify(v: string) {
  return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

export default function InscriptionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [planCode, setPlanCode] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    raisonSociale: '', sousDomaine: '', nom: '', prenom: '', email: '', telephone: '', motDePasse: '', confirmation: '',
  });
  const [sousDomaineEdited, setSousDomaineEdited] = useState(false);
  const [dispoCheck, setDispoCheck] = useState<{ checking: boolean; disponible: boolean | null; raison?: string }>({ checking: false, disponible: null });

  useEffect(() => {
    saasApi.plans().then(r => {
      const data = r.data.data || [];
      setPlans(data);
      const defaut = data.find((p: any) => p.misEnAvant) || data[0];
      if (defaut) setPlanCode(defaut.code);
    }).catch(() => toast.error('Impossible de charger les formules')).finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    if (sousDomaineEdited) return;
    setForm(prev => ({ ...prev, sousDomaine: slugify(prev.raisonSociale) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.raisonSociale, sousDomaineEdited]);

  useEffect(() => {
    const slug = slugify(form.sousDomaine);
    if (slug.length < 3) { setDispoCheck({ checking: false, disponible: null }); return; }
    setDispoCheck({ checking: true, disponible: null });
    const t = setTimeout(() => {
      saasApi.sousDomaineDisponible(slug)
        .then(r => setDispoCheck({ checking: false, disponible: r.data.data.disponible, raison: r.data.data.raison }))
        .catch(() => setDispoCheck({ checking: false, disponible: null }));
    }, 400);
    return () => clearTimeout(t);
  }, [form.sousDomaine]);

  const planChoisi = useMemo(() => plans.find(p => p.code === planCode), [plans, planCode]);

  const updateField = (field: string, value: string) => {
    if (field === 'sousDomaine') setSousDomaineEdited(true);
    setForm(prev => ({ ...prev, [field]: field === 'sousDomaine' ? slugify(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planCode) { toast.error('Choisissez une formule'); return; }
    if (form.motDePasse.length < 8) { toast.error('Le mot de passe doit comporter au moins 8 caractères'); return; }
    if (form.motDePasse !== form.confirmation) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (dispoCheck.disponible === false) { toast.error('Ce sous-domaine est déjà pris'); return; }

    setSaving(true);
    try {
      const res = await saasApi.inscription({
        raisonSociale: form.raisonSociale, email: form.email, motDePasse: form.motDePasse,
        nom: form.nom, prenom: form.prenom, telephone: form.telephone || undefined,
        sousDomaine: form.sousDomaine, planCode,
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {loadingPlans ? (
            <div className="col-span-3 text-center py-8 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : plans.map(p => (
            <button
              key={p.code}
              type="button"
              onClick={() => setPlanCode(p.code)}
              className={`text-left rounded-2xl p-5 border-2 transition-all bg-white dark:bg-surface-800 ${planCode === p.code ? 'border-primary-500 shadow-elevated' : 'border-gray-200 dark:border-surface-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{p.nom}</h3>
                {p.misEnAvant && <span className="badge badge-info !text-[10px]">Recommandé</span>}
              </div>
              <p className="text-sm text-gray-500 mb-3">{p.description}</p>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{fmt(p.prixMensuel)} <span className="text-sm font-medium text-gray-400">FCFA / mois</span></div>
              <ul className="mt-3 space-y-1.5">
                {(p.fonctionnalites || []).map((f: string, i: number) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 text-accent-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom de votre entreprise *</label>
              <input type="text" value={form.raisonSociale} onChange={e => updateField('raisonSociale', e.target.value)} className="input-field" placeholder="Ex: Transit Express SARL" required />
            </div>

            <div>
              <label className="label">Sous-domaine *</label>
              <div className="flex items-center gap-2">
                <input type="text" value={form.sousDomaine} onChange={e => updateField('sousDomaine', e.target.value)} className="input-field flex-1" placeholder="transit-express" required minLength={3} />
                <span className="text-sm text-gray-400 whitespace-nowrap">.gbtrans.app</span>
              </div>
              {form.sousDomaine.length >= 3 && (
                <p className={`text-xs mt-1 ${dispoCheck.checking ? 'text-gray-400' : dispoCheck.disponible ? 'text-accent-600' : 'text-red-500'}`}>
                  {dispoCheck.checking ? 'Vérification...' : dispoCheck.disponible ? '✓ Disponible' : dispoCheck.raison || 'Déjà utilisé'}
                </p>
              )}
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
