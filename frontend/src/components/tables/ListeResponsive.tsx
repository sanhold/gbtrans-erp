'use client';

import { ReactNode } from 'react';
import DataTable, { type Colonne } from './DataTable';
import TablePagination from './TablePagination';
import PaginationControls from './PaginationControls';

export interface Carte {
  titre: ReactNode;
  sousTitre?: ReactNode;
  /** Pastille de statut, en haut à droite. */
  statut?: ReactNode;
  /** Valeur mise en avant à droite (montant, nombre…). */
  droite?: ReactNode;
  /** Ligne complémentaire discrète sous le sous-titre. */
  details?: ReactNode;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
}

interface Props<T> {
  colonnes: Colonne<T>[];
  lignes: T[];
  cleLigne: (l: T) => string;
  chargement?: boolean;
  /** Contenu d'une carte sur téléphone / tablette. */
  carte: (l: T) => Carte;
  /** Boutons d'action d'une ligne (icônes toujours visibles). */
  actions?: (l: T) => ReactNode;
  onClic?: (l: T) => void;
  pagination?: Pagination;
  vide: ReactNode;
  nomExport?: string;
}

/**
 * Liste adaptative commune : tableau de bureau soigné à partir de 1024 px, cartes compactes en dessous.
 * Une seule description des colonnes et des cartes par page, le reste (squelettes, pagination, export) est partagé.
 */
export default function ListeResponsive<T>({ colonnes, lignes, cleLigne, chargement, carte, actions, onClic, pagination, vide, nomExport }: Props<T>) {
  return (
    <>
      <div className="hidden lg:block">
        <DataTable
          colonnes={colonnes}
          lignes={lignes}
          cleLigne={cleLigne}
          onClicLigne={onClic}
          chargement={chargement}
          nomExport={nomExport}
          actionsToujoursVisibles
          actions={actions}
          pied={pagination ? <TablePagination {...pagination} /> : undefined}
          vide={vide}
        />
      </div>

      <div className="lg:hidden space-y-2.5">
        {chargement ? (
          [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-20" />)
        ) : lignes.length === 0 ? (
          <div className="card">{vide}</div>
        ) : lignes.map(l => {
          const c = carte(l);
          const contenu = (
            <>
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[14px] text-gray-900 dark:text-white">{c.titre}</span>
                  {c.sousTitre && <span className="block truncate text-xs text-gray-500">{c.sousTitre}</span>}
                </span>
                {c.statut}
                {c.droite && <span className="flex-shrink-0 text-right font-mono font-bold tabular-nums text-[14px] text-gray-900 dark:text-white">{c.droite}</span>}
              </span>
              {c.details && <span className="block text-[11.5px] text-gray-400">{c.details}</span>}
            </>
          );
          return (
            <div key={cleLigne(l)} className="card !p-0 overflow-hidden">
              {onClic ? (
                <button type="button" onClick={() => onClic(l)} className="w-full text-left px-4 py-3 space-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{contenu}</button>
              ) : (
                <div className="px-4 py-3 space-y-1">{contenu}</div>
              )}
              {actions && <div className="flex items-center justify-end gap-2 px-4 pb-3">{actions(l)}</div>}
            </div>
          );
        })}
        {pagination && <div className="card !p-0 overflow-hidden"><PaginationControls {...pagination} /></div>}
      </div>
    </>
  );
}
