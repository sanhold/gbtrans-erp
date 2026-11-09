import { ReactNode } from 'react';

interface PageHeaderProps {
  titre: string;
  sousTitre?: string;
  /** Boutons d'action principaux (à droite sur ordinateur, sous le titre sur téléphone). */
  actions?: ReactNode;
  /** Masque le sous-titre sur téléphone pour gagner de la place. */
  sousTitreMasqueMobile?: boolean;
}

/** En-tête de page commun : même hiérarchie typographique et même place pour les actions partout. */
export default function PageHeader({ titre, sousTitre, actions, sousTitreMasqueMobile }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3 sm:mb-5">
      <div className="min-w-0">
        <h1 className="font-display text-[20px] sm:text-[26px] leading-tight font-extrabold tracking-tight text-gray-900 dark:text-white">{titre}</h1>
        {sousTitre && <p className={`text-[12.5px] sm:text-[14px] text-gray-500 dark:text-gray-400 ${sousTitreMasqueMobile ? 'hidden sm:block' : ''}`}>{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
