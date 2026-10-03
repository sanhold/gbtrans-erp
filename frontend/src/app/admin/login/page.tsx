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

  const remplirCompteDemo = () => {
    setEmail('demo-admin@gbtrans.ci');
    setMotDePasse('Demo@2026!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await platformAuth.login(email, motDePasse);
      const { token, admin } = res.data.data;
      platformAuth.setSession(token, admin);
      router.push('/admin/societes');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-14 h-14 rounded-2xl mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Administration de la plateforme</h1>
          <p className="text-sm text-white/50 mt-1">Réservé aux opérateurs GBTRANS</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="label !text-white/70">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field !bg-surface-900 !border-surface-700 !text-white" required />
          </div>
          <div>
            <label className="label !text-white/70">Mot de passe</label>
            <input type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} className="input-field !bg-surface-900 !border-surface-700 !text-white" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5 text-sm disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <button
          type="button"
          onClick={remplirCompteDemo}
          className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Remplir le compte de démonstration (tests)
        </button>
      </div>
    </div>
  );
}
