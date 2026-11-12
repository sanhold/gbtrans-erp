'use client';

import PickerField from '@/components/ui/PickerField';
import { fmt } from './comptaShared';

interface Props {
  lignes: any[];
  comptes: any[];
  totalDebit: number;
  totalCredit: number;
  equilibre: boolean;
  onUpdate: (i: number, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}

const COLS = 'md:grid-cols-[1fr_1fr_110px_110px_44px]';
const CELL = 'text-sm md:text-xs bg-transparent border border-gray-300 dark:border-surface-700 md:border-0 rounded-lg md:rounded-none px-2 py-2 md:py-1.5 outline-none min-h-[44px] md:min-h-0';

/** Saisie des lignes d'une écriture : grille dense sur bureau, une carte par ligne sur mobile. */
export default function EcritureLignesEditor({ lignes, comptes, totalDebit, totalCredit, equilibre, onUpdate, onAdd, onRemove }: Props) {
  const options = comptes.map((c: any) => ({ id: c.id, label: `${c.numero} ${c.libelle}` }));
  return (
    <div className="border border-gray-200 dark:border-surface-700 rounded-lg overflow-hidden">
      <div className={`hidden md:grid ${COLS} bg-gray-100 dark:bg-surface-700 text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300`}>
        <div className="px-2 py-2">Compte</div><div className="px-2 py-2">Libellé</div>
        <div className="px-2 py-2 text-right">Débit</div><div className="px-2 py-2 text-right">Crédit</div><div />
      </div>
      {lignes.map((l: any, i: number) => (
        <div key={i} className={`grid grid-cols-2 gap-2 p-3 md:p-0 md:gap-0 ${COLS} border-t border-gray-100 dark:border-surface-700 first:border-t-0 md:first:border-t`}>
          <div className="col-span-2 md:col-span-1">
            <span className="md:hidden label">Compte</span>
            <PickerField
              value={l.compteId}
              onChange={id => onUpdate(i, 'compteId', id)}
              options={options}
              placeholder="— Compte —"
              title="Sélectionner un compte"
              searchPlaceholder="N° ou libellé du compte..."
              className="md:!bg-transparent md:!border-0 md:!shadow-none md:!px-2 md:!py-1.5 md:!text-xs md:!rounded-none"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="md:hidden label" htmlFor={`lig-lib-${i}`}>Libellé</label>
            <input id={`lig-lib-${i}`} type="text" value={l.libelle} onChange={e => onUpdate(i, 'libelle', e.target.value)} className={`${CELL} w-full`} placeholder="Libellé de la ligne" aria-label={`Libellé de la ligne ${i + 1}`} />
          </div>
          <div>
            <label className="md:hidden label" htmlFor={`lig-deb-${i}`}>Débit</label>
            <input id={`lig-deb-${i}`} type="number" inputMode="decimal" value={l.debit} onChange={e => onUpdate(i, 'debit', e.target.value)} className={`${CELL} w-full text-right font-mono`} placeholder="0" aria-label={`Débit de la ligne ${i + 1}`} />
          </div>
          <div>
            <label className="md:hidden label" htmlFor={`lig-cre-${i}`}>Crédit</label>
            <input id={`lig-cre-${i}`} type="number" inputMode="decimal" value={l.credit} onChange={e => onUpdate(i, 'credit', e.target.value)} className={`${CELL} w-full text-right font-mono`} placeholder="0" aria-label={`Crédit de la ligne ${i + 1}`} />
          </div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Supprimer la ligne ${i + 1}`}
            className="col-span-2 md:col-span-1 min-h-[44px] md:min-h-0 inline-flex items-center justify-center gap-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            <span className="md:hidden">Supprimer la ligne</span>
          </button>
        </div>
      ))}
      <div className="p-2 border-t border-gray-100 dark:border-surface-700">
        <button type="button" onClick={onAdd} className="min-h-[44px] md:min-h-0 px-2 text-sm md:text-xs text-primary-600 hover:underline">Ajouter une ligne</button>
      </div>
      <div className={`grid grid-cols-2 ${COLS} border-t-2 font-bold text-xs ${equilibre ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-red-300 bg-red-50 dark:bg-red-900/10'}`}>
        <div className="px-2 py-2 col-span-2 md:col-span-2" role="status">{equilibre ? 'Écriture équilibrée' : 'Écriture non équilibrée'}</div>
        <div className="px-2 py-2 md:text-right font-mono">Débit : {fmt(totalDebit)}</div>
        <div className="px-2 py-2 text-right font-mono">Crédit : {fmt(totalCredit)}</div>
        <div className="hidden md:block" />
      </div>
    </div>
  );
}
