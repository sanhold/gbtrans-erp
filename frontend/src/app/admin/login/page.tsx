'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformAuth } from '@/lib/platformApi';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const remplirCompteDemo = () => {
    setEmail('demo-admin@gbtrans.ci');
    setMotDePasse('Demo@2026!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');
    try {
      const res = await platformAuth.login(email, motDePasse);
      const { token, admin } = res.data.data;
      platformAuth.setSession(token, admin);
      router.push('/admin/societes');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Identifiants incorrects';
      setErreur(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface-900 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-14 h-14 rounded-2xl mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Administration de la plateforme</h1>
          <p className="text-sm text-white/70 mt-1">Réservé aux opérateurs GBTRANS</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="adm-email" className="label !text-white/80">Email</label>
            <input id="adm-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={erreur ? true : undefined} value={email} onChange={e => setEmail(e.target.value)} className="input-field !bg-surface-900 !border-surface-700 !text-white" required />
          </div>
          <div>
            <label htmlFor="adm-pass" className="label !text-white/80">Mot de passe</label>
            <input id="adm-pass" type="password" autoComplete="current-password" aria-invalid={erreur ? true : undefined} aria-describedby={erreur ? 'adm-erreur' : undefined} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} className="input-field !bg-surface-900 !border-surface-700 !text-white" required />
          </div>
          {erreur && <p id="adm-erreur" role="alert" className="text-sm text-red-300 -mt-1">{erreur}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full min-h-[48px] !py-2.5 text-sm disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <button
          type="button"
          onClick={remplirCompteDemo}
          className="mt-4 w-full min-h-[44px] text-center text-xs text-white/70 hover:text-white transition-colors"
        >
          Remplir le compte de démonstration (tests)
        </button>
      </div>
    </div>
  );
}
