'use client';

import FormSheet, { FormSection } from '@/components/forms/FormSheet';
import { fmtMontant } from './CourseCard';

export interface FacturationState { id: string; clientId: string; montantFacturable: string; fraisCarburant: string; fraisPeage: string; autresFrais: string }

export default function FacturationCourseSheet({ value, onChange, onClose, onSave, clients }: {
  value: FacturationState | null; onChange: (v: FacturationState) => void; onClose: () => void; onSave: () => void; clients: any[];
}) {
  const v = value;
  const resultat = v ? Number(v.montantFacturable || 0) - Number(v.fraisCarburant || 0) - Number(v.fraisPeage || 0) - Number(v.autresFrais || 0) : 0;
  return (
    <FormSheet open={!!v} onClose={onClose} size="md" title="Facturation et dépenses" onSubmit={(e) => { e.preventDefault(); onSave(); }} submitLabel="Enregistrer">
      {v && (
        <>
          <FormSection title="Facturation" cols={1}>
            <div>
              <label className="label">Client à facturer</label>
              <select value={v.clientId} onChange={e => onChange({ ...v, clientId: e.target.value })} className="input-field">
                <option value="">— Sélectionner —</option>
                {clients.map((cl: any) => <option key={cl.id} value={cl.id}>{cl.raisonSociale}</option>)}
              </select>
            </div>
            <div><label className="label">Montant facturable (FCFA)</label><input type="number" inputMode="numeric" value={v.montantFacturable} onChange={e => onChange({ ...v, montantFacturable: e.target.value })} className="input-field" /></div>
          </FormSection>
          <FormSection title="Dépenses du voyage" cols={3}>
            <div><label className="label !text-xs">Carburant</label><input type="number" inputMode="numeric" value={v.fraisCarburant} onChange={e => onChange({ ...v, fraisCarburant: e.target.value })} className="input-field" /></div>
            <div><label className="label !text-xs">Péage</label><input type="number" inputMode="numeric" value={v.fraisPeage} onChange={e => onChange({ ...v, fraisPeage: e.target.value })} className="input-field" /></div>
            <div><label className="label !text-xs">Autres</label><input type="number" inputMode="numeric" value={v.autresFrais} onChange={e => onChange({ ...v, autresFrais: e.target.value })} className="input-field" /></div>
          </FormSection>
          <p className="text-right text-sm font-semibold">
            Résultat du voyage : <span className={resultat >= 0 ? 'text-accent-600' : 'text-red-600'}>{fmtMontant(resultat)}</span>
          </p>
        </>
      )}
    </FormSheet>
  );
}
