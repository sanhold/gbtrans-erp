'use client';

export const fmt = (n: any) => {
  if (n === null || n === undefined || n === '') return '-';
  const num = Number(n);
  return isNaN(num) ? String(n) : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num);
};

export const textFields = [
  'numeroPhysique',
  'compagnieMaritime', 'navire', 'voyage', 'numeroBL', 'portOrigine', 'portDestination',
  'designation', 'emballage', 'incoterm', 'devise', 'regimeDouanier', 'bureauDouane',
  'observations', 'numeroDeclaration', 'lieuLivraison', 'bonLivraison',
];

export const numFields = [
  'poidsBrut', 'poidsNet', 'volume', 'valeurFOB', 'fret', 'assurance', 'valeurCAF',
  'droitDouane', 'tva', 'autresTaxes', 'totalDroits', 'nombreColis',
];

export const ICON_BTN = 'inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded hover:bg-gray-100 dark:hover:bg-surface-700';

/** Contexte d'édition transmis aux champs de la fiche. */
export interface FieldContext {
  editing: boolean;
  dossier: any;
  editForm: Record<string, string>;
  updateField: (field: string, value: string) => void;
}

/** Champ lisible / éditable (défini hors du composant parent pour ne pas perdre le focus à chaque frappe). */
export function EditableField({ label, field, type = 'text', ctx }: { label: string; field: string; type?: string; ctx: FieldContext }) {
  const isNum = numFields.includes(field);
  return (
    <div className="min-w-0">
      <label htmlFor={ctx.editing ? `f-${field}` : undefined} className="block text-gray-600 dark:text-gray-400 text-xs mb-1">{label}</label>
      {ctx.editing ? (
        <input
          id={`f-${field}`}
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={ctx.editForm[field] || ''}
          onChange={e => ctx.updateField(field, e.target.value)}
          className="input-field text-sm"
        />
      ) : (
        <p className="font-medium break-words">{isNum ? fmt(ctx.dossier[field]) : (ctx.dossier[field] || '-')}</p>
      )}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold mb-4">{children}</h3>;
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-gray-600">
      <p className="text-sm mb-3">{message}</p>
      {action}
    </div>
  );
}
