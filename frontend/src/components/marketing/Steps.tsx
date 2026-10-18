import Reveal from './Reveal';

const STEPS = [
  { t: 'Créez votre espace', d: 'Inscription en deux minutes, sans carte bancaire. Votre société dispose de son espace privé.' },
  { t: 'Configurez votre bureau', d: 'Ajoutez vos utilisateurs, clients et le plan comptable OHADA, puis ouvrez vos premiers dossiers.' },
  { t: 'Pilotez et facturez', d: 'Suivez dossiers, cautions et trésorerie, éditez vos factures PDF et réglez par Mobile Money.' },
];

export default function Steps() {
  return (
    <section id="comment-ca-marche" className="bg-gray-50/70 dark:bg-surface-800/40 border-y border-gray-100 dark:border-surface-800 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 py-20">
        <Reveal className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Opérationnel en trois étapes</h2>
        </Reveal>
        <ol className="grid md:grid-cols-3 gap-10 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.t} className="relative text-center md:px-4">
              <Reveal delay={i * 150}>
                <div className="mx-auto w-14 h-14 rounded-full bg-primary-600 text-white font-display font-extrabold text-xl flex items-center justify-center shadow-elevated">{i + 1}</div>
                <h3 className="mt-5 font-bold text-lg text-gray-900 dark:text-white">{s.t}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.d}</p>
              </Reveal>
              {i < STEPS.length - 1 && <div className="hidden md:block absolute top-7 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] border-t-2 border-dashed border-primary-200 dark:border-primary-500" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
