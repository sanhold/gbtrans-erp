'use client';

import { useEffect, ReactNode } from 'react';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/** Panneau de détail qui glisse depuis la droite (ordinateur uniquement ; sur téléphone on ouvre une page). */
export default function SlidePanel({ open, onClose, label, children }: SlidePanelProps) {
  useEffect(() => {
    if (!open) return;
    const fermer = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="hidden lg:block fixed inset-0 z-40 !mt-0" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[520px] max-w-full bg-white dark:bg-surface-800 shadow-2xl overflow-y-auto animate-slide-in">
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-surface-700 flex items-center justify-center text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {children}
      </aside>
    </div>
  );
}
