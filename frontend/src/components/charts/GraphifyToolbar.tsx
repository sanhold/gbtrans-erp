'use client';

interface GraphifyToolbarProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}

/** Barre d'actions générique au-dessus d'un graphique : filtres libres + rafraîchissement. */
export default function GraphifyToolbar({ onRefresh, refreshing, children }: GraphifyToolbarProps) {
  if (!onRefresh && !children) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {children}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title="Actualiser"
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-surface-700 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
}
