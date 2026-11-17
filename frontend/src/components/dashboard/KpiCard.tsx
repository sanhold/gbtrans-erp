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

const Pictogramme = ({ icon, className }: { icon: string; className: string }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={icon} />
  </svg>
);

/** Carte d'indicateur de la charte : pastille d'icône colorée à gauche (ordinateur), chiffre en grand, libellé, contexte. */
export default function KpiCard({ label, value, unit, icon, iconClass = 'text-primary-600 dark:text-primary-300', context }: KpiCardProps) {
  return (
    <div className="card !p-3 sm:!p-4 flex flex-col gap-1.5 sm:gap-2.5 min-w-0 sm:rounded-2xl">
      {/* Téléphone : libellé + petite icône, chiffre dessous */}
      <div className="flex items-start justify-between gap-2 sm:hidden">
        <span className="text-[11.5px] text-gray-500 dark:text-gray-400 font-medium leading-tight line-clamp-2" title={label}>{label}</span>
        <Pictogramme icon={icon} className={`w-4 h-4 flex-shrink-0 ${iconClass}`} />
      </div>
      <div className="sm:hidden font-display font-extrabold tracking-tight text-gray-900 dark:text-white leading-none whitespace-nowrap text-[19px] overflow-hidden text-ellipsis">
        {value}
        {unit && <span className="ml-1 hidden min-[400px]:inline text-[11px] font-medium text-gray-500 dark:text-gray-400 tracking-normal">{unit}</span>}
      </div>
      {/* Ordinateur : pastille colorée + chiffre + libellé */}
      <div className="hidden sm:flex items-center gap-3.5 min-w-0">
        <span className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconClass}`}>
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-current opacity-[0.12]" />
          <Pictogramme icon={icon} className="relative w-[22px] h-[22px]" />
        </span>
        <div className="min-w-0">
          <div className="font-display font-extrabold tracking-tight text-primary-600 dark:text-white leading-none whitespace-nowrap text-[28px]">
            {value}
            {unit && <span className="ml-1.5 text-[13px] font-medium text-gray-500 dark:text-gray-400 tracking-normal">{unit}</span>}
          </div>
          <div className="mt-1 text-[13.5px] text-gray-700 dark:text-gray-300 font-medium leading-tight truncate" title={label}>{label}</div>
        </div>
      </div>
      <div className="text-[11.5px] sm:text-[12.5px] sm:min-h-[18px] leading-snug text-gray-500 dark:text-gray-400">{context}</div>
    </div>
  );
}
