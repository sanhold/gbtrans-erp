'use client';

import dynamic from 'next/dynamic';
import type { GraphifyChartProps } from './GraphifyChart';

/** Chart.js + react-chartjs-2 ne sont chargés qu'à l'affichage d'un graphique. */
const GraphifyChartLazy = dynamic<GraphifyChartProps>(() => import('./GraphifyChart'), {
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[120px] rounded bg-gray-100 dark:bg-surface-700 animate-pulse" />,
});

export default GraphifyChartLazy;
