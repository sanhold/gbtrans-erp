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

  const pages = Array.from({ length: totalPages }, (_, k) => k + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2);
  const box = 'px-2.5 py-1 border border-gray-300 -ml-px bg-white text-primary-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white dark:bg-surface-800 dark:border-surface-700';

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-surface-700 text-[11.5px] text-gray-500 dark:text-gray-400">
      <span>De {from} à {to} sur {total}</span>
      <div className="flex items-center">
        <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1} className={box}>«</button>
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className={box}>‹</button>
        {pages.map((n, idx) => (
          <span key={n} className="flex">
            {idx > 0 && n - pages[idx - 1] > 1 && <span className={box + ' text-gray-400'}>…</span>}
            <button type="button" onClick={() => onPageChange(n)} className={n === page ? 'px-2.5 py-1 border border-primary-600 -ml-px bg-primary-600 text-white' : box}>{n}</button>
          </span>
        ))}
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className={box}>›</button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className={box}>»</button>
      </div>
      <div className="flex items-center gap-2">
        <span>Voir</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="input-field !w-auto !py-0.5 !text-xs"
        >
          {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>lignes par page</span>
      </div>
    </div>
  );
}
