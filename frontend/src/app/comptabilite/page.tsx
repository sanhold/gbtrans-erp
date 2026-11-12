'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';

const MODULES = [
  {
    titre: 'Plan comptable',
    desc: "Comptes, journaux et exercices — un seul jeu, partagé par Compta Auto et Compta Manuelle. Verrouillez les comptes sensibles.",
    href: '/comptabilite/plan-comptable',
    couleur: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20',
  },
  {
    titre: 'Compta Auto',
    desc: 'Écritures générées et validées automatiquement depuis les factures, paiements et dépenses — lecture seule.',
    href: '/comptabilite/compta-auto',
    couleur: 'bg-accent-50 text-accent-600 dark:bg-accent-900/20',
  },
  {
    titre: 'Compta Manuelle',
    desc: 'Comptabilisez les pièces en attente ou passez des écritures diverses — même plan comptable.',
    href: '/compta-reel',
    couleur: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20',
  },
];

export default function ComptabiliteHubPage() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader title="Comptabilité" subtitle="Un plan comptable unique, deux façons de l'alimenter : automatiquement depuis les opérations, ou manuellement." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MODULES.map(m => (
            <Link key={m.titre} href={m.href} className="card space-y-3 hover:shadow-elevated transition-all">
              <div className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold ${m.couleur}`}>{m.titre}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
