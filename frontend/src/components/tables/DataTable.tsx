'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface Colonne<T> {
  cle: string;
  libelle: string;
  /** Contenu de la cellule. */
  rendu: (ligne: T) => ReactNode;
  /** Valeur texte pour l'export (par défaut : cellule vide). */
  texte?: (ligne: T) => string;
  align?: 'left' | 'right' | 'center';
  /** Police à chasse fixe (numéros, montants). */
  mono?: boolean;
  /** Masque la colonne en dessous de cette largeur d'écran. */
  masquerSous?: 'xl' | '2xl';
  /** Largeur fixe, ex. « 9rem ». */
  largeur?: string;
}

interface DataTableProps<T> {
  colonnes: Colonne<T>[];
  lignes: T[];
  cleLigne: (ligne: T) => string;
  onClicLigne?: (ligne: T) => void;
  idSelectionne?: string | null;
  chargement?: boolean;
  /** Contenu affiché si aucune ligne (EmptyState). */
  vide?: ReactNode;
  /** Colonne d'actions à droite (icônes). */
  actions?: (ligne: T) => ReactNode;
  /** Nom du fichier d'export (sans extension). Affiche le bouton « Exporter » si renseigné. */
  nomExport?: string;
  pied?: ReactNode;
}

// NB : l'utilitaire Tailwind « table-cell » est en collision avec la classe maison .table-cell : on passe par une propriété arbitraire.
const MASQUE = { xl: 'hidden xl:[display:table-cell]', '2xl': 'hidden 2xl:[display:table-cell]' } as const;

function exporterCsv<T>(colonnes: Colonne<T>[], lignes: T[], nom: string) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const cols = colonnes.filter((c) => c.texte);
  const csv = [cols.map((c) => esc(c.libelle)).join(';'), ...lignes.map((l) => cols.map((c) => esc(c.texte!(l) ?? '')).join(';'))].join('\r\n');
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Tableau de bureau soigné : en-tête collant, lignes aérées, survol, ligne sélectionnée, export. */
export default function DataTable<T>({ colonnes, lignes, cleLigne, onClicLigne, idSelectionne, chargement, vide, actions, nomExport, pied }: DataTableProps<T>) {
  const alignement = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const nbCols = colonnes.length + (actions ? 1 : 0);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-sm overflow-hidden">
      {nomExport && lignes.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-surface-700">
          <span className="text-xs text-gray-500">{lignes.length} ligne{lignes.length > 1 ? 's' : ''} affichée{lignes.length > 1 ? 's' : ''}</span>
          <button type="button" onClick={() => exporterCsv(colonnes, lignes, nomExport)} className="btn-ghost btn-sm">⬇ Exporter (Excel)</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-surface-900/40">
              {colonnes.map((c) => (
                <th key={c.cle} scope="col" style={c.largeur ? { width: c.largeur } : undefined}
                  className={clsx('px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-surface-700', alignement(c.align), c.masquerSous && MASQUE[c.masquerSous])}>
                  {c.libelle}
                </th>
              ))}
              {actions && <th scope="col" className="px-3 py-3 w-px border-b border-gray-200 dark:border-surface-700"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-surface-700">
            {chargement ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  {Array.from({ length: nbCols }).map((__, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-3.5 rounded bg-gray-100 dark:bg-surface-700 animate-pulse" style={{ width: `${55 + ((i + j) % 4) * 12}%` }} /></td>
                  ))}
                </tr>
              ))
            ) : lignes.length === 0 ? (
              <tr><td colSpan={nbCols}>{vide}</td></tr>
            ) : (
              lignes.map((l) => {
                const id = cleLigne(l);
                const actif = idSelectionne === id;
                return (
                  <tr key={id}
                    onClick={onClicLigne ? () => onClicLigne(l) : undefined}
                    onKeyDown={onClicLigne ? (e) => { if (e.key === 'Enter') onClicLigne(l); } : undefined}
                    tabIndex={onClicLigne ? 0 : undefined}
                    className={clsx('group transition-colors focus:outline-none focus-visible:bg-primary-50/70', onClicLigne && 'cursor-pointer',
                      actif ? 'bg-primary-50 dark:bg-primary-500/15 shadow-[inset_3px_0_0_theme(colors.primary.600)]' : 'hover:bg-primary-50/50 dark:hover:bg-white/[.04]')}>
                    {colonnes.map((c) => (
                      <td key={c.cle}
                        className={clsx('px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-200', alignement(c.align), c.mono && 'font-mono text-[13px]', c.masquerSous && MASQUE[c.masquerSous])}>
                        {c.rendu(l)}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-3 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">{actions(l)}</div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pied}
    </div>
  );
}
