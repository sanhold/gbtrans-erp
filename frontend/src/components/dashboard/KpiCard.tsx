import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  /** Chemin SVG (viewBox 24, trait fin). */
  icon: string;
  iconClass?: string;
  /** Ligne de contexte sous le chiffre. */
  context?: ReactNode;
}

export default function KpiCard({ label, value, unit, icon, iconClass = 'text-primary-600 dark:text-primary-300', context }: KpiCardProps) {
  return (
    <div className="card !p-3 sm:!p-5 flex flex-col gap-1.5 sm:gap-2 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11.5px] sm:text-[13px] text-gray-500 dark:text-gray-400 font-medium leading-tight line-clamp-2 sm:truncate" title={label}>{label}</span>
        <svg aria-hidden="true" className={`w-4 h-4 sm:w-[18px] sm:h-[18px] flex-shrink-0 ${iconClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="font-display font-extrabold tracking-tight text-gray-900 dark:text-white leading-none whitespace-nowrap text-[22px] sm:text-[30px]">
        {value}
        {unit && <span className="ml-1 sm:ml-1.5 text-[11px] sm:text-[13px] font-medium text-gray-500 dark:text-gray-400 tracking-normal">{unit}</span>}
      </div>
      <div className="text-[11.5px] sm:text-[13px] sm:min-h-[20px] leading-snug text-gray-500 dark:text-gray-400">{context}</div>
    </div>
  );
}
