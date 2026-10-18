/** Maquette du tableau de bord en HTML/CSS/SVG (aucune image). Données purement illustratives. */
const BARS = [38, 52, 44, 66, 58, 78, 70, 92];

const KPIS = [
  ['Dossiers en cours', '42', 'text-primary-600 dark:text-primary-300'],
  ['Facturé (mois)', '18,4 M', 'text-accent-600 dark:text-accent-500'],
  ['Cautions à échoir', '3', 'text-amber-600'],
];

const DOSSIERS = [
  ['DOS-2026-0142', 'Dédouané', 'bg-accent-100 text-accent-600'],
  ['DOS-2026-0143', 'En transit', 'bg-primary-100 text-primary-700'],
  ['DOS-2026-0144', 'Document manquant', 'bg-amber-100 text-amber-600'],
];

export default function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-4xl text-left" aria-hidden="true">
      <div className="absolute -inset-4 bg-gradient-to-tr from-primary-300/40 via-accent-500/20 to-amber-500/20 blur-3xl rounded-full" />
      <div className="relative rounded-2xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-elevated overflow-hidden motion-safe:animate-float">
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 dark:bg-surface-900 border-b border-gray-200 dark:border-surface-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-500" />
          <span className="ml-3 text-[10px] text-gray-500">gbtrans.com / tableau de bord</span>
        </div>
        <div className="flex">
          <div className="hidden sm:flex flex-col gap-2 w-40 p-3 bg-primary-600 text-primary-100 text-[11px]">
            <div className="font-bold text-white mb-2">GBTRANS</div>
            {['Tableau de bord', 'Dossiers', 'Facturation', 'Comptabilité', 'Cautions', 'Trésorerie', 'RH & paie'].map((l, i) => (
              <div key={l} className={`px-2 py-1.5 rounded ${i === 0 ? 'bg-white/15 text-white font-semibold' : ''}`}>{l}</div>
            ))}
          </div>
          <div className="flex-1 p-4 space-y-4 min-w-0">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {KPIS.map(([l, v, c]) => (
                <div key={l} className="rounded-lg border border-gray-200 dark:border-surface-700 p-2 sm:p-3">
                  <div className="text-[9px] sm:text-[10px] text-gray-500 truncate">{l}</div>
                  <div className={`text-base sm:text-xl font-extrabold font-display ${c}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-surface-700 p-3">
              <div className="text-[10px] text-gray-500 mb-2">Chiffre d&apos;affaires — 8 derniers mois</div>
              <svg viewBox="0 0 320 90" className="w-full h-24" preserveAspectRatio="none">
                {BARS.map((h, i) => (
                  <rect key={i} x={i * 40 + 8} y={90 - h} width="24" height={h} rx="2" className={i === BARS.length - 1 ? 'fill-accent-500' : 'fill-primary-300 dark:fill-primary-500'} />
                ))}
              </svg>
            </div>
            <div className="space-y-1.5">
              {DOSSIERS.map(([n, s, c]) => (
                <div key={n} className="flex items-center justify-between rounded border border-gray-100 dark:border-surface-700 px-3 py-1.5 text-[10px] sm:text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-200">{n}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${c}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
