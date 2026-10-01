'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import ExercicesPanel from './ExercicesPanel';
import PlanComptablePanel from './PlanComptablePanel';
import JournauxPanel from './JournauxPanel';

const ONGLETS = [
  { id: 'exercices', label: 'Exercices' },
  { id: 'plan', label: 'Plan comptable' },
  { id: 'journaux', label: 'Journaux' },
] as const;

const CONFIG = {
  REEL: {
    titre: 'Paramètres — Compta Réel',
    desc: 'Exercices, plan comptable et journaux propres à la comptabilité réelle (saisie manuelle). Ils sont indépendants de Compta Auto.',
    retour: { href: '/compta-reel', label: '← Compta Réel' },
    accent: 'bg-primary-600 text-white',
  },
  AUTO: {
    titre: 'Paramètres — Compta Auto',
    desc: 'Exercices, plan comptable et journaux propres à la comptabilité automatique. Ils sont indépendants de Compta Réel.',
    retour: { href: '/comptabilite/compta-auto', label: '← Compta Auto' },
    accent: 'bg-accent-600 text-white',
  },
} as const;

export default function ParametresCompta({ source }: { source: 'REEL' | 'AUTO' }) {
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]['id']>('exercices');
  const cfg = CONFIG[source];

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <Link href={cfg.retour.href} className="text-[11px] text-primary-600 hover:underline block mb-1">{cfg.retour.label}</Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cfg.titre}</h1>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.accent}`}>{source === 'REEL' ? 'Réel' : 'Auto'}</span>
          </div>
          <p className="text-sm text-gray-500">{cfg.desc}</p>
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

        {onglet === 'exercices' && <ExercicesPanel source={source} />}
        {onglet === 'plan' && <PlanComptablePanel source={source} />}
        {onglet === 'journaux' && <JournauxPanel source={source} />}
      </div>
    </AppLayout>
  );
}
