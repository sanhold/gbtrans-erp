'use client';

import { GRAPHIFY_PALETTE } from '@/services/graphify';
import type { GraphifyData } from '@/types/graphify';

interface GraphifyLegendProps {
  data: GraphifyData;
  /** Pour pie/doughnut : légende par catégorie (labels) plutôt que par série. */
  byCategory?: boolean;
  className?: string;
}

/**
 * Légende à puce colorée, dans le même style que celle déjà utilisée à la main
 * sur le dashboard (Facturé / Encaissé) — pour rester cohérent avec la charte
 * plutôt que d'utiliser le rendu par défaut de Chart.js.
 */
export default function GraphifyLegend({ data, byCategory, className }: GraphifyLegendProps) {
  const items = byCategory
    ? data.labels.map((label, i) => ({ label, color: GRAPHIFY_PALETTE[i % GRAPHIFY_PALETTE.length] }))
    : data.series.map((s, i) => ({ label: s.label, color: s.color || GRAPHIFY_PALETTE[i % GRAPHIFY_PALETTE.length] }));

  return (
    <div className={`flex items-center flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 ${className || ''}`}>
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
