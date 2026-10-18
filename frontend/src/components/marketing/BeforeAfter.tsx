import Reveal from './Reveal';

const AVANT = ['Dossiers dispersés entre Excel, papier et messageries', 'Échéances de cautions et d’admissions oubliées', 'Facturation et comptabilité ressaisies à la main', 'Aucune vue en temps réel sur la trésorerie'];
const APRES = ['Tous les dossiers centralisés avec suivi des étapes', 'Alertes automatiques avant chaque échéance', 'Factures PDF et écritures OHADA générées pour vous', 'Caisses, banques, créances et dettes en un coup d’œil'];

function Liste({ items, ok }: { items: string[]; ok: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map(i => (
        <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-200">
          <svg className={`w-5 h-5 shrink-0 ${ok ? 'text-accent-600 dark:text-accent-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={ok ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
          </svg>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

export default function BeforeAfter() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-20">
      <Reveal className="text-center mb-12">
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Avant et après GBTRANS</h2>
      </Reveal>
      <div className="grid md:grid-cols-2 gap-6">
        <Reveal className="h-full">
          <div className="card h-full !p-7">
            <h3 className="font-bold text-red-600 dark:text-red-400 mb-5 uppercase text-xs tracking-wider">Sans outil dédié</h3>
            <Liste items={AVANT} ok={false} />
          </div>
        </Reveal>
        <Reveal delay={150} className="h-full">
          <div className="card h-full !p-7 !border-accent-500 ring-1 ring-accent-500/30">
            <h3 className="font-bold text-accent-600 dark:text-accent-500 mb-5 uppercase text-xs tracking-wider">Avec GBTRANS</h3>
            <Liste items={APRES} ok />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
