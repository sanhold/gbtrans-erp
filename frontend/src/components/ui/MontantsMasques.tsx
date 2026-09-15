'use client';

interface MontantsMasquesProps {
  height?: number;
  label?: string;
}

export default function MontantsMasques({ height = 200, label = 'Montants masqués' }: MontantsMasquesProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-200 dark:border-surface-600 text-gray-400 dark:text-gray-500"
      style={{ height }}
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <p className="text-xs">{label} — permission requise</p>
    </div>
  );
}
