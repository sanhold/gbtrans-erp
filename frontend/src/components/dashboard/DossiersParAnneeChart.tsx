'use client';

import { GraphifyChart } from '@/components/charts';
import type { GraphifyData } from '@/types/graphify';

interface DossiersParAnneeChartProps {
  dossiersParAnnee: Record<string, number>;
  anneeActive?: number;
  height?: number;
}

/** Évolution du nombre de dossiers par année, avec mise en évidence de l'année sélectionnée. */
export default function DossiersParAnneeChart({ dossiersParAnnee, anneeActive, height = 160 }: DossiersParAnneeChartProps) {
  const entries = Object.entries(dossiersParAnnee || {}).sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Aucune donnée disponible.
      </div>
    );
  }

  const data: GraphifyData = {
    labels: entries.map(([a]) => a),
    series: [{
      label: 'Dossiers',
      data: entries.map(([, count]) => count),
      colors: entries.map(([a]) => (anneeActive !== undefined && parseInt(a) === anneeActive ? '#345c80' : '#82a5c4')),
    }],
  };

  return <GraphifyChart type="bar" data={data} config={{ height }} />;
}
