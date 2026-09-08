'use client';

import { GraphifyChart } from '@/components/charts';
import { GRAPHIFY_PALETTE } from '@/services/graphify';
import type { GraphifyData } from '@/types/graphify';

export interface RepartitionItem {
  label: string;
  value: number;
}

interface RepartitionDossiersChartProps {
  items: RepartitionItem[];
  height?: number;
}

/**
 * Graphique "Répartition des dossiers par nature" (Import/Export/Transit...), utilisé
 * sur le dashboard, le dashboard analytique et la page Statistiques — remplace trois
 * implémentations dupliquées en barres de progression CSS par un anneau + légende chiffrée.
 */
export default function RepartitionDossiersChart({ items, height = 200 }: RepartitionDossiersChartProps) {
  const total = items.reduce((s, i) => s + i.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Aucune donnée disponible pour cette période.
      </div>
    );
  }

  const data: GraphifyData = {
    labels: items.map(i => i.label),
    series: [{ label: 'Dossiers', data: items.map(i => i.value) }],
  };

  return (
    <div className="space-y-3">
      <GraphifyChart type="doughnut" data={data} config={{ height, showLegend: false, tooltipFormatter: (v) => `${v} (${Math.round((v / total) * 100)}%)` }} />
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: GRAPHIFY_PALETTE[i % GRAPHIFY_PALETTE.length] }} />
              {item.label}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">{item.value} ({Math.round((item.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
