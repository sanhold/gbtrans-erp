'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { GraphifyContainer } from '@/components/charts';
import { useGraphify } from '@/hooks/useGraphify';
import type { GraphifyData } from '@/types/graphify';

const fmtXOF = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} F`;

// --- Données de démonstration uniquement (jamais utilisées dans les modules métier) ---

const evolutionData: GraphifyData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  series: [
    { label: 'Facturé (démo)', data: [12, 19, 14, 25, 22, 30, 18, 24, 28, 32, 27, 35].map(v => v * 100000) },
    { label: 'Encaissé (démo)', data: [10, 15, 13, 20, 18, 24, 16, 20, 23, 27, 22, 29].map(v => v * 100000) },
  ],
};

const comparaisonData: GraphifyData = {
  labels: ['Import', 'Export', 'Transit', 'Réexport', 'Cabotage'],
  series: [{ label: 'Dossiers (démo)', data: [238, 12, 5, 3, 2] }],
};

const repartitionData: GraphifyData = {
  labels: ['SEG CI', 'RAZEL-BEC', 'IVOIRE TRANSPORT', 'AFRICA TRAILER', 'Autres'],
  series: [{ label: 'CA (démo)', data: [42, 21, 14, 11, 12] }],
};

const indicateursData: GraphifyData = {
  labels: ['Dossiers', 'Clients actifs', 'Factures', 'Paiements'],
  series: [{ label: 'Total (démo)', data: [255, 61, 262, 184] }],
};

function fakeFetch<T>(value: T, opts?: { fail?: boolean; empty?: boolean; pending?: boolean }): () => Promise<T> {
  return () => new Promise((resolve, reject) => {
    if (opts?.pending) return; // ne résout jamais : démontre l'état "loading"
    setTimeout(() => {
      if (opts?.fail) reject(new Error('Erreur de démonstration (échec simulé)'));
      else if (opts?.empty) resolve({ labels: [], series: [] } as any);
      else resolve(value);
    }, 700);
  });
}

export default function DemoGraphifyPage() {
  const [etatDemo, setEtatDemo] = useState<'success' | 'loading' | 'empty' | 'error'>('success');

  const evolution = useGraphify(fakeFetch(evolutionData), []);
  const comparaison = useGraphify(fakeFetch(comparaisonData), []);
  const repartition = useGraphify(fakeFetch(repartitionData), []);
  const indicateurs = useGraphify(
    fakeFetch(indicateursData, { fail: etatDemo === 'error', empty: etatDemo === 'empty', pending: etatDemo === 'loading' }),
    [etatDemo]
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Démonstration — Graphify</h1>
          <p className="text-sm text-gray-500">
            Page de test interne pour la bibliothèque de graphiques réutilisable (composants sous <code>components/charts</code>).
            Toutes les données ci-dessous sont fictives et ne proviennent d&apos;aucun module métier.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GraphifyContainer
            title="1. Évolution dans le temps"
            type="area"
            data={evolution.data}
            loading={evolution.loading}
            error={evolution.error}
            onRefresh={evolution.refresh}
            refreshing={evolution.loading}
            config={{ yAxisFormatter: fmtXOF, tooltipFormatter: fmtXOF, height: 260 }}
          />

          <GraphifyContainer
            title="2. Comparaison de plusieurs catégories"
            type="bar"
            data={comparaison.data}
            loading={comparaison.loading}
            error={comparaison.error}
            onRefresh={comparaison.refresh}
            refreshing={comparaison.loading}
            config={{ height: 260 }}
          />

          <GraphifyContainer
            title="3. Répartition"
            type="doughnut"
            data={repartition.data}
            loading={repartition.loading}
            error={repartition.error}
            onRefresh={repartition.refresh}
            refreshing={repartition.loading}
            config={{ height: 260, tooltipFormatter: (v) => `${v}%` }}
          />

          <GraphifyContainer
            title="4. Indicateurs statistiques"
            type="bar"
            data={indicateurs.data}
            loading={indicateurs.loading}
            error={indicateurs.error}
            onRefresh={indicateurs.refresh}
            refreshing={indicateurs.loading}
            config={{ height: 260 }}
            toolbarChildren={
              <div className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-0.5 text-[10px]">
                {(['success', 'loading', 'empty', 'error'] as const).map(e => (
                  <button
                    key={e}
                    onClick={() => setEtatDemo(e)}
                    className={`px-2 py-1 rounded-md font-medium capitalize transition-colors ${etatDemo === e ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-500'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            }
          />
        </div>

        <p className="text-xs text-gray-400">
          Le panneau de la carte n°4 permet de forcer les états <strong>loading / empty / error</strong> pour vérifier que le conteneur les gère correctement.
        </p>
      </div>
    </AppLayout>
  );
}
