import { ReactNode } from 'react';

interface PageHeaderProps {
  titre: string;
  sousTitre?: string;
  /** Boutons d'action principaux (à droite sur ordinateur, sous le titre sur téléphone). */
  actions?: ReactNode;
}

/** En-tête de page commun : même hiérarchie typographique et même place pour les actions partout. */
export default function PageHeader({ titre, sousTitre, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="font-display text-[24px] sm:text-[26px] font-extrabold tracking-tight text-gray-900 dark:text-white">{titre}</h1>
        {sousTitre && <p className="text-[14px] text-gray-500 dark:text-gray-400">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
