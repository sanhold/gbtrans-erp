'use client';

import Sheet from '@/components/ui/Sheet';

export interface ArticleFormValues {
  designation: string; type: string; marque: string; modele: string; quantite: string; unite: string;
  positionTarifaire: string; poids: string; valeur: string; origine: string; bonLivraison: string; observations: string;
}

export const EMPTY_ARTICLE_FORM: ArticleFormValues = {
  designation: '', type: '', marque: '', modele: '', quantite: '1', unite: '',
  positionTarifaire: '', poids: '', valeur: '', origine: '', bonLivraison: '', observations: '',
};

const legendCls = 'text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2';

interface Props {
  open: boolean;
  editing: boolean;
  form: ArticleFormValues;
  onChange: (f: ArticleFormValues) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Formulaire article (création / édition), partagé entre « Nouveau dossier » et la fiche dossier. */
export default function ArticleFormSheet({ open, editing, form, onChange, onClose, onSubmit }: Props) {
  const set = (k: keyof ArticleFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...form, [k]: e.target.value });
  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Modifier l'article" : 'Nouvel article'} size="2xl" fullScreen>
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset>
          <legend className={legendCls}>Identification</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="label">Désignation *</label><input type="text" value={form.designation} onChange={set('designation')} className="input-field" required /></div>
            <div><label className="label">Type</label><input type="text" value={form.type} onChange={set('type')} className="input-field" placeholder="Électronique, BTP..." /></div>
            <div><label className="label">Marque</label><input type="text" value={form.marque} onChange={set('marque')} className="input-field" /></div>
            <div><label className="label">Modèle</label><input type="text" value={form.modele} onChange={set('modele')} className="input-field" /></div>
            <div><label className="label">Origine</label><input type="text" value={form.origine} onChange={set('origine')} className="input-field" placeholder="Chine, France..." /></div>
          </div>
        </fieldset>
        <fieldset>
          <legend className={legendCls}>Quantité et valeur</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Quantité</label><input type="number" inputMode="decimal" step="0.001" value={form.quantite} onChange={set('quantite')} className="input-field" /></div>
            <div><label className="label">Unité</label><input type="text" value={form.unite} onChange={set('unite')} className="input-field" placeholder="Pcs, Kg, m³..." /></div>
            <div><label className="label">Poids (kg)</label><input type="number" inputMode="decimal" step="0.001" value={form.poids} onChange={set('poids')} className="input-field" /></div>
            <div><label className="label">Valeur (FCFA)</label><input type="number" inputMode="decimal" value={form.valeur} onChange={set('valeur')} className="input-field" /></div>
          </div>
        </fieldset>
        <fieldset>
          <legend className={legendCls}>Douane et livraison</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Position tarifaire</label><input type="text" inputMode="numeric" value={form.positionTarifaire} onChange={set('positionTarifaire')} className="input-field" placeholder="8471.30.00" /></div>
            <div><label className="label">N° bon de livraison</label><input type="text" value={form.bonLivraison} onChange={set('bonLivraison')} className="input-field" /></div>
            <div className="sm:col-span-2"><label className="label">Observations</label><textarea value={form.observations} onChange={set('observations')} className="input-field" rows={2} /></div>
          </div>
        </fieldset>
        <div className="sticky bottom-0 -mx-4 -mb-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">Annuler</button>
          <button type="submit" className="btn-primary w-full sm:w-auto">{editing ? 'Modifier' : 'Ajouter'}</button>
        </div>
      </form>
    </Sheet>
  );
}
