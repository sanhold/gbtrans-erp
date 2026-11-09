import { ReactNode } from 'react';

interface Props {
  /** Bandeau de mise en avant en haut (ex : montant). */
  mise?: { libelle: string; valeur: ReactNode; ton?: 'positif' | 'negatif' | 'neutre' };
  lignes: [string, ReactNode][];
}

const TONS = {
  positif: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  negatif: 'bg-red-50 text-red-600 dark:bg-red-500/10',
  neutre: 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200',
} as const;

/** Contenu d'une fenêtre de détail : un chiffre clé éventuel puis les informations, seules celles renseignées. */
export default function FicheDetail({ mise, lignes }: Props) {
  const visibles = lignes.filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== '-');
  return (
    <div className="space-y-4">
      {mise && (
        <div className={`rounded-xl px-4 py-3 text-center ${TONS[mise.ton || 'neutre']}`}>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">{mise.libelle}</div>
          <div className="text-2xl font-bold font-mono tabular-nums">{mise.valeur}</div>
        </div>
      )}
      <dl className="divide-y divide-gray-100 dark:divide-surface-700 text-sm">
        {visibles.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 py-2.5">
            <dt className="text-gray-500">{k}</dt>
            <dd className="text-right font-medium text-gray-900 dark:text-white break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
