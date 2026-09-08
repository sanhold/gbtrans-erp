'use client';

import { GraphifyChart } from '@/components/charts';
import type { GraphifyData } from '@/types/graphify';

interface ResumeFinancierChartProps {
  recettes: number;
  depenses: number;
  benefice: number;
  height?: number;
}

const fmtXOF = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} F`;

/** Comparaison Recettes / Dépenses / Bénéfice (dashboard analytique). */
export default function ResumeFinancierChart({ recettes, depenses, benefice, height = 160 }: ResumeFinancierChartProps) {
  const data: GraphifyData = {
    labels: ['Recettes', 'Dépenses', 'Bénéfice'],
    series: [{
      label: 'Montant',
      data: [recettes, depenses, benefice],
      colors: ['#00b884', '#dc2626', benefice >= 0 ? '#345c80' : '#dc2626'],
    }],
  };

  if (!recettes && !depenses && !benefice) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Aucune donnée disponible pour cette période.
      </div>
    );
  }

  return <GraphifyChart type="bar" data={data} config={{ height, yAxisFormatter: fmtXOF, tooltipFormatter: fmtXOF }} />;
}
