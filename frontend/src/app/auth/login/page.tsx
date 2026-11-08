'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { reveillerServeur } from '@/lib/api';
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
  const [erreur, setErreur] = useState('');
  const [verification, setVerification] = useState(false);
  const [lent, setLent] = useState(false);

  // Comptes de test : visibles hors production, sur les prévisualisations Vercel (environnement de test),
  // si NEXT_PUBLIC_SHOW_TEST_ACCOUNTS=true, ou en ouvrant la page avec ?comptes-test. Jamais affichés
  // par défaut aux visiteurs sur le domaine de production.
  const [comptesTestActifs, setComptesTestActifs] = useState(
    process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS === 'true'
  );
  const [mdpTestEnregistre, setMdpTestEnregistre] = useState(false);
  const [compteEnAttente, setCompteEnAttente] = useState<string | null>(null);
  const [saisieMdpTest, setSaisieMdpTest] = useState('');
  const CLE_MDP_TEST = 'gbtrans_test_pwd';

  // Réveille le serveur dès l'ouverture de la page (il s'endort après inactivité).
  useEffect(() => { reveillerServeur(); }, []);

  useEffect(() => {
    try {
      // Prévisualisations Vercel (ex : gbtrans-git-test-sanhold-projects.vercel.app) = environnement de test.
      // Le domaine de production (gbtrans.vercel.app, gbtrans-sanhold-projects.vercel.app) ne correspond pas.
      const hote = window.location.hostname;
      const estPrevisualisation = /^gbtrans-.+-sanhold-projects\.vercel\.app$/.test(hote);
      if (estPrevisualisation || new URLSearchParams(window.location.search).has('comptes-test')) setComptesTestActifs(true);
      setMdpTestEnregistre(!!localStorage.getItem(CLE_MDP_TEST));
    } catch {
      // stockage indisponible : le formulaire reste utilisable à la main
    }
  }, []);

  const comptesTest = [
    { label: 'Administrateur', email: 'admin@gbtrans.ci', color: 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300' },
    { label: 'Transitaire', email: 'transitaire@gbtrans.ci', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' },
    { label: 'Comptable', email: 'comptable@gbtrans.ci', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300' },
    { label: 'Commercial', email: 'commercial@gbtrans.ci', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300' },
    { label: 'Consultation', email: 'consultation@gbtrans.ci', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300' },
  ];

  const connecter = async (emailSaisi: string, mdpSaisi: string) => {
    setErreur('');
    // Après 6 s sans réponse, on explique l'attente au lieu de laisser croire à un blocage.
    const minuteur = setTimeout(() => setLent(true), 6000);
    try {
      const result = await login(emailSaisi, mdpSaisi);
      if (result.requiresTwoFactor) {
        setShow2FA(true);
        setTempToken(result.tempToken);
        toast('Entrez votre code de double authentification', { icon: '🔐' });
      } else {
        toast.success('Connexion réussie');
        router.push('/dashboard');
      }
    } catch (error: any) {
      setErreur(error.message || 'Connexion impossible. Vérifiez vos identifiants.');
    } finally {
      clearTimeout(minuteur);
      setLent(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await connecter(email, motDePasse);
  };

  // Un clic sur un profil de test = connexion directe. Le mot de passe de test n'est jamais dans le
  // code : il est saisi une fois puis gardé sur cet appareil seulement (localStorage).
  const cliquerCompteTest = async (testEmail: string) => {
    let mdp = '';
    try { mdp = localStorage.getItem(CLE_MDP_TEST) || ''; } catch { /* ignoré */ }
    if (!mdp && process.env.NODE_ENV !== 'production') mdp = 'Admin@2024!'; // défaut du seed, développement local uniquement
    setEmail(testEmail);
    if (!mdp) {
      setCompteEnAttente(testEmail);
      return;
    }
    setMotDePasse(mdp);
    await connecter(testEmail, mdp);
  };

  const enregistrerMdpTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compteEnAttente || !saisieMdpTest) return;
    try { localStorage.setItem(CLE_MDP_TEST, saisieMdpTest); setMdpTestEnregistre(true); } catch { /* ignoré */ }
    const cible = compteEnAttente;
    const mdp = saisieMdpTest;
    setCompteEnAttente(null);
    setSaisieMdpTest('');
    setMotDePasse(mdp);
    await connecter(cible, mdp);
  };

  const oublierMdpTest = () => {
    try { localStorage.removeItem(CLE_MDP_TEST); } catch { /* ignoré */ }
    setMdpTestEnregistre(false);
    setCompteEnAttente(null);
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setVerification(true);
    try {
      const { authApi } = await import('@/lib/api');
      const response = await authApi.verify2FA(email, code2FA, tempToken);
      const { data } = response.data;
      const { invalidateCache } = await import('@/lib/cache');
      invalidateCache();
      localStorage.setItem('gbtrans_token', data.token);
      localStorage.setItem('gbtrans_user', JSON.stringify(data.utilisateur));
      toast.success('Connexion réussie');
      router.push('/dashboard');
    } catch (error: any) {
      setErreur(error.response?.data?.message || 'Code invalide');
      setVerification(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 flex-col justify-center items-center p-12 relative overflow-hidden">
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
          <div className="w-24 h-24 bg-white/20 rounded-sm flex items-center justify-center mx-auto mb-8 p-2">
            <img src="/brand/logo-icon.png" alt="GBTrans" className="w-full h-full rounded-2xl" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">GBTRANS ERP</h1>
          <p className="text-xl text-white/80 mb-2">Bureau de Transit</p>
          <p className="text-white/60 max-w-md">
            Solution professionnelle de gestion de transit, douane et logistique internationale
          </p>
          <ul className="mt-10 space-y-3 text-left max-w-sm mx-auto text-white/80 text-sm">
            {[
              'Dossiers de transit, AT et cautions suivis étape par étape',
              'Proformas, factures et paiements au même endroit',
              'Comptabilité conforme OHADA, générée automatiquement',
              'Transport : véhicules, chauffeurs et courses',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <svg className="w-5 h-5 flex-shrink-0 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Panneau droit - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50 dark:bg-surface-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <img src="/brand/logo-icon.png" alt="GBTrans" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GBTRANS ERP</h1>
          </div>

          <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 shadow-card p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {show2FA ? 'Vérification 2FA' : 'Connexion'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                {show2FA
                  ? 'Entrez le code de votre application d\'authentification'
                  : 'Accédez à votre espace de gestion'}
              </p>
            </div>

            {erreur && (
              <div role="alert" className="mb-5 flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{erreur}</span>
              </div>
            )}

            {!show2FA ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="label">Adresse e-mail</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="votre-email@entreprise.ci"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="motdepasse" className="label">Mot de passe</label>
                  <div className="relative">
                    <input
                      id="motdepasse"
                      autoComplete="current-password"
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
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mot de passe oublié ? Contactez l&apos;administrateur de votre société pour le réinitialiser.
                </p>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-2.5"
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
                {lent && isLoading && (
                  <p role="status" className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Le serveur se réveille, cela peut prendre jusqu'à une minute. Merci de patienter…
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={handle2FA} className="space-y-5">
                <div>
                  <label htmlFor="code2fa" className="label">Code de vérification</label>
                  <input
                    id="code2fa"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code2FA}
                    onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                <button type="submit" disabled={verification} className="btn-primary w-full py-2.5">
                  {verification ? 'Vérification…' : 'Vérifier'}
                </button>

                <button
                  type="button"
                  onClick={() => { setShow2FA(false); setErreur(''); }}
                  className="btn-ghost w-full"
                >
                  Retour à la connexion
                </button>
              </form>
            )}
          </div>

          {!show2FA && comptesTestActifs && (
            <div className="mt-6 bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 shadow-card p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                Comptes de test : un clic pour se connecter
              </p>
              <div className="flex flex-wrap gap-2">
                {comptesTest.map((compte) => (
                  <button
                    key={compte.email}
                    type="button"
                    onClick={() => cliquerCompteTest(compte.email)}
                    disabled={isLoading}
                    title={compte.email}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${compte.color}`}
                  >
                    {compte.label}
                  </button>
                ))}
              </div>
              {compteEnAttente && (
                <form onSubmit={enregistrerMdpTest} className="mt-4 space-y-2">
                  <label htmlFor="mdptest" className="label">Mot de passe des comptes de test</label>
                  <input
                    id="mdptest"
                    type="password"
                    value={saisieMdpTest}
                    onChange={(e) => setSaisieMdpTest(e.target.value)}
                    className="input-field"
                    autoFocus
                    autoComplete="off"
                  />
                  <button type="submit" disabled={!saisieMdpTest} className="btn-primary w-full">
                    Enregistrer et me connecter
                  </button>
                </form>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                {mdpTestEnregistre
                  ? 'Mot de passe enregistré sur cet appareil uniquement. '
                  : 'Le mot de passe est demandé une seule fois, puis gardé sur cet appareil uniquement. '}
                {mdpTestEnregistre && (
                  <button type="button" onClick={oublierMdpTest} className="underline hover:text-gray-600">Oublier</button>
                )}
              </p>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            GBTRANS ERP v1.0.0 - Tous droits réservés
          </p>
          <div className="text-center mt-2">
            <a href="/admin/login" className="text-[11px] text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500">
              Administration
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
