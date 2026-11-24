'use client';

import { useEffect, useRef, useState } from 'react';

interface PeriodSwitchProps {
  /** Année affichée. */
  value: number;
  onChange: (year: number) => void;
  /** Année en cours : sélectionnée au départ, repérée dans la liste. */
  anneeCourante: number;
  /** Années proposées (de la plus récente à la plus ancienne). */
  annees: number[];
}

/**
 * Sélecteur de l'année affichée (seule période supportée par l'API du tableau de bord) :
 * l'année affichée, et un petit bouton à côté qui ouvre la liste des années à choisir.
 * Se ferme au clic en dehors, avec Échap, ou après le choix.
 */
export default function PeriodSwitch({ value, onChange, anneeCourante, annees }: PeriodSwitchProps) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const clicDehors = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('mousedown', clicDehors);
    document.addEventListener('touchstart', clicDehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', clicDehors);
      document.removeEventListener('touchstart', clicDehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  const choisir = (y: number) => { onChange(y); setOuvert(false); };
  const horsCourante = value !== anneeCourante;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-2 self-start">
      <span
        aria-live="polite"
        className="inline-flex min-h-[44px] sm:min-h-[36px] items-center rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-semibold text-primary-700 shadow-card dark:border-surface-700 dark:bg-surface-800 dark:text-white"
      >
        {value}
        {!horsCourante && <span className="ml-2 text-[11px] font-medium text-gray-400">en cours</span>}
      </span>

      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-label="Choisir une autre année"
        title="Choisir une autre année"
        className={`inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg border shadow-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${ouvert ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/15' : 'border-gray-200 bg-white text-gray-500 hover:border-primary-300 hover:text-primary-600 dark:border-surface-700 dark:bg-surface-800 dark:text-gray-300'}`}
      >
        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      </button>

      {horsCourante && (
        <button
          type="button"
          onClick={() => choisir(anneeCourante)}
          className="text-[12px] font-medium text-primary-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded dark:text-primary-300"
        >
          Revenir à {anneeCourante}
        </button>
      )}

      {ouvert && (
        <ul
          role="listbox"
          aria-label="Années"
          className="absolute left-0 top-full z-40 mt-2 max-h-72 w-48 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-surface-600 dark:bg-surface-800"
        >
          {annees.map((y) => {
            const actif = y === value;
            return (
              <li key={y} role="option" aria-selected={actif}>
                <button
                  type="button"
                  onClick={() => choisir(y)}
                  className={`flex min-h-[44px] sm:min-h-[36px] w-full items-center justify-between rounded-lg px-3 text-left text-[13.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${actif ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-surface-700'}`}
                >
                  <span>{y}</span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {y === anneeCourante ? 'en cours' : actif ? '✓' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
