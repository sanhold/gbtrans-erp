'use client';

import { PAGE_SIZE_OPTIONS } from '@/lib/usePagination';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** Pied de tableau générique : sélecteur "lignes par page" + navigation. À utiliser dans un `.table-container`, sous la `<table>`. */
export default function PaginationControls({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-2.5 border-t border-gray-200 dark:border-surface-700 text-xs text-gray-500 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <span>Lignes par page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="input-field !w-auto !py-1 !text-xs"
        >
          {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>{from}–{to} sur {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn-secondary !px-2.5 !py-1 !text-xs disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="px-2">Page {page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn-secondary !px-2.5 !py-1 !text-xs disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
