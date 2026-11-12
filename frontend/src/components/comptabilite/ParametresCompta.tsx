'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
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
        <div className="flex items-center gap-1 flex-wrap">
          <Link href="/comptabilite/compta-auto" className="inline-flex items-center min-h-[44px] px-1 text-sm text-primary-600 hover:underline">Compta Auto</Link>
          <span aria-hidden="true" className="text-gray-500">·</span>
          <Link href="/compta-reel" className="inline-flex items-center min-h-[44px] px-1 text-sm text-primary-600 hover:underline">Compta Manuelle</Link>
        </div>
        <PageHeader className="!mb-0" title="Plan comptable" subtitle="Créez le plan, les journaux et les exercices ; verrouillez les comptes sensibles. Utilisés par Compta Auto et Compta Manuelle." />

        <div role="tablist" className="flex gap-1 border-b border-gray-200 dark:border-surface-700 overflow-x-auto">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              role="tab"
              aria-selected={onglet === o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-3 md:py-2 whitespace-nowrap text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === o.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-800 dark:hover:text-gray-200'}`}
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
