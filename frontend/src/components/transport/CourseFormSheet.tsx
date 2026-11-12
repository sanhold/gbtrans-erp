'use client';

import FormSheet, { FormSection } from '@/components/forms/FormSheet';

export const COURSE_FORM_VIDE = {
  vehiculeId: '', chauffeurId: '', clientId: '', montantFacturable: '', origine: '', destination: '', designationMarchandise: '',
  poidsChargeKg: '', distanceKm: '', dateDepartPrevue: '', dateArriveePrevue: '', observations: '',
};

export default function CourseFormSheet({ open, onClose, form, setForm, onSubmit, saving, vehicules, chauffeurs, clients }: {
  open: boolean; onClose: () => void; form: any; setForm: (f: any) => void; onSubmit: (e: React.FormEvent) => void; saving: boolean;
  vehicules: any[]; chauffeurs: any[]; clients: any[];
}) {
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value });
  return (
    <FormSheet open={open} onClose={onClose} size="lg" title="Nouvelle course" onSubmit={onSubmit} saving={saving} submitLabel="Créer">
      <FormSection title="Affectation">
        <div>
          <label className="label">Véhicule *</label>
          <select value={form.vehiculeId} onChange={set('vehiculeId')} className="input-field" required>
            <option value="">Sélectionner...</option>
            {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque ? `(${v.marque})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Chauffeur *</label>
          <select value={form.chauffeurId} onChange={set('chauffeurId')} className="input-field" required>
            <option value="">Sélectionner...</option>
            {chauffeurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
          </select>
        </div>
      </FormSection>
      <FormSection title="Trajet">
        <div><label className="label">Origine *</label><input type="text" value={form.origine} onChange={set('origine')} className="input-field" required /></div>
        <div><label className="label">Destination *</label><input type="text" value={form.destination} onChange={set('destination')} className="input-field" required /></div>
        <div><label className="label">Départ prévu</label><input type="datetime-local" value={form.dateDepartPrevue} onChange={set('dateDepartPrevue')} className="input-field" /></div>
        <div><label className="label">Arrivée prévue</label><input type="datetime-local" value={form.dateArriveePrevue} onChange={set('dateArriveePrevue')} className="input-field" /></div>
        <div><label className="label">Distance (km)</label><input type="number" inputMode="decimal" value={form.distanceKm} onChange={set('distanceKm')} className="input-field" /></div>
      </FormSection>
      <FormSection title="Marchandise">
        <div><label className="label">Marchandise</label><input type="text" value={form.designationMarchandise} onChange={set('designationMarchandise')} className="input-field" /></div>
        <div><label className="label">Poids (kg)</label><input type="number" inputMode="decimal" value={form.poidsChargeKg} onChange={set('poidsChargeKg')} className="input-field" /></div>
      </FormSection>
      <FormSection title="Facturation">
        <div>
          <label className="label">Client à facturer</label>
          <select value={form.clientId} onChange={set('clientId')} className="input-field">
            <option value="">— Aucun pour l&apos;instant —</option>
            {clients.map((cl: any) => <option key={cl.id} value={cl.id}>{cl.raisonSociale}</option>)}
          </select>
        </div>
        <div><label className="label">Montant facturable (FCFA)</label><input type="number" inputMode="numeric" value={form.montantFacturable} onChange={set('montantFacturable')} className="input-field" /></div>
      </FormSection>
      <div><label className="label">Observations</label><textarea value={form.observations} onChange={set('observations')} className="input-field" rows={2} /></div>
    </FormSheet>
  );
}
