'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [code2FA, setCode2FA] = useState('');
  const [tempToken, setTempToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login(email, motDePasse);
      if (result.requiresTwoFactor) {
        setShow2FA(true);
        setTempToken(result.tempToken);
        toast('Entrez votre code de double authentification', { icon: '🔐' });
      } else {
        toast.success('Connexion réussie');
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { authApi } = await import('@/lib/api');
      const response = await authApi.verify2FA(email, code2FA, tempToken);
      const { data } = response.data;
      localStorage.setItem('gbtrans_token', data.token);
      localStorage.setItem('gbtrans_user', JSON.stringify(data.utilisateur));
      toast.success('Connexion réussie');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Code invalide');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8">
            <span className="text-white font-bold text-4xl">GB</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">GBTRANS ERP</h1>
          <p className="text-xl text-white/80 mb-2">Bureau de Transit</p>
          <p className="text-white/60 max-w-md">
            Solution professionnelle de gestion de transit, douane et logistique internationale
          </p>
          <div className="mt-12 flex gap-6 justify-center text-white/70 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Multi</div>
              <div>Sociétés</div>
            </div>
            <div className="w-px bg-white/30" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">OHADA</div>
              <div>Conforme</div>
            </div>
            <div className="w-px bg-white/30" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">100%</div>
              <div>Sécurisé</div>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau droit - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50 dark:bg-surface-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">GB</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GBTRANS ERP</h1>
          </div>

          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated p-8">
            <div className="mb-8 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {show2FA ? 'Vérification 2FA' : 'Connexion'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  {show2FA
                    ? 'Entrez le code de votre application d\'authentification'
                    : 'Accédez à votre espace de gestion'}
                </p>
              </div>
              {!show2FA && (
                <button
                  type="button"
                  onClick={() => { setEmail('admin@gbtrans.ci'); setMotDePasse('Admin@2024!'); }}
                  title="Remplir avec les identifiants admin"
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Admin
                </button>
              )}
            </div>

            {!show2FA ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="votre-email@entreprise.ci"
                    required
                  />
                </div>

                <div>
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Votre mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Se souvenir</span>
                  </label>
                  <a href="#" className="text-sm text-primary-500 hover:text-primary-600">
                    Mot de passe oublié ?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-2.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handle2FA} className="space-y-5">
                <div>
                  <label className="label">Code de vérification</label>
                  <input
                    type="text"
                    value={code2FA}
                    onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-2.5">
                  Vérifier
                </button>

                <button
                  type="button"
                  onClick={() => setShow2FA(false)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  Retour à la connexion
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            GBTRANS ERP v1.0.0 - Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
