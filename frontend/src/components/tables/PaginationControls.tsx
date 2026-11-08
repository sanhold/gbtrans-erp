'use client';

import TablePagination from './TablePagination';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** Pied de tableau générique : plage affichée, pages, lignes par page. Même rendu que les tableaux Dossiers / Factures. */
export default function PaginationControls(props: PaginationControlsProps) {
  return <TablePagination {...props} />;
}
