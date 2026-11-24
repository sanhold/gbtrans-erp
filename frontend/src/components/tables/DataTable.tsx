'use client';

import { ReactNode, useCallback, useSyncExternalStore } from 'react';
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
  /** Cellule vide pour cette ligne ? Si elle l'est pour toutes les lignes affichées, la colonne est masquée (données non renseignées). */
  videSi?: (ligne: T) => boolean;
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
  /** Garde les actions visibles en permanence (par défaut : au survol), utile sur écran tactile. */
  actionsToujoursVisibles?: boolean;
  /** Tableau dense : cellules plus serrées pour afficher beaucoup de colonnes (journaux). */
  dense?: boolean;
  /** Ligne de totaux sous le tableau (un <tr> avec ses <td>), ex. « Somme ». */
  lignePied?: ReactNode;
}

// Densité des tableaux : « compact » (40 px) par défaut, « confortable » (48 px), mémorisée par utilisateur.
const CLE_DENSITE = 'gbtrans.tableaux.densite';
const EVT_DENSITE = 'gbtrans:densite';
const lireDensite = () => { try { return window.localStorage.getItem(CLE_DENSITE) === 'confortable' ? 'confortable' : 'compact'; } catch { return 'compact'; } };
const abonnerDensite = (cb: () => void) => { window.addEventListener('storage', cb); window.addEventListener(EVT_DENSITE, cb); return () => { window.removeEventListener('storage', cb); window.removeEventListener(EVT_DENSITE, cb); }; };
function useDensite() {
  const densite = useSyncExternalStore(abonnerDensite, lireDensite, () => 'compact');
  const changer = useCallback((d: 'compact' | 'confortable') => {
    try { window.localStorage.setItem(CLE_DENSITE, d); } catch { /* non bloquant */ }
    window.dispatchEvent(new Event(EVT_DENSITE));
  }, []);
  return { densite, changer };
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
export default function DataTable<T>({ colonnes, lignes, cleLigne, onClicLigne, idSelectionne, chargement, vide, actions, nomExport, pied, actionsToujoursVisibles = true, dense, lignePied }: DataTableProps<T>) {
  const alignement = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const cols = lignes.length > 0 ? colonnes.filter((c) => !(c.videSi && lignes.every(c.videSi))) : colonnes;
  const nbCols = cols.length + (actions ? 1 : 0);
  const { densite, changer } = useDensite();

  return (
    <div className="dt-une-ligne overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] dark:border-surface-700 dark:bg-surface-800">
      {nomExport && lignes.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-gray-500">{lignes.length} ligne{lignes.length > 1 ? 's' : ''} sur cette page</span>
          <div className="flex items-center gap-2">
          <div role="group" aria-label="Densité du tableau" className="hidden lg:inline-flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-surface-600 dark:bg-surface-800">
            {(['compact', 'confortable'] as const).map((d) => (
              <button key={d} type="button" aria-pressed={densite === d} onClick={() => changer(d)}
                className={clsx('rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-azure', densite === d ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/10')}>
                {d === 'compact' ? 'Compact' : 'Confortable'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => exporterCsv(cols, lignes, nomExport)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200 dark:hover:bg-surface-700">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exporter
          </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-600 dark:bg-primary-800">
              {cols.map((c) => (
                <th key={c.cle} scope="col" style={c.largeur ? { width: c.largeur } : undefined}
                  className={clsx(dense ? 'px-2.5 py-3' : 'px-4 py-3', 'text-[12.5px] font-bold tracking-[0.01em] text-white whitespace-nowrap first:pl-5', alignement(c.align), c.masquerSous && MASQUE[c.masquerSous])}>
                  {c.libelle}
                </th>
              ))}
              {actions && <th scope="col" className="px-4 py-3 text-center text-[12.5px] font-bold text-white whitespace-nowrap">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-surface-700/70">
            {chargement ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  {Array.from({ length: nbCols }).map((__, j) => (
                    <td key={j} className="px-4 py-4 first:pl-5"><div className="h-3.5 rounded bg-gray-100 dark:bg-surface-700 animate-pulse" style={{ width: `${55 + ((i + j) % 4) * 12}%` }} /></td>
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
                  <tr key={id} style={{ height: densite === 'compact' ? 40 : 48 }}
                    onClick={onClicLigne ? () => onClicLigne(l) : undefined}
                    onKeyDown={onClicLigne ? (e) => { if (e.key === 'Enter') onClicLigne(l); } : undefined}
                    tabIndex={onClicLigne ? 0 : undefined}
                    className={clsx('group transition-colors focus:outline-none focus-visible:bg-primary-50/70', onClicLigne && 'cursor-pointer',
                      actif ? 'bg-primary-50/80 dark:bg-primary-500/15 shadow-[inset_3px_0_0_theme(colors.primary.600)]' : 'hover:bg-primary-50/40 dark:hover:bg-white/[.04]')}>
                    {cols.map((c) => (
                      <td key={c.cle}
                        className={clsx(dense ? 'px-2.5' : 'px-4', 'whitespace-nowrap align-middle text-[13px] text-gray-700 dark:text-gray-200 first:pl-5', alignement(c.align), c.mono && 'font-mono text-[13px]', c.masquerSous && MASQUE[c.masquerSous])}>
                        {c.rendu(l)}
                      </td>
                    ))}
                    {actions && (
                      <td className="whitespace-nowrap px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className={clsx('flex items-center justify-center gap-1.5', !actionsToujoursVisibles && 'gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100')}>{actions(l)}</div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          {lignePied && !chargement && lignes.length > 0 && <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold dark:border-surface-700 dark:bg-surface-900/50">{lignePied}</tfoot>}
        </table>
      </div>
      {pied}
    </div>
  );
}
