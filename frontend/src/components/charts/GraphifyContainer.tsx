'use client';

import GraphifyChart from './GraphifyChart';
import GraphifyLegend from './GraphifyLegend';
import GraphifyToolbar from './GraphifyToolbar';
import type { GraphifyChartType, GraphifyConfig, GraphifyData } from '@/types/graphify';

interface GraphifyContainerProps {
  title?: string;
  type: GraphifyChartType;
  data: GraphifyData | null;
  loading?: boolean;
  error?: string | null;
  config?: GraphifyConfig;
  onRefresh?: () => void;
  refreshing?: boolean;
  toolbarChildren?: React.ReactNode;
  showLegend?: boolean;
  className?: string;
}

function isEmpty(data: GraphifyData | null) {
  if (!data || data.series.length === 0) return true;
  return data.series.every(s => s.data.every(v => !v));
}

/** Carte prête à l'emploi : titre, toolbar, et gestion loading/empty/error/success. */
export default function GraphifyContainer({
  title, type, data, loading, error, config, onRefresh, refreshing, toolbarChildren, showLegend = true, className,
}: GraphifyContainerProps) {
  const isCategorical = type === 'pie' || type === 'doughnut';

  return (
    <div className={`card ${className || ''}`}>
      {(title || onRefresh || toolbarChildren) && (
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>}
          <GraphifyToolbar onRefresh={onRefresh} refreshing={refreshing}>{toolbarChildren}</GraphifyToolbar>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: config?.height ?? 280 }}>
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center text-center text-red-500 text-sm gap-1" style={{ height: config?.height ?? 280 }}>
          <svg className="w-6 h-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {error}
        </div>
      ) : isEmpty(data) ? (
        <div className="flex flex-col items-center justify-center text-center text-gray-400 text-sm gap-1" style={{ height: config?.height ?? 280 }}>
          <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 00-4-4H3m6 6h6m-6 0a4 4 0 004 4h2M9 5v2a4 4 0 004 4h2M9 5H7a4 4 0 00-4 4v2m6-6h2a4 4 0 014 4v2m0 6v-2a4 4 0 00-4-4h-2" /></svg>
          Aucune donnée disponible
        </div>
      ) : (
        <div className="space-y-3">
          <GraphifyChart type={type} data={data!} config={config} />
          {showLegend && !isCategorical && data!.series.length > 1 && <GraphifyLegend data={data!} />}
          {showLegend && isCategorical && <GraphifyLegend data={data!} byCategory />}
        </div>
      )}
    </div>
  );
}
