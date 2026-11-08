import { ReactNode } from 'react';

interface EmptyStateProps {
  titre: string;
  description?: string;
  /** Bouton ou lien proposé pour passer à l'action suivante (ex : « Nouveau dossier »). */
  action?: ReactNode;
}

/** État « aucune donnée » : dit pourquoi c'est vide et propose quoi faire ensuite. */
export default function EmptyState({ titre, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-12 h-12 mb-3 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
        <svg className="w-6 h-6 text-primary-500 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <p className="text-base font-semibold text-gray-900 dark:text-white">{titre}</p>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
