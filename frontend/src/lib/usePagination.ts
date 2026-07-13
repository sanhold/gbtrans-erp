'use client';

import { useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

/** Pagination 100% côté client : découpe un tableau déjà chargé en mémoire. */
export function usePagination<T>(items: T[], defaultPageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize]
  );

  const setPageSize = (n: number) => { setPageSizeState(n); setPage(1); };

  return { paged, page: currentPage, setPage, pageSize, setPageSize, total, totalPages };
}
