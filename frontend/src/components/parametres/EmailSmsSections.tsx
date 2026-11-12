'use client';

import { useSociete } from './useSociete';
import { Spinner } from './EntrepriseSection';
import TextField from '@/components/forms/TextField';

export function EmailSection() {
  const s = useSociete();
  const f = s.societeForm;
  const set = (k: keyof typeof f) => (v: string) => s.setSocieteForm({ ...f, [k]: v });
  if (s.loadingSociete) return <Spinner />;
  return (
    <form onSubmit={s.handleSaveSociete} className="space-y-4">
      <h3 className="text-lg font-semibold">Configuration SMTP</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Serveur SMTP" value={f.smtpHost} onChange={set('smtpHost')} placeholder="smtp.gmail.com" autoComplete="off" />
        <TextField label="Port" type="number" inputMode="numeric" value={f.smtpPort} onChange={set('smtpPort')} placeholder="587" />
        <TextField label="Utilisateur" value={f.smtpUser} onChange={set('smtpUser')} autoComplete="off" />
        <TextField label="Mot de passe" type="password" value={f.smtpPass} onChange={set('smtpPass')} autoComplete="new-password" placeholder={s.societe?.smtpHost ? '••••••••' : ''} />
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer sm:col-span-2">
          <input type="checkbox" checked={f.smtpSecure} onChange={e => s.setSocieteForm({ ...f, smtpSecure: e.target.checked })} className="w-5 h-5 rounded" />
          <span className="text-sm">Connexion sécurisée (TLS/SSL)</span>
        </label>
      </div>
      <div className="flex justify-end"><button type="submit" disabled={s.savingSociete} className="btn-primary w-full sm:w-auto disabled:opacity-50">{s.savingSociete ? 'Enregistrement...' : 'Enregistrer'}</button></div>
    </form>
  );
}

export function SmsSection() {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Configuration SMS</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">Configurez l&apos;API Orange pour l&apos;envoi de SMS automatiques.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div><label htmlFor="sms-key" className="label">Clé API Orange</label><input id="sms-key" type="text" className="input-field" autoComplete="off" /></div>
        <div><label htmlFor="sms-secret" className="label">Secret API</label><input id="sms-secret" type="password" className="input-field" autoComplete="new-password" /></div>
      </div>
    </div>
  );
}
