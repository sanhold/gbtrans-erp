'use client';

export interface LigneFactureForm {
  categorie: string;
  codePrestation: string;
  designation: string;
  quantite: string;
  unite: string;
  prixUnitaire: string;
  tauxTVA: string;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

const stepBtn = 'w-11 h-11 flex items-center justify-center rounded-lg border border-gray-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-gray-800 dark:text-gray-100 active:bg-gray-100 dark:active:bg-surface-700';
const lbl = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1';

interface Props {
  lignes: LigneFactureForm[];
  updateLigne: (index: number, field: keyof LigneFactureForm, value: string) => void;
  removeLigne: (index: number) => void;
}

/** Lignes de facture en cartes empilées (mobile < 768px) : désignation, qté (+/−), PU, TVA, montant HT. */
export default function LignesFactureMobile({ lignes, updateLigne, removeLigne }: Props) {
  const changeQte = (i: number, delta: number) => {
    const q = parseFloat(lignes[i].quantite) || 0;
    updateLigne(i, 'quantite', String(Math.max(1, q + delta)));
  };
  return (
    <ul className="space-y-3 p-3">
      {lignes.map((l, i) => {
        const montantHT = (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0);
        return (
          <li key={i} className="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3 space-y-3">
            <div className="flex items-start gap-2">
              <label className="flex-1 min-w-0">
                <span className={lbl}>Désignation</span>
                <input type="text" value={l.designation} onChange={e => updateLigne(i, 'designation', e.target.value)} className="input-field" />
              </label>
              <button type="button" onClick={() => removeLigne(i)} aria-label={`Supprimer la ligne ${l.designation || i + 1}`} className="w-11 h-11 mt-5 flex-shrink-0 flex items-center justify-center rounded-lg border border-red-200 text-red-600 active:bg-red-50">
                <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            <div>
              <span className={lbl}>Quantité</span>
              <div className="flex items-center gap-2">
                <button type="button" className={stepBtn} onClick={() => changeQte(i, -1)} aria-label="Diminuer la quantité">
                  <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M5 12h14" /></svg>
                </button>
                <input type="text" inputMode="decimal" aria-label="Quantité" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} className="input-field text-center w-20" />
                <button type="button" className={stepBtn} onClick={() => changeQte(i, 1)} aria-label="Augmenter la quantité">
                  <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
                <input type="text" aria-label="Unité" value={l.unite} onChange={e => updateLigne(i, 'unite', e.target.value)} className="input-field flex-1 min-w-0" placeholder="Unité" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={lbl}>Prix unitaire</span>
                <input type="text" inputMode="decimal" value={l.prixUnitaire} onChange={e => updateLigne(i, 'prixUnitaire', e.target.value)} className="input-field text-right font-mono" />
              </label>
              <label>
                <span className={lbl}>TVA %</span>
                <input type="text" inputMode="decimal" value={l.tauxTVA} onChange={e => updateLigne(i, 'tauxTVA', e.target.value)} className="input-field text-right font-mono" />
              </label>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-surface-700 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Montant HT</span>
              <span className="font-mono font-bold">{fmt(montantHT)} F</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
