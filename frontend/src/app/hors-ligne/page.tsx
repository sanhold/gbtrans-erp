'use client';

export default function HorsLignePage() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center bg-canvas dark:bg-surface-900">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-500/20 flex items-center justify-center">
        <svg aria-hidden="true" className="w-8 h-8 text-primary-600 dark:text-primary-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vous êtes hors ligne</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
        GBTRANS ERP a besoin d&apos;une connexion pour afficher vos données. Vérifiez votre réseau puis réessayez.
      </p>
      <button onClick={() => window.location.reload()} className="btn-primary">Réessayer</button>
    </main>
  );
}
