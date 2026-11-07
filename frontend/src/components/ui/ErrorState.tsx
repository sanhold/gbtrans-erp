interface ErrorStateProps {
  titre?: string;
  message?: string;
  onRetry?: () => void;
}

/** Erreur de chargement avec bouton « Réessayer » : remplace un écran vide ou un rond sans fin. */
export default function ErrorState({
  titre = 'Impossible de charger les données',
  message = 'Le serveur ne répond pas pour le moment. Vérifiez votre connexion puis réessayez.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center px-4 py-12 gap-1">
      <div className="w-12 h-12 mb-2 rounded-full bg-red-50 dark:bg-red-500/15 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14A2 2 0 003.82 21h16.36a2 2 0 001.71-3.14l-8.18-14a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <p className="text-base font-semibold text-gray-900 dark:text-white">{titre}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-primary mt-3">Réessayer</button>}
    </div>
  );
}
