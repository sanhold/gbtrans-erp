'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { useIsDarkMode } from '@/hooks/useGraphify';
import { toChartJsData, toChartJsOptions } from '@/services/graphify';
import type { GraphifyChartType, GraphifyConfig, GraphifyData } from '@/types/graphify';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const CHART_COMPONENTS = { line: Line, area: Line, bar: Bar, pie: Pie, doughnut: Doughnut } as const;

export interface GraphifyChartProps {
  type: GraphifyChartType;
  data: GraphifyData;
  config?: GraphifyConfig;
  className?: string;
}

export default function GraphifyChart({ type, data, config, className }: GraphifyChartProps) {
  const isDark = useIsDarkMode();
  const Component = CHART_COMPONENTS[type];
  const chartData = toChartJsData(type, data);
  const options = toChartJsOptions(type, config, isDark);

  return (
    <div className={className} style={{ height: config?.height ?? 280 }}>
      <Component data={chartData} options={options} />
    </div>
  );
}
