'use client';

import { Fragment } from 'react';
import { fmt, grouperLignes } from './factureHelpers';

interface Props {
  lignes: any[];
  editable: boolean;
  onUpdateMontant: (ligneId: string, montant: number, designation: string, categorie: string, estTVA: boolean) => void;
  onDelete: (ligneId: string) => void;
  onOpenCatalogue: () => void;
}

const iconTrash = (
  <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

/** Onglet « Lignes » : cartes empilées sur mobile, tableau groupé par catégorie sur bureau. Modifiable en brouillon. */
export default function FactureLignes({ lignes, editable, onUpdateMontant, onDelete, onOpenCatalogue }: Props) {
  const groupes = grouperLignes(lignes);
  let n = 0;

  const montantInput = (l: any, className: string) => (
    <input
      type="text" inputMode="decimal" aria-label={`Prix unitaire de ${l.designation}`}
      defaultValue={Number(l.prixUnitaire)}
      onBlur={e => onUpdateMontant(l.id, parseFloat(e.target.value.replace(',', '.')) || 0, l.designation, l.categorie, l.estTVA)}
      className={className}
    />
  );

  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onOpenCatalogue} className="btn-primary max-md:w-full">+ Ajouter une prestation</button>
          <span className="text-xs text-gray-600 dark:text-gray-400">Facture en brouillon — vous pouvez ajouter ou supprimer des lignes</span>
        </div>
      )}

      {groupes.length === 0 ? (
        <div className="card text-center py-10 text-sm text-gray-600 dark:text-gray-400">
          <p>Cette facture ne contient aucune ligne.</p>
          {editable && <button type="button" onClick={onOpenCatalogue} className="btn-primary mt-3 max-md:w-full">Ouvrir le catalogue</button>}
        </div>
      ) : (
        <>
          {/* Mobile : cartes */}
          <div className="md:hidden space-y-3">
            {groupes.map(g => (
              <section key={g.categorie} aria-label={g.categorie} className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
                <h3 className="px-3 py-2 text-xs font-bold uppercase tracking-wide bg-gray-50 dark:bg-surface-700 text-gray-800 dark:text-gray-100">{g.categorie}</h3>
                <ul className="divide-y divide-gray-100 dark:divide-surface-700">
                  {g.lignes.map((l: any) => { n++; return (
                    <li key={l.id} className="p-3 flex items-start gap-3">
                      <span className="text-xs font-bold text-gray-500 w-5 pt-0.5 text-center flex-shrink-0">{n}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{l.designation}</p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span>Qté <span className="font-mono">{Number(l.quantite || 1)}</span></span>
                          {editable
                            ? <span className="flex items-center gap-1">PU {montantInput(l, 'input-field !w-28 text-right font-mono')}</span>
                            : <span>PU <span className="font-mono">{fmt(l.prixUnitaire)}</span></span>}
                        </div>
                        <p className="mt-1 text-right text-sm font-mono font-bold text-gray-900 dark:text-white">{fmt(l.prixUnitaire)} F</p>
                      </div>
                      {editable && (
                        <button type="button" onClick={() => onDelete(l.id)} aria-label={`Supprimer la ligne ${l.designation}`} className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg border border-red-200 text-red-600 active:bg-red-50">{iconTrash}</button>
                      )}
                    </li>
                  ); })}
                </ul>
                <p className="flex justify-between px-3 py-2 text-sm font-bold bg-gray-50 dark:bg-surface-700"><span>Sous-total</span><span className="font-mono">{fmt(g.sousTotal)} F</span></p>
              </section>
            ))}
          </div>

          {/* Bureau : tableau */}
          <div className="hidden md:block">
            <LignesTable groupes={groupes} editable={editable} onDelete={onDelete} montantInput={montantInput} />
          </div>
        </>
      )}
    </div>
  );
}

/** Tableau des lignes (mêmes colonnes que l'ancien aperçu de facture). */
export function LignesTable({ groupes, editable, onDelete, montantInput }: {
  groupes: ReturnType<typeof grouperLignes>;
  editable: boolean;
  onDelete?: (id: string) => void;
  montantInput?: (l: any, className: string) => React.ReactNode;
}) {
  let globalIndex = 0;
  return (
    <div className="border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-50 dark:bg-surface-700 text-[10px] text-gray-900 dark:text-white">
            <th className="px-2 py-2 text-center tracking-wide w-8">N°</th>
            <th className="px-2 py-2 text-left tracking-wide">DÉSIGNATION</th>
            <th className="px-2 py-2 text-center tracking-wide w-14">QTÉ</th>
            <th className="px-2 py-2 text-right tracking-wide w-28">PU (XOF)</th>
            <th className="px-2 py-2 text-right w-32 tracking-wide">MONTANT HT</th>
            {editable && <th className="px-2 py-2 w-12"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {groupes.map(group => (
            <Fragment key={group.categorie}>
              <tr className="bg-surface-50 dark:bg-surface-700/60 border-t border-surface-100 dark:border-surface-700">
                <td colSpan={editable ? 6 : 5} className="px-2 py-1.5 font-bold text-[10px] tracking-wide text-gray-900 dark:text-white">{group.categorie}</td>
              </tr>
              {group.lignes.map((l: any) => { globalIndex++; return (
                <tr key={l.id} className="border-t border-surface-100 dark:border-surface-700">
                  <td className="px-2 py-1.5 text-[10px] text-center text-gray-500 dark:text-gray-400">{globalIndex}</td>
                  <td className="px-2 py-1.5 text-[11px] text-gray-700 dark:text-gray-300">{l.designation}</td>
                  <td className="px-2 py-1.5 text-center font-mono text-[11px] text-gray-500 dark:text-gray-400">{Number(l.quantite || 1)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-gray-900 dark:text-white">
                    {editable && montantInput ? montantInput(l, 'w-20 bg-transparent border-0 outline-none text-right font-mono font-semibold text-[11px]') : fmt(l.prixUnitaire)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-gray-900 dark:text-white">{fmt(l.prixUnitaire)}</td>
                  {editable && (
                    <td className="px-1 py-0.5 text-center">
                      <button type="button" onClick={() => onDelete?.(l.id)} aria-label={`Supprimer la ligne ${l.designation}`} title="Supprimer" className="w-9 h-9 inline-flex items-center justify-center rounded text-red-500 hover:text-red-700 hover:bg-red-50">
                        <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  )}
                </tr>
              ); })}
              <tr className="border-t border-surface-100 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-700/40">
                <td colSpan={editable ? 5 : 4} className="px-2 py-1.5 text-right text-[9.5px] font-extrabold text-gray-900 dark:text-white">SOUS-TOTAL {group.categorie}</td>
                <td className="px-2 py-1.5 text-right font-mono font-extrabold text-[11px] text-gray-900 dark:text-white">{fmt(group.sousTotal)}</td>
                {editable && <td></td>}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
