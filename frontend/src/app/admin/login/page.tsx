'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { platformAuth } from '@/lib/platformApi';
import { reveillerServeur } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [afficher, setAfficher] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [lent, setLent] = useState(false);

  // Réveille le serveur dès l'ouverture de la page (il s'endort après inactivité).
  useEffect(() => { reveillerServeur(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');
    const minuteur = setTimeout(() => setLent(true), 6000);
    try {
      const res = await platformAuth.login(email, motDePasse);
      const { token, admin } = res.data.data;
      platformAuth.setSession(token, admin);
      router.push('/admin');
    } catch (err: any) {
      // Pas de réponse du serveur : ne pas faire croire à un mauvais mot de passe.
      setErreur(
        !err.response
          ? 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez dans un instant.'
          : err.response?.data?.message || 'Identifiants incorrects'
      );
    } finally {
      clearTimeout(minuteur);
      setLent(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-elevated" />
          <h1 className="font-display text-2xl font-extrabold text-white">Administration</h1>
          <p className="text-sm text-white/60 mt-1">Espace réservé aux opérateurs de la plateforme GBTrans</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated p-6 sm:p-7 space-y-5">
          {erreur && (
            <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{erreur}</span>
            </div>
          )}

          <div>
            <label htmlFor="admin-email" className="label">Adresse e-mail</label>
            <input id="admin-email" type="email" autoComplete="username" autoFocus value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
          </div>

          <div>
            <label htmlFor="admin-mdp" className="label">Mot de passe</label>
            <div className="relative">
              <input id="admin-mdp" type={afficher ? 'text' : 'password'} autoComplete="current-password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} className="input-field pr-11" required />
              <button
                type="button"
                onClick={() => setAfficher(!afficher)}
                aria-label={afficher ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  {afficher
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="text-center text-sm">
            <Link href="/admin/mot-de-passe-oublie" className="text-primary-600 hover:underline dark:text-primary-300">Mot de passe oublié ?</Link>
          </p>
          {lent && loading && (
            <p role="status" className="text-xs text-center text-gray-500 dark:text-gray-400">
              Le serveur se réveille, cela peut prendre jusqu&apos;à une minute. Merci de patienter…
            </p>
          )}
        </form>

        <p className="text-center text-xs text-white/40 mt-6">GBTrans ERP · Administration de la plateforme</p>
      </div>
    </div>
  );
}
