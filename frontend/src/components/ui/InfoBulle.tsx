'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface InfoBulleProps {
  /** Titre de la bulle (« À savoir » par défaut). */
  titre?: string;
  /** Explications affichées au clic. */
  children: ReactNode;
  /** Pastille orange sur le bouton : la bulle contient un avertissement à lire. */
  alerte?: boolean;
  /** Côté d'ancrage de la bulle par rapport au bouton. */
  cote?: 'gauche' | 'droite';
  className?: string;
}

/**
 * Bouton « i » qui ouvre les explications dans une bulle au clic.
 * Sert à sortir les textes d'aide de la page pour laisser la place aux tableaux.
 * Se ferme au clic en dehors ou avec Échap.
 */
export default function InfoBulle({ titre = 'À savoir', children, alerte = false, cote = 'droite', className = '' }: InfoBulleProps) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const clicDehors = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('mousedown', clicDehors);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', clicDehors);
      document.removeEventListener('keydown', echap);
    };
  }, [ouvert]);

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        aria-label="Afficher les explications"
        title="Explications"
        className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full border text-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 ${ouvert ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/15' : 'border-gray-200 bg-white hover:border-primary-300 hover:text-primary-600 dark:border-surface-600 dark:bg-surface-800'}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {alerte && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-surface-800" />}
      </button>
      {ouvert && (
        <div
          role="dialog"
          aria-label={titre}
          className={`absolute top-9 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-3.5 text-[12.5px] leading-relaxed text-gray-600 shadow-lg dark:border-surface-600 dark:bg-surface-800 dark:text-gray-300 ${cote === 'droite' ? 'right-0' : 'left-0'}`}
        >
          <div className="mb-1.5 text-[13px] font-bold text-gray-900 dark:text-white">{titre}</div>
          <div className="space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}
