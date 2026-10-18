import Link from 'next/link';
import ProductPreview from './ProductPreview';

interface Props { badge: string; titre: string; sousTitre: string }

export default function Hero({ badge, titre, sousTitre }: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-200/50 dark:bg-primary-500/20 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute top-40 -right-24 w-96 h-96 rounded-full bg-accent-100/70 dark:bg-accent-500/10 blur-3xl motion-safe:animate-pulse" />
      <div className="relative max-w-6xl mx-auto px-5 pt-14 sm:pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200 text-xs font-semibold mb-6 motion-safe:animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />{badge}
        </span>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white max-w-4xl mx-auto leading-[1.1] motion-safe:animate-slide-up">
          {titre}
        </h1>
        <p className="mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto motion-safe:animate-slide-up">
          {sousTitre}
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
          <Link href="/inscription" className="btn-primary group !px-7 !min-h-[48px] text-sm hover:-translate-y-0.5 hover:shadow-elevated transition-all">
            Démarrer l&apos;essai gratuit — 14 jours
            <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </Link>
          <Link href="/tarifs" className="btn-secondary !px-7 !min-h-[48px] text-sm">Voir les tarifs</Link>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Sans engagement · Sans carte bancaire · Paiement par Mobile Money</p>
        <div className="mt-14 sm:mt-16"><ProductPreview /></div>
      </div>
    </section>
  );
}
