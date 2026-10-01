'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const MODULES = [
  {
    titre: 'Compta Réel',
    desc: 'Saisie manuelle des écritures, grand livre, balance et bilan.',
    ops: '/compta-reel',
    params: '/compta-reel/parametres',
    couleur: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20',
  },
  {
    titre: 'Compta Auto',
    desc: "Suggestions d'écritures générées depuis les factures, paiements et dépenses.",
    ops: '/comptabilite/compta-auto',
    params: '/comptabilite/compta-auto/parametres',
    couleur: 'bg-accent-50 text-accent-600 dark:bg-accent-900/20',
  },
];

export default function ComptabiliteHubPage() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comptabilité</h1>
          <p className="text-sm text-gray-500">Deux comptabilités indépendantes, chacune avec ses exercices, son plan comptable et ses journaux.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map(m => (
            <div key={m.titre} className="card space-y-3">
              <div className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold ${m.couleur}`}>{m.titre}</div>
              <p className="text-sm text-gray-500">{m.desc}</p>
              <div className="flex gap-2">
                <Link href={m.ops} className="btn-primary text-sm">Ouvrir</Link>
                <Link href={m.params} className="btn-secondary text-sm">Paramètres</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
