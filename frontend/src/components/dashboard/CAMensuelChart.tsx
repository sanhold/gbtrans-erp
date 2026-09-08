'use client';

import { GraphifyChart } from '@/components/charts';
import type { GraphifyData } from '@/types/graphify';

export interface CAMensuelPoint {
  mois: number;
  ca: number;
  encaisse: number;
}

interface CAMensuelChartProps {
  caMensuel: CAMensuelPoint[];
  height?: number;
}

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const fmtXOF = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} F`;

/**
 * Graphique "Chiffre d'affaires mensuel" (Facturé/Encaissé), utilisé sur le dashboard
 * et le dashboard analytique — remplace deux implémentations dupliquées en barres CSS.
 * Ne fait aucun appel API : reçoit les données déjà chargées par la page appelante.
 */
export default function CAMensuelChart({ caMensuel, height = 190 }: CAMensuelChartProps) {
  const data: GraphifyData = {
    labels: MOIS_LABELS,
    series: [
      { label: 'Facturé', color: '#345c80', data: MOIS_LABELS.map((_, i) => caMensuel.find(m => m.mois === i + 1)?.ca || 0) },
      { label: 'Encaissé', color: '#00b884', data: MOIS_LABELS.map((_, i) => caMensuel.find(m => m.mois === i + 1)?.encaisse || 0) },
    ],
  };

  const isEmpty = data.series.every(s => s.data.every(v => !v));
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Aucune donnée disponible pour cette période.
      </div>
    );
  }

  return <GraphifyChart type="area" data={data} config={{ height, yAxisFormatter: fmtXOF, tooltipFormatter: fmtXOF }} />;
}
