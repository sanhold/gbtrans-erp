'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import { authApi, utilisateursApi } from '@/lib/api';
import { resetSocieteBranding } from '@/lib/generatePDF';
import { useAuthStore } from '@/stores/authStore';

export default function MonComptePage() {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();

  // --- Changement de mot de passe ---
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nouveau !== confirmation) {
      toast.error('Le nouveau mot de passe et sa confirmation ne correspondent pas');
      return;
    }
    setSavingPassword(true);
    try {
      const response = await authApi.changePassword(ancien, nouveau);
      const message = response.data?.data?.message || response.data?.message || 'Mot de passe modifié avec succès';
      toast.success(`${message} Veuillez vous reconnecter.`, { duration: 5000 });
      await useAuthStore.getState().logout();
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Signature et cachet personnels ---
  const canSignature = hasPermission('DOCUMENTS:SIGNATURE');
  const [signature, setSignature] = useState<string | null>(null);
  const [cachet, setCachet] = useState<string | null>(null);
  const [savingImages, setSavingImages] = useState(false);

  useEffect(() => {
    utilisateursApi.maSignature().then(r => { setSignature(r.data.data?.signature || null); setCachet(r.data.data?.cachet || null); }).catch(() => {});
  }, []);

  const lireImage = (file: File | undefined, apply: (dataUrl: string) => void) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { toast.error('Image PNG, JPG ou WebP attendue'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image trop volumineuse (2 Mo maximum)'); return; }
    const reader = new FileReader();
    reader.onload = () => apply(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSaveImages = async () => {
    setSavingImages(true);
    try {
      await utilisateursApi.setMaSignature({ signature, cachet });
      resetSocieteBranding();
      toast.success('Signature et cachet enregistrés');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingImages(false);
    }
  };

  // --- Double authentification (2FA) ---
  const [doubleAuth, setDoubleAuth] = useState<boolean>(!!user?.doubleAuth);
  const [settingUp2FA, setSettingUp2FA] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [code2FA, setCode2FA] = useState('');
  const [confirming2FA, setConfirming2FA] = useState(false);

  const handleStartSetup2FA = async () => {
    setSettingUp2FA(true);
    try {
      const response = await authApi.setup2FA();
      setQrCodeUrl(response.data?.data?.qrCodeUrl);
      setCode2FA('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la préparation de la double authentification');
    } finally {
      setSettingUp2FA(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirming2FA(true);
    try {
      await authApi.confirm2FA(code2FA);
      toast.success('Double authentification activée — à la prochaine connexion, un code vous sera demandé.', { duration: 6000 });
      setDoubleAuth(true);
      setQrCodeUrl(null);
      setCode2FA('');
      // Rafraîchit le profil en mémoire sans recharger toute la page
      useAuthStore.getState().loadProfile(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Code de vérification invalide');
    } finally {
      setConfirming2FA(false);
    }
  };

  const handleCancelSetup2FA = () => {
    setQrCodeUrl(null);
    setCode2FA('');
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mon compte</h1>
          <p className="text-sm text-gray-500">Gérez votre mot de passe et la sécurité de votre compte</p>
        </div>

        {/* Signature et cachet personnels */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Ma signature et mon cachet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Ils s&apos;affichent sur les documents (proforma, facture, AT, dotation) que vous générez, quand l&apos;option « Afficher la signature » est cochée.
          </p>
          {!canSignature ? (
            <p className="text-sm text-amber-600">Votre profil n&apos;a pas le droit « Signature sur les documents » (DOCUMENTS:SIGNATURE). Demandez-le à un administrateur.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { titre: 'Signature', valeur: signature, set: setSignature },
                  { titre: 'Cachet', valeur: cachet, set: setCachet },
                ].map(({ titre, valeur, set }) => (
                  <div key={titre}>
                    <div className="label">{titre}</div>
                    <div className="h-24 w-full border border-dashed border-gray-300 dark:border-surface-600 rounded-sm flex items-center justify-center bg-gray-50 dark:bg-surface-700 mb-2">
                      {valeur ? <img src={valeur} alt={titre} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-gray-400">Aucun</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="btn-secondary cursor-pointer">
                        Choisir une image
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { lireImage(e.target.files?.[0], set); e.target.value = ''; }} />
                      </label>
                      {valeur && <button type="button" onClick={() => set(null)} className="text-xs text-red-500 hover:underline">Supprimer</button>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">PNG, JPG ou WebP, 2 Mo maximum. Un fond transparent (PNG) donne le meilleur rendu.</p>
              <div className="flex justify-end mt-4">
                <button type="button" onClick={handleSaveImages} disabled={savingImages} className="btn-primary">{savingImages ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </>
          )}
        </div>

        {/* Changer le mot de passe */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Changer mon mot de passe</h3>
          <p className="text-xs text-gray-500 mb-4">
            Après la modification, toutes vos sessions actives seront fermées et vous devrez vous reconnecter.
          </p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Ancien mot de passe</label>
              <input
                type="password"
                value={ancien}
                onChange={(e) => setAncien(e.target.value)}
                className="input-field"
                placeholder="Votre mot de passe actuel"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={nouveau}
                  onChange={(e) => setNouveau(e.target.value)}
                  className="input-field"
                  placeholder="Nouveau mot de passe"
                  required
                />
              </div>
              <div>
                <label className="label">Confirmation</label>
                <input
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="input-field"
                  placeholder="Confirmez le nouveau mot de passe"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400">
              Minimum 8 caractères, avec au moins une majuscule, une minuscule, un chiffre et un caractère spécial.
            </p>
            <div className="flex justify-end">
              <button type="submit" disabled={savingPassword} className="btn-primary disabled:opacity-50">
                {savingPassword ? 'Enregistrement...' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </div>

        {/* Double authentification */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Double authentification (2FA)</h3>
          <p className="text-xs text-gray-500 mb-4">
            Ajoutez une couche de sécurité supplémentaire : un code à usage unique vous sera demandé à chaque connexion.
          </p>

          {doubleAuth ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Double authentification activée</p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Un code de votre application d&apos;authentification vous sera demandé à chaque connexion.
                </p>
              </div>
            </div>
          ) : !qrCodeUrl ? (
            <div>
              <button
                type="button"
                onClick={handleStartSetup2FA}
                disabled={settingUp2FA}
                className="btn-primary disabled:opacity-50"
              >
                {settingUp2FA ? 'Préparation...' : 'Activer la double authentification'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 px-4 py-3">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Important</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Scannez le QR code ci-dessous avec une application d&apos;authentification (Google Authenticator, Authy...)
                  AVANT de confirmer. Il n&apos;existe actuellement aucun moyen de récupérer l&apos;accès si vous perdez cette
                  application : gardez-la bien configurée.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="QR code de double authentification" className="w-44 h-44 rounded-lg border border-gray-200 dark:border-surface-700" />
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Scannez ce QR code, puis entrez le code à 6 chiffres affiché par votre application.
                </p>
              </div>

              <form onSubmit={handleConfirm2FA} className="space-y-3 max-w-xs mx-auto">
                <div>
                  <label className="label text-center">Code de vérification</label>
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
                <div className="flex gap-2">
                  <button type="button" onClick={handleCancelSetup2FA} className="btn-secondary flex-1">
                    Annuler
                  </button>
                  <button type="submit" disabled={confirming2FA || code2FA.length !== 6} className="btn-primary flex-1 disabled:opacity-50">
                    {confirming2FA ? 'Vérification...' : 'Confirmer'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
