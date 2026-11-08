import Link from 'next/link';

export const fmtFcfa = (n: any) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0))} FCFA`;

/** Gros montants abrégés pour tenir dans les cartes (ex : 4,85 M FCFA) ; le montant exact va en infobulle. */
export const fmtCourt = (n: any) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md FCFA`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M FCFA`;
  return fmtFcfa(v);
};

interface IndicateurProps {
  titre: string;
  valeur: string;
  detail: string;
  /** Classes de couleur du pictogramme (fond + texte). */
  couleur: string;
  /** Tracé SVG (attribut d) du pictogramme. */
  icone: string;
  href?: string;
  infobulle?: string;
}

/** Carte d'indicateur de l'administration : titre, valeur, détail et pictogramme. */
export default function Indicateur({ titre, valeur, detail, couleur, icone, href, infobulle }: IndicateurProps) {
  const contenu = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{titre}</p>
          <p className="mt-1 text-[26px] leading-tight font-extrabold tracking-tight text-gray-900 dark:text-white" title={infobulle}>
            {valeur.endsWith(' FCFA')
              ? <>{valeur.slice(0, -5)}<span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">FCFA</span></>
              : valeur}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${couleur}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={icone} /></svg>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
    </>
  );
  const classes = 'card !p-4 block';
  return href
    ? <Link href={href} className={`${classes} hover:shadow-card-hover transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>{contenu}</Link>
    : <div className={classes}>{contenu}</div>;
}
