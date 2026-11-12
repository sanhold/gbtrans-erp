'use client';

import { useState } from 'react';

interface FiltersToggleProps {
  /** Nombre de filtres actifs (affiché dans le bouton). */
  count?: number;
  children: React.ReactNode;
  className?: string;
}

/** Mobile : filtres repliés derrière un bouton "Filtres (n)". Bureau (>=768px) : toujours affichés. */
export default function FiltersToggle({ count = 0, children, className = '' }: FiltersToggleProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="md:hidden btn-secondary min-h-[44px] w-full justify-center gap-2"
      >
        <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" /></svg>
        Filtres{count > 0 ? ` (${count})` : ''}
      </button>
      <div className={`${open ? 'block mt-2' : 'hidden'} md:block md:mt-0`}>{children}</div>
    </div>
  );
}
