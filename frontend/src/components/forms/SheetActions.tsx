'use client';

import { clsx } from 'clsx';

interface SheetActionsProps {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Si fourni, le bouton principal est de type "button" et déclenche cette action (hors <form>). */
  onSubmit?: () => void;
  danger?: boolean;
  /** Style du bouton principal (par défaut primary ; danger équivaut à variant="danger"). */
  variant?: 'primary' | 'danger' | 'success';
  className?: string;
}

/** Barre d'actions collante en bas d'un formulaire dans <Sheet> : pleine largeur sur mobile, safe-area incluse. */
export default function SheetActions({
  onCancel, submitLabel = 'Enregistrer', cancelLabel = 'Annuler', loading, disabled, onSubmit, danger, variant, className,
}: SheetActionsProps) {
  return (
    <div
      className={clsx(
        'sticky bottom-0 -mx-4 -mb-4 mt-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700',
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2',
        className,
      )}
    >
      <button type="button" onClick={onCancel} className="btn-secondary min-h-[44px] w-full sm:w-auto">{cancelLabel}</button>
      <button
        type={onSubmit ? 'button' : 'submit'}
        onClick={onSubmit}
        disabled={disabled || loading}
        className={clsx(`btn-${danger ? 'danger' : variant || 'primary'}`, 'min-h-[44px] w-full sm:w-auto disabled:opacity-60')}
      >
        {loading ? 'Veuillez patienter...' : submitLabel}
      </button>
    </div>
  );
}
