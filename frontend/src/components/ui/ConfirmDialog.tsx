'use client';

import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  titre: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Action destructrice (suppression, annulation...) : bouton rouge. */
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation standard avant une action irréversible, à utiliser à la place de window.confirm. */
export default function ConfirmDialog({
  open, titre, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false, loading = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={titre}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'En cours…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
    </Modal>
  );
}
