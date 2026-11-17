import { ReactNode } from 'react';

interface PageHeaderProps {
  titre: string;
  sousTitre?: string;
  /** Boutons d'action principaux (à droite sur ordinateur, sous le titre sur téléphone). */
  actions?: ReactNode;
  /** Masque le sous-titre sur téléphone pour gagner de la place. */
  sousTitreMasqueMobile?: boolean;
  /** Pictogramme (chemin SVG, viewBox 24) affiché dans une pastille à gauche du titre, sur ordinateur. */
  icone?: string;
  /** Contenu compact entre le titre et les actions (par ex. des pastilles d'indicateurs) ; passe à la ligne sur petit écran. */
  centre?: ReactNode;
}

/** En-tête de page commun : même hiérarchie typographique et même place pour les actions partout. */
export default function PageHeader({ titre, sousTitre, actions, sousTitreMasqueMobile, icone, centre }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3 sm:mb-5">
      <div className="flex min-w-0 items-center gap-3.5">
        {icone && (
          <span aria-hidden="true" className="hidden sm:flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-white/10 dark:text-white">
            <svg className="h-[26px] w-[26px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icone} /></svg>
          </span>
        )}
        <div className="min-w-0">
        <h1 className="font-display text-[20px] sm:text-[26px] leading-tight font-extrabold tracking-tight text-primary-600 dark:text-white">{titre}</h1>
        {sousTitre && <p className={`text-[12.5px] sm:text-[14px] text-gray-500 dark:text-gray-400 ${sousTitreMasqueMobile ? 'hidden sm:block' : ''}`}>{sousTitre}</p>}
        </div>
      </div>
      {centre && <div className="order-last lg:order-none flex w-full lg:w-auto lg:flex-1 min-w-0 flex-wrap items-center gap-2 lg:justify-center">{centre}</div>}
      {actions && <div className="ph-actions flex max-w-full flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
