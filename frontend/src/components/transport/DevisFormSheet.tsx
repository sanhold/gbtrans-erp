'use client';

import FormSheet, { FormSection } from '@/components/forms/FormSheet';

export const LIGNE_VIDE = { origine: '', destination: '', designationMarchandise: '', dateDepartPrevue: '', montantEstime: '' };
export const fmtFcfa = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  clients: any[];
  clientId: string; setClientId: (v: string) => void;
  objet: string; setObjet: (v: string) => void;
  dateValidite: string; setDateValidite: (v: string) => void;
  lignes: any[];
  majLigne: (i: number, champ: string, valeur: string) => void;
  ajouterLigne: () => void;
  retirerLigne: (i: number) => void;
  montantTotal: number;
}

export default function DevisFormSheet(p: Props) {
  return (
    <FormSheet open={p.open} onClose={p.onClose} size="2xl" title="Nouveau devis transport" onSubmit={p.onSubmit} saving={p.saving} submitLabel="Créer le devis">
      <FormSection title="Devis">
        <div>
          <label className="label">Client *</label>
          <select value={p.clientId} onChange={e => p.setClientId(e.target.value)} className="input-field" required>
            <option value="">Sélectionner...</option>
            {p.clients.map((c: any) => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}
          </select>
        </div>
        <div><label className="label">Date de validité</label><input type="date" value={p.dateValidite} onChange={e => p.setDateValidite(e.target.value)} className="input-field" /></div>
      </FormSection>
      <div><label className="label">Objet</label><input type="text" value={p.objet} onChange={e => p.setObjet(e.target.value)} className="input-field" placeholder="Ex: Transport de marchandises Abidjan - Ouagadougou" /></div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Voyages prévus *</h3>
          <button type="button" onClick={p.ajouterLigne} className="min-h-[44px] px-2 text-sm font-medium text-primary-600 hover:underline">+ Ajouter un voyage</button>
        </div>
        {p.lignes.map((l, i) => (
          <div key={i} className="border border-gray-200 dark:border-surface-700 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="text" aria-label="Origine" value={l.origine} onChange={e => p.majLigne(i, 'origine', e.target.value)} className="input-field" placeholder="Origine *" />
              <input type="text" aria-label="Destination" value={l.destination} onChange={e => p.majLigne(i, 'destination', e.target.value)} className="input-field" placeholder="Destination *" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="text" aria-label="Marchandise" value={l.designationMarchandise} onChange={e => p.majLigne(i, 'designationMarchandise', e.target.value)} className="input-field" placeholder="Marchandise" />
              <input type="date" aria-label="Départ prévu" value={l.dateDepartPrevue} onChange={e => p.majLigne(i, 'dateDepartPrevue', e.target.value)} className="input-field" />
              <input type="number" inputMode="numeric" aria-label="Montant estimé" value={l.montantEstime} onChange={e => p.majLigne(i, 'montantEstime', e.target.value)} className="input-field" placeholder="Montant estimé *" />
            </div>
            {p.lignes.length > 1 && <button type="button" onClick={() => p.retirerLigne(i)} className="min-h-[44px] px-1 text-sm font-medium text-red-600 hover:underline">Retirer ce voyage</button>}
          </div>
        ))}
        <p className="text-right text-sm font-semibold">Total estimé : {fmtFcfa(p.montantTotal)}</p>
      </section>
    </FormSheet>
  );
}
