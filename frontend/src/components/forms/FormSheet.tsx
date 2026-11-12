'use client';

import Sheet, { type SheetProps } from '@/components/ui/Sheet';

interface FormSheetProps extends Omit<SheetProps, 'children'> {
  onSubmit: (e: React.FormEvent) => void;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  /** Bouton de validation désactivé (ex. formulaire incomplet). */
  submitDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Formulaire dans une Sheet (bottom sheet mobile / modale bureau) avec barre d'actions collante
 * en bas du panneau (safe-area gérée par la Sheet).
 */
export default function FormSheet({
  onSubmit, saving = false, submitLabel = 'Enregistrer', cancelLabel = 'Annuler', submitDisabled = false,
  children, onClose, ...sheet
}: FormSheetProps) {
  return (
    <Sheet onClose={onClose} {...sheet}>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700">
          <button type="button" onClick={onClose} className="btn-secondary min-h-[44px]">{cancelLabel}</button>
          <button type="submit" disabled={saving || submitDisabled} className="btn-primary min-h-[44px] disabled:opacity-50">
            {saving ? 'Enregistrement...' : submitLabel}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/** Section de formulaire (titre discret + grille 1 colonne mobile / 2 colonnes dès sm). */
export function FormSection({ title, children, cols = 2 }: { title?: string; children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const grid = cols === 1 ? '' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <fieldset className="space-y-3">
      {title && <legend className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{title}</legend>}
      <div className={`grid grid-cols-1 ${grid} gap-3`}>{children}</div>
    </fieldset>
  );
}
