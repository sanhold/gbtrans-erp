'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import ExercicesPanel from './ExercicesPanel';
import PlanComptablePanel from './PlanComptablePanel';
import JournauxPanel from './JournauxPanel';
import InfoBulle from '@/components/ui/InfoBulle';

const ONGLETS = [
  { id: 'plan', label: 'Plan comptable' },
  { id: 'journaux', label: 'Journaux' },
  { id: 'exercices', label: 'Exercices' },
] as const;

/** Explications de chaque onglet, affichées dans la bulle « i » plutôt que sur la page. */
const AIDES: Record<(typeof ONGLETS)[number]['id'], { titre: string; alerte?: boolean; contenu: ReactNode }> = {
  plan: {
    titre: 'Plan comptable',
    alerte: true,
    contenu: (
      <>
        <p>Créez le plan, les journaux et les exercices ; verrouillez les comptes sensibles. Ils sont utilisés par Compta Auto et Compta Manuelle.</p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-300">
          Le plan SYSCOHADA importable ici est une base de référence courante (comptes usuels d&apos;un bureau de transit), pas la nomenclature officielle exhaustive certifiée : à compléter et valider avec votre expert-comptable. Verrouillez les comptes sensibles (411, 401, 512, 571…) pour empêcher toute modification accidentelle.
        </p>
      </>
    ),
  },
  journaux: {
    titre: 'Journaux',
    contenu: <p>Un seul jeu de journaux (Achats, Ventes, Banque, Caisse, OD…), utilisé à la fois par Compta Auto et Compta Manuelle.</p>,
  },
  exercices: {
    titre: 'Exercices comptables',
    contenu: <p>Un seul jeu d&apos;exercices, utilisé à la fois par Compta Auto et Compta Manuelle.</p>,
  },
};

export default function ParametresCompta() {
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]['id']>('plan');

  return (
    <AppLayout>
      <div className="space-y-3">
        <h1 className="sr-only">Plan comptable</h1>

        {/* Une seule ligne : les onglets font office de titre ; liens et explications à droite. */}
        <div className="flex items-end justify-between gap-3 border-b border-gray-200 dark:border-surface-700">
          <div className="flex gap-1 overflow-x-auto">
            {ONGLETS.map(o => (
              <button
                key={o.id}
                onClick={() => setOnglet(o.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${onglet === o.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-1.5 flex-shrink-0">
            <Link href="/comptabilite/compta-auto" className="hidden sm:inline text-[11px] text-primary-600 hover:underline">Compta Auto</Link>
            <span className="hidden sm:inline text-[11px] text-gray-300">·</span>
            <Link href="/compta-reel" className="hidden sm:inline text-[11px] text-primary-600 hover:underline">Compta Manuelle</Link>
            <InfoBulle titre={AIDES[onglet].titre} alerte={AIDES[onglet].alerte}>{AIDES[onglet].contenu}</InfoBulle>
          </div>
        </div>

        {onglet === 'plan' && <PlanComptablePanel />}
        {onglet === 'journaux' && <JournauxPanel />}
        {onglet === 'exercices' && <ExercicesPanel />}
      </div>
    </AppLayout>
  );
}
