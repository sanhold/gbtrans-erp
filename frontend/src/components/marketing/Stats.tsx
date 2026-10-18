import CountUp from './CountUp';
import Reveal from './Reveal';

const STATS = [
  { to: 14, suffix: ' jours', label: 'd’essai gratuit, sans carte' },
  { to: 6, suffix: ' modules', label: 'intégrés dans un seul outil' },
  { to: 4, suffix: ' opérateurs', label: 'Mobile Money : Orange, MTN, Moov, Wave' },
  { to: 100, suffix: ' %', label: 'de données cloisonnées par société' },
];

export default function Stats() {
  return (
    <section aria-label="Chiffres clés" className="border-y border-gray-100 dark:border-surface-800 bg-gray-50/70 dark:bg-surface-800/40">
      <div className="max-w-6xl mx-auto px-5 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-primary-600 dark:text-primary-200"><CountUp to={s.to} suffix={s.suffix} /></div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{s.label}</div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          Conforme SYSCOHADA (OHADA) · Pensé pour les exigences DGI et Douanes de Côte d&apos;Ivoire
        </p>
      </div>
    </section>
  );
}
