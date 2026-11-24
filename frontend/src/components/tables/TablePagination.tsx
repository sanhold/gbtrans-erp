'use client';

import { PAGE_SIZE_OPTIONS } from '@/lib/usePagination';
import { clsx } from 'clsx';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** Pied de tableau de bureau : plage affichée à gauche, pages au centre, taille de page à droite. */
export default function TablePagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from({ length: totalPages }, (_, k) => k + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);

  const bouton = 'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';
  const inactif = 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white';

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-between border-t border-gray-100 bg-white px-4 py-3 text-[13px] text-gray-600 dark:border-surface-700 dark:bg-surface-800 dark:text-gray-300">
      <label className="flex items-center gap-2">
        <span>Afficher</span>
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} aria-label="Éléments par page"
          className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm font-medium text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-white">
          {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>éléments par page</span>
      </label>
      <span>
        Affichage de <span className="font-semibold text-gray-900 dark:text-white">{from}</span> à <span className="font-semibold text-gray-900 dark:text-white">{to}</span> sur <span className="font-semibold text-gray-900 dark:text-white">{total}</span> éléments
      </span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="Première page" className={clsx(bouton, inactif)}>«</button>
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Page précédente" className={clsx(bouton, inactif)}>‹</button>
        {pages.map((n, idx) => (
          <span key={n} className="flex items-center gap-1">
            {idx > 0 && n - pages[idx - 1] > 1 && <span className="px-1 text-gray-400">…</span>}
            <button type="button" onClick={() => onPageChange(n)} aria-current={n === page ? 'page' : undefined}
              className={clsx(bouton, n === page ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : inactif)}>{n}</button>
          </span>
        ))}
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Page suivante" className={clsx(bouton, inactif)}>›</button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} aria-label="Dernière page" className={clsx(bouton, inactif)}>»</button>
      </nav>
    </div>
  );
}
