'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { platformAuth } from '@/lib/platformApi';

function Formulaire() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [mdp, setMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [afficher, setAfficher] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [fait, setFait] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (mdp !== confirmation) { setErreur('Les deux mots de passe ne sont pas identiques.'); return; }
    setLoading(true);
    try {
      await platformAuth.reinitialiserMotDePasse(token, mdp);
      setFait(true);
      setTimeout(() => router.push('/admin/login'), 2500);
    } catch (err: any) {
      setErreur(!err.response ? 'Impossible de joindre le serveur. Réessayez dans un instant.' : err.response?.data?.message || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  if (!token) {
    return (
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
        <p role="alert">Ce lien est incomplet. Demandez un nouveau lien de réinitialisation.</p>
        <Link href="/admin/mot-de-passe-oublie" className="text-primary-600 hover:underline dark:text-primary-300">Demander un nouveau lien</Link>
      </div>
    );
  }
  if (fait) return <p role="status" className="text-sm text-gray-700 dark:text-gray-200">Mot de passe modifié. Redirection vers la connexion…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {erreur && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {erreur}{/invalide|expiré/i.test(erreur) && <> <Link href="/admin/mot-de-passe-oublie" className="underline">Demander un nouveau lien</Link></>}
        </div>
      )}
      <div>
        <label htmlFor="nouveau-mdp" className="label">Nouveau mot de passe</label>
        <input id="nouveau-mdp" type={afficher ? 'text' : 'password'} autoComplete="new-password" autoFocus value={mdp} onChange={e => setMdp(e.target.value)} className="input-field" required />
        <p className="mt-1 text-xs text-gray-500">Minimum 8 caractères, avec au moins une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
      </div>
      <div>
        <label htmlFor="confirmation-mdp" className="label">Confirmation</label>
        <input id="confirmation-mdp" type={afficher ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="input-field" required />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input type="checkbox" checked={afficher} onChange={e => setAfficher(e.target.checked)} /> Afficher les mots de passe
      </label>
      <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">{loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button>
    </form>
  );
}

export default function ReinitialiserPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-elevated" />
          <h1 className="font-display text-2xl font-extrabold text-white">Nouveau mot de passe</h1>
          <p className="text-sm text-white/60 mt-1">Administration de la plateforme GBTrans</p>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated p-6 sm:p-7">
          <Suspense fallback={<p className="text-sm text-gray-500">Chargement…</p>}><Formulaire /></Suspense>
        </div>
      </div>
    </div>
  );
}
