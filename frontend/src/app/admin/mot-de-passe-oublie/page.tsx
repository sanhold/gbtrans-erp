'use client';

import { useState } from 'react';
import Link from 'next/link';
import { platformAuth } from '@/lib/platformApi';

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [envoye, setEnvoye] = useState('');
  const [erreur, setErreur] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');
    try {
      const res = await platformAuth.motDePasseOublie(email.trim());
      setEnvoye(res.data.message);
    } catch (err: any) {
      setErreur(!err.response ? 'Impossible de joindre le serveur. Réessayez dans un instant.' : err.response?.data?.message || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-elevated" />
          <h1 className="font-display text-2xl font-extrabold text-white">Mot de passe oublié</h1>
          <p className="text-sm text-white/60 mt-1">Administration de la plateforme GBTrans</p>
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated p-6 sm:p-7 space-y-5">
          {envoye ? (
            <div role="status" className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
              <p>{envoye}</p>
              <p className="text-gray-500">Pensez à vérifier vos courriers indésirables.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">Saisissez l&apos;adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
              {erreur && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{erreur}</div>}
              <div>
                <label htmlFor="reset-email" className="label">Adresse e-mail</label>
                <input id="reset-email" type="email" autoComplete="username" autoFocus value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">{loading ? 'Envoi…' : 'Envoyer le lien'}</button>
            </form>
          )}
          <p className="text-center text-sm">
            <Link href="/admin/login" className="text-primary-600 hover:underline dark:text-primary-300">Retour à la connexion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
