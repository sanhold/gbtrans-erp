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
    <div className="card !p-4 sm:!p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium truncate">{label}</span>
        <svg aria-hidden="true" className={`w-[18px] h-[18px] flex-shrink-0 ${iconClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="font-display font-extrabold tracking-tight text-gray-900 dark:text-white leading-none whitespace-nowrap text-[28px] sm:text-[30px]">
        {value}
        {unit && <span className="ml-1.5 text-[13px] font-medium text-gray-500 dark:text-gray-400 tracking-normal">{unit}</span>}
      </div>
      <div className="text-[13px] min-h-[20px] text-gray-500 dark:text-gray-400">{context}</div>
    </div>
  );
}
