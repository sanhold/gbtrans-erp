export type GraphifyChartType = 'line' | 'area' | 'bar' | 'pie' | 'doughnut';

export interface GraphifySeries {
  label: string;
  data: number[];
  color?: string;
  /** Couleur par point (barres uniquement) — prioritaire sur `color` quand fournie. */
  colors?: string[];
}

export interface GraphifyData {
  labels: string[];
  series: GraphifySeries[];
}

export interface GraphifyConfig {
  stacked?: boolean;
  showLegend?: boolean;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  height?: number;
}
