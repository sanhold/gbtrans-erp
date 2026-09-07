import type { ChartData, ChartOptions } from 'chart.js';
import type { GraphifyChartType, GraphifyConfig, GraphifyData } from '@/types/graphify';

// Palette alignée sur la charte graphique (tailwind.config.js : primary/accent/amber + teintes complémentaires).
export const GRAPHIFY_PALETTE = ['#345c80', '#00b884', '#e8821e', '#7c3aed', '#dc2626', '#0891b2'];

function colorAt(index: number, override?: string) {
  return override || GRAPHIFY_PALETTE[index % GRAPHIFY_PALETTE.length];
}

export function toChartJsData(type: GraphifyChartType, data: GraphifyData): ChartData<any> {
  if (type === 'pie' || type === 'doughnut') {
    const serie = data.series[0];
    return {
      labels: data.labels,
      datasets: [{
        data: serie?.data || [],
        backgroundColor: data.labels.map((_, i) => colorAt(i)),
        borderWidth: 0,
      }],
    };
  }

  const isArea = type === 'area';
  return {
    labels: data.labels,
    datasets: data.series.map((serie, i) => {
      const color = colorAt(i, serie.color);
      return {
        label: serie.label,
        data: serie.data,
        backgroundColor: isArea ? `${color}33` : color,
        borderColor: color,
        borderWidth: type === 'bar' ? 0 : 2,
        borderRadius: type === 'bar' ? 4 : undefined,
        fill: isArea,
        tension: type === 'line' || isArea ? 0.35 : undefined,
        pointRadius: type === 'line' || isArea ? 2 : undefined,
      };
    }),
  };
}

export function toChartJsOptions(type: GraphifyChartType, config: GraphifyConfig | undefined, isDark: boolean): ChartOptions<any> {
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#a3a3a3' : '#6b7280';
  const isCategorical = type === 'pie' || type === 'doughnut';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: config?.showLegend ?? isCategorical,
        position: 'bottom',
        labels: { color: textColor, usePointStyle: true, boxWidth: 8, padding: 16, font: { size: 11 } },
      },
      tooltip: {
        callbacks: config?.tooltipFormatter ? {
          label: (ctx: any) => `${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${config.tooltipFormatter!(ctx.parsed.y ?? ctx.parsed)}`,
        } : undefined,
      },
    },
    scales: isCategorical ? undefined : {
      x: { stacked: !!config?.stacked, grid: { color: 'transparent' }, ticks: { color: textColor, font: { size: 10.5 } } },
      y: {
        stacked: !!config?.stacked,
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { size: 10.5 },
          callback: config?.yAxisFormatter ? (value: any) => config.yAxisFormatter!(Number(value)) : undefined,
        },
      },
    },
  };
}
