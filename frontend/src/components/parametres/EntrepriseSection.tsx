'use client';

import { useSociete } from './useSociete';
import TextField from '@/components/forms/TextField';

export function Spinner() {
  return <div className="text-center py-8" role="status" aria-label="Chargement"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
}

function ImageUploader({ label, image, alt, vide, busy, onChange, onRemove }: {
  label: string; image?: string | null; alt: string; vide: string; busy: boolean;
  onChange: (f: File | null) => void; onRemove: () => void;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {image ? <img src={image} alt={alt} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-600 dark:text-gray-400">{vide}</span>}
        </div>
        <div className="flex flex-col items-start gap-1">
          <label className="btn-secondary cursor-pointer">
            {busy ? 'Envoi...' : 'Choisir un fichier'}
            <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={e => { onChange(e.target.files?.[0] || null); e.target.value = ''; }} />
          </label>
          {image && <button type="button" onClick={onRemove} disabled={busy} className="min-h-[44px] px-1 text-sm font-medium text-red-600 hover:underline">Supprimer</button>}
        </div>
      </div>
    </div>
  );
}

export default function EntrepriseSection() {
  const s = useSociete();
  const { societe, societeForm: f, setSocieteForm } = s;
  const set = (k: keyof typeof f) => (v: string) => setSocieteForm({ ...f, [k]: v });

  if (s.loadingSociete) return <Spinner />;

  const activite = (champ: 'activiteTransit' | 'activiteTransport', nom: string) => {
    const on = !!societe?.[champ];
    return (
      <div className={`rounded-xl border-2 p-3 flex items-center justify-between gap-3 ${on ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-surface-700'}`}>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{nom}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{on ? 'Activée' : 'Désactivée'}</p>
        </div>
        <button type="button" onClick={() => s.toggleActivite(champ, !on)} disabled={s.togglingActivite} className="btn-secondary disabled:opacity-50">
          {on ? 'Désactiver' : 'Activer'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold mb-1">Logo et signature</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">Affichés sur les documents générés (proforma, facture...). Image, 2 Mo maximum.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ImageUploader label="Logo de l'entreprise" image={societe?.logo} alt="Logo" vide="Aucun" busy={s.uploadingLogo} onChange={s.handleLogoChange} onRemove={s.handleRemoveLogo} />
          <ImageUploader label="Signature (cachet du responsable)" image={societe?.signature} alt="Signature" vide="Aucune" busy={s.uploadingSignature} onChange={s.handleSignatureChange} onRemove={s.handleRemoveSignature} />
        </div>
      </section>

      <section className="card !p-4 sm:!p-5">
        <h3 className="text-lg font-semibold mb-1">Activités</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Détermine les modules visibles dans le menu (Transit : dossiers, douane, AT, cautions — Transport : véhicules, chauffeurs, courses). Au moins une activité doit rester active.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activite('activiteTransit', 'Transit')}
          {activite('activiteTransport', 'Transport')}
        </div>
      </section>

      <form onSubmit={s.handleSaveSociete} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold mb-3">Informations société</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Raison sociale" value={f.raisonSociale} onChange={set('raisonSociale')} autoComplete="organization" />
            <TextField label="Forme juridique" value={f.formeJuridique} onChange={set('formeJuridique')} />
            <TextField label="NCC" value={f.ncc} onChange={set('ncc')} />
            <TextField label="RCCM" value={f.rccm} onChange={set('rccm')} />
            <TextField label="Régime fiscal" value={f.regime} onChange={set('regime')} />
            <TextField label="Taux TVA (%)" type="number" inputMode="decimal" value={f.tauxTVA} onChange={set('tauxTVA')} />
            <div>
              <label htmlFor="soc-devise" className="label">Devise</label>
              <select id="soc-devise" value={f.devise} onChange={e => set('devise')(e.target.value)} className="input-field">
                <option value="XOF">XOF</option><option value="EUR">EUR</option><option value="USD">USD</option>
              </select>
            </div>
            <TextField label="Timbre fiscal" type="number" inputMode="numeric" value={f.timbreFiscal} onChange={set('timbreFiscal')} />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold mb-3">Coordonnées</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField wrapperClassName="sm:col-span-2" label="Adresse" value={f.adresse} onChange={set('adresse')} autoComplete="street-address" />
            <TextField label="Ville" value={f.ville} onChange={set('ville')} />
            <TextField label="Pays" value={f.pays} onChange={set('pays')} />
            <TextField label="Téléphone" type="tel" inputMode="tel" value={f.telephone} onChange={set('telephone')} />
            <TextField label="Mobile" type="tel" inputMode="tel" value={f.mobile} onChange={set('mobile')} />
            <TextField label="Email" type="email" inputMode="email" value={f.email} onChange={set('email')} />
            <TextField label="Site web" type="url" inputMode="url" value={f.siteWeb} onChange={set('siteWeb')} />
          </div>
        </fieldset>

        <fieldset className="space-y-3 pt-2 border-t border-gray-200 dark:border-surface-700">
          <legend className="text-lg font-semibold pt-3 mb-1">En-tête et pied de page des documents</legend>
          <p className="text-xs text-gray-600 dark:text-gray-400">Ces informations apparaissent sur les factures, proformas et autres documents générés (PDF, impression).</p>
          <TextField label="Slogan / Activité (sous le nom de l'entreprise)" value={f.slogan} onChange={set('slogan')} placeholder="Transit · Douane · Logistique" />
          <div>
            <label htmlFor="soc-mention" className="label">Mention légale (pied de page)</label>
            <textarea id="soc-mention" value={f.mentionLegale} onChange={e => set('mentionLegale')(e.target.value)} className="input-field" rows={2} placeholder="Ex : Facture proforma — non valable pour dédouanement. Établie sous réserve d'acceptation." />
          </div>
        </fieldset>

        <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-white dark:bg-surface-800 border-t sm:border-0 border-gray-200 dark:border-surface-700 flex justify-end">
          <button type="submit" disabled={s.savingSociete} className="btn-primary w-full sm:w-auto disabled:opacity-50">{s.savingSociete ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}
