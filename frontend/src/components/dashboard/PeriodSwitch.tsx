interface PeriodSwitchProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

/** Sélecteur segmenté de l'année affichée (seule période supportée par l'API du tableau de bord). */
export default function PeriodSwitch({ years, value, onChange }: PeriodSwitchProps) {
  return (
    <div role="group" aria-label="Période affichée" className="inline-flex items-center p-1 rounded-lg bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 shadow-card self-start sm:self-auto">
      {years.map((y) => {
        const active = y === value;
        return (
          <button
            key={y}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(y)}
            className={`min-h-[44px] sm:min-h-[36px] px-4 rounded-md text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${active ? 'bg-primary-600 text-white font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-700'}`}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}
