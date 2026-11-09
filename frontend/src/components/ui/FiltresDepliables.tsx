'use client';

import { ReactNode, useEffect, useState } from 'react';

interface Props {
  /** Nombre de filtres actifs, affiché en pastille sur le bouton. */
  actifs?: number;
  /** Ouvert au départ. Par défaut : ouvert sur ordinateur, replié sur téléphone pour garder la liste visible. */
  ouvertParDefaut?: boolean;
  children: ReactNode;
}

/** Bloc de filtres repliable : une seule ligne fine tant qu'il est fermé, le formulaire complet une fois ouvert. */
export default function FiltresDepliables({ actifs = 0, ouvertParDefaut = false, children }: Props) {
  const [ouvert, setOuvert] = useState(!!ouvertParDefaut);
  useEffect(() => {
    if (ouvertParDefaut === undefined && window.matchMedia('(min-width: 1024px)').matches) setOuvert(true);
  }, [ouvertParDefaut]);
  return (
    <div className="card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-expanded={ouvert}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" /></svg>
          Filtres
          {actifs > 0 && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">{actifs}</span>}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${ouvert ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {ouvert && <div className="border-t border-gray-100 dark:border-surface-700 p-3 sm:p-4">{children}</div>}
    </div>
  );
}
