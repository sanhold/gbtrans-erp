'use client';

export interface TabItem {
  key: string;
  label: string;
  /** Petit compteur affiché à côté du libellé (ex : nombre d'éléments). */
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}

/** Onglets communs : défilent horizontalement sur téléphone, navigables au clavier (flèches). */
export default function Tabs({ items, value, onChange, ariaLabel = 'Sections' }: TabsProps) {
  const surTouche = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const suivant = (index + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    onChange(items[suivant].key);
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-surface-700 -mx-1 px-1">
      {items.map((t, i) => {
        const actif = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={actif}
            tabIndex={actif ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => surTouche(e, i)}
            className={`whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px] sm:min-h-0
              ${actif
                ? 'border-primary-500 text-primary-600 dark:text-primary-300 dark:border-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-white'}`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${actif ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
