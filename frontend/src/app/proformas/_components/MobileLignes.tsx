'use client';

import { fmt, fmtSaisie, nettoyerNombre, type LigneProforma } from './proformaUtils';
import type { GroupeLignes, LignesActions } from './ProformaSheet';
import { IconDown, IconTrash, IconUp } from './icons';

const iconBtn = 'w-11 h-11 flex items-center justify-center rounded-lg border border-gray-300 dark:border-surface-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-surface-800 active:bg-gray-100 dark:active:bg-surface-700 disabled:opacity-40';

interface Props {
  lignes: LigneProforma[];
  groupes: GroupeLignes[];
  actions: LignesActions;
  onOpenCatalogue: () => void;
}

/** Lignes de la proforma en cartes empilées (mobile < 768px) : désignation, montant, déplacer / supprimer (cibles 44px). */
export default function MobileLignes({ lignes, groupes, actions, onOpenCatalogue }: Props) {
  if (lignes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-surface-600 p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Aucune prestation. Ajoutez-en depuis le catalogue pour composer la proforma.</p>
        <button type="button" onClick={onOpenCatalogue} className="btn-primary w-full sm:w-auto">+ Ajouter des prestations</button>
      </div>
    );
  }

  let n = 0;
  return (
    <div className="space-y-4">
      {groupes.map(g => (
        <section key={g.categorie} aria-label={g.categorie} className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
          <header className="flex items-center justify-between gap-2 pl-3 pr-1 py-1 bg-gray-50 dark:bg-surface-700" style={{ borderLeft: `4px solid ${g.couleur}` }}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100 min-w-0 truncate">{g.categorie}</h3>
            <div className="flex gap-1 flex-shrink-0">
              <button type="button" className={iconBtn} aria-label={`Monter le groupe ${g.categorie}`} onClick={() => actions.moveGroupe(g.categorie, -1)}><IconUp className="w-5 h-5" /></button>
              <button type="button" className={iconBtn} aria-label={`Descendre le groupe ${g.categorie}`} onClick={() => actions.moveGroupe(g.categorie, 1)}><IconDown className="w-5 h-5" /></button>
            </div>
          </header>
          <ul className="divide-y divide-gray-100 dark:divide-surface-700">
            {g.lignes.map(l => {
              n++;
              const idx = lignes.indexOf(l);
              return (
                <li key={idx} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-3 text-xs font-bold text-gray-500 w-5 text-center flex-shrink-0">{n}</span>
                    <label className="flex-1 min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Désignation</span>
                      <input value={l.designation} onChange={e => actions.updateLigne(idx, 'designation', e.target.value)} className="input-field" />
                    </label>
                  </div>
                  <div className="flex items-end gap-2 pl-7">
                    <label className="flex-1 min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Montant (FCFA){l.estTVA ? ' · TVA' : ''}</span>
                      <input type="text" inputMode="decimal" value={fmtSaisie(l.montant || '')} onChange={e => actions.updateLigne(idx, 'montant', parseFloat(nettoyerNombre(e.target.value)) || 0)} className="input-field text-right font-mono font-bold" placeholder="0" />
                    </label>
                    <button type="button" className={iconBtn} aria-label="Monter la ligne" onClick={() => actions.moveLigne(idx, -1)}><IconUp className="w-5 h-5" /></button>
                    <button type="button" className={iconBtn} aria-label="Descendre la ligne" onClick={() => actions.moveLigne(idx, 1)}><IconDown className="w-5 h-5" /></button>
                    <button type="button" className={`${iconBtn} !text-red-600 !border-red-200`} aria-label={`Supprimer la ligne ${l.designation}`} onClick={() => actions.removeLigne(idx)}><IconTrash className="w-5 h-5" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          <footer className="flex justify-between px-3 py-2 text-sm font-bold bg-gray-50 dark:bg-surface-700">
            <span>Sous-total</span><span className="font-mono">{fmt(g.sousTotal)} F</span>
          </footer>
        </section>
      ))}
      <button type="button" onClick={onOpenCatalogue} className="btn-secondary w-full">+ Ajouter des prestations</button>
    </div>
  );
}
