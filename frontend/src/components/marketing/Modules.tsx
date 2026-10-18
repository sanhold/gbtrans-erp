import Reveal from './Reveal';

const MODULES = [
  { titre: 'Dossiers & suivi', desc: 'Import, export, transit — du dossier physique à la facturation, avec suivi des étapes et alertes.', icon: 'M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
  { titre: 'Offres, proforma & facturation', desc: 'De la proposition commerciale à la facture, avec génération de documents PDF professionnels.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { titre: 'Comptabilité OHADA', desc: 'Plan comptable SYSCOHADA, écritures automatiques et manuelles, grand livre, balance, bilan.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4' },
  { titre: 'Admissions temporaires & cautions', desc: 'Suivi des échéances, alertes avant expiration, apurement et historique complet.', icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z' },
  { titre: 'Finance & trésorerie', desc: 'Caisses, comptes bancaires, dépenses, rapprochement bancaire, créances et dettes.', icon: 'M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.2-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.6 2.5-1.6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { titre: 'RH & paie', desc: 'Dossiers employés, contrats, bulletins de paie générés automatiquement.', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
];

export default function Modules() {
  return (
    <section id="fonctionnalites" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-16">
      <Reveal className="text-center mb-12 max-w-2xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Tout votre bureau, dans un seul outil</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-3">Conçu à partir des besoins réels d&apos;un bureau de transit ivoirien.</p>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MODULES.map((m, i) => (
          <Reveal key={m.titre} delay={(i % 3) * 100} className="h-full">
            <div className="card group h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-primary-300">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center mb-4 transition-colors group-hover:bg-primary-600">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-200 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={m.icon} /></svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{m.titre}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{m.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
