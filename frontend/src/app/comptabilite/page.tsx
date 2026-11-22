'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';

const MODULES = [
  {
    titre: 'Plan comptable',
    desc: "Comptes, journaux et exercices — un seul jeu, partagé par Compta Auto et Compta Manuelle. Verrouillez les comptes sensibles.",
    href: '/comptabilite/plan-comptable',
    couleur: 'bg-azure-tint text-azure dark:bg-azure/15',
  },
  {
    titre: 'Compta Auto',
    desc: 'Écritures générées et validées automatiquement depuis les factures, paiements et dépenses — lecture seule.',
    href: '/comptabilite/compta-auto',
    couleur: 'bg-azure-tint text-azure dark:bg-azure/15',
  },
  {
    titre: 'Facture FNE Comptabilité',
    desc: 'File de décision : chaque transaction devient facture normalisée (numéro FNE), comptabilité réelle, ou part à la corbeille.',
    href: '/comptabilite/facture-fne',
    couleur: 'bg-azure-tint text-azure dark:bg-azure/15',
  },
  {
    titre: 'Compta Manuelle',
    desc: 'Comptabilisez les pièces en attente ou passez des écritures diverses — même plan comptable.',
    href: '/compta-reel',
    couleur: 'bg-azure-tint text-azure dark:bg-azure/15',
  },
];

export default function ComptabiliteHubPage() {
  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader titre="Comptabilité" sousTitre="Un plan comptable unique, alimenté automatiquement ou manuellement" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {MODULES.map(m => (
            <Link key={m.titre} href={m.href} className="card !p-4 space-y-2 hover:shadow-elevated transition-all">
              <div className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold ${m.couleur}`}>{m.titre}</div>
              <p className="text-sm text-gray-500">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
