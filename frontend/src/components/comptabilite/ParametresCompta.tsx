'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import ExercicesPanel from './ExercicesPanel';
import PlanComptablePanel from './PlanComptablePanel';
import JournauxPanel from './JournauxPanel';

const ONGLETS = [
  { id: 'plan', label: 'Plan comptable' },
  { id: 'journaux', label: 'Journaux' },
  { id: 'exercices', label: 'Exercices' },
] as const;

export default function ParametresCompta() {
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]['id']>('plan');

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/comptabilite/compta-auto" className="text-[11px] text-primary-600 hover:underline">Compta Auto</Link>
            <span className="text-[11px] text-gray-300">·</span>
            <Link href="/compta-reel" className="text-[11px] text-primary-600 hover:underline">Compta Manuelle</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Plan comptable</h1>
          <p className="text-sm text-gray-500">Créez le plan, les journaux et les exercices ; verrouillez les comptes sensibles. Utilisés par Compta Auto et Compta Manuelle.</p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-surface-700">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === o.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {onglet === 'plan' && <PlanComptablePanel />}
        {onglet === 'journaux' && <JournauxPanel />}
        {onglet === 'exercices' && <ExercicesPanel />}
      </div>
    </AppLayout>
  );
}
