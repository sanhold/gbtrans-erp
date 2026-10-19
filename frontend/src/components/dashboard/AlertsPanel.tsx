'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AlertItem { id: string; type: 'facture' | 'at' | 'caution'; titre: string; nom: string; reference: string }

export interface AlertesData {
  facturesEnRetard?: any[];
  atExpirationProche?: any[];
  cautionsCourrierEnAttente?: any[];
}

type Tab = 'toutes' | 'factures' | 'at';
const TABS: { key: Tab; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'factures', label: 'Factures' },
  { key: 'at', label: 'AT expirées' },
];

const TYPE_STYLE: Record<AlertItem['type'], { dot: string; text: string }> = {
  facture: { dot: 'bg-red-600', text: 'text-red-700 dark:text-red-400' },
  at: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  caution: { dot: 'bg-primary-500', text: 'text-primary-600 dark:text-primary-300' },
};

export function countAlertes(a?: AlertesData | null) {
  return (a?.facturesEnRetard?.length || 0) + (a?.atExpirationProche?.length || 0) + (a?.cautionsCourrierEnAttente?.length || 0);
}

export default function AlertsPanel({ alertes }: { alertes: AlertesData | null }) {
  const [tab, setTab] = useState<Tab>('toutes');

  const factures: AlertItem[] = (alertes?.facturesEnRetard || []).map((f) => ({
    id: `f-${f.id}`, type: 'facture', titre: 'Facture en retard', nom: f.client?.raisonSociale || '—', reference: f.numero,
  }));
  const ats: AlertItem[] = (alertes?.atExpirationProche || []).map((a) => ({
    id: `a-${a.id}`, type: 'at', titre: 'AT expire bientôt', nom: a.numero, reference: a.dateExpiration ? `Expire le ${new Date(a.dateExpiration).toLocaleDateString('fr-FR')}` : '',
  }));
  const cautions: AlertItem[] = (alertes?.cautionsCourrierEnAttente || []).map((c) => ({
    id: `c-${c.id}`, type: 'caution', titre: 'Courrier caution en attente', nom: `Caution N°${c.numero}`, reference: '',
  }));

  const total = factures.length + ats.length + cautions.length;
  const items = tab === 'factures' ? factures : tab === 'at' ? ats : [...factures, ...ats, ...cautions];
  const voirHref = tab === 'at' ? '/at' : '/facturation';

  return (
    <section className="card !p-0 flex flex-col overflow-hidden h-full" aria-labelledby="alertes-titre">
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 id="alertes-titre" className="text-[16px] font-bold text-gray-900 dark:text-white">Alertes</h3>
          {total > 0 && <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">{total}</span>}
        </div>
        <div role="group" aria-label="Filtrer les alertes" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`min-h-[44px] sm:min-h-[32px] px-3.5 rounded-full text-[12.5px] font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${tab === t.key ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 dark:border-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[340px] border-t border-gray-100 dark:border-surface-700 divide-y divide-gray-100 dark:divide-surface-700">
        {items.length === 0 && <li className="text-sm text-gray-400 text-center py-8">Aucune alerte</li>}
        {items.map((it) => (
          <li key={it.id} className="flex gap-3 px-4 sm:px-5 py-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${TYPE_STYLE[it.type].dot}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className={`text-[10.5px] font-bold uppercase tracking-wider ${TYPE_STYLE[it.type].text}`}>{it.titre}</p>
              <p className="text-[13.5px] font-bold text-gray-900 dark:text-white truncate">{it.nom}</p>
              {it.reference && <p className="text-[12px] text-gray-500 dark:text-gray-400">{it.reference}</p>}
            </div>
          </li>
        ))}
      </ul>

      <Link href={voirHref} className="flex items-center justify-center text-[13px] font-semibold text-primary-600 dark:text-primary-300 py-3 min-h-[44px] border-t border-gray-100 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500">
        Voir les {items.length} alertes
      </Link>
    </section>
  );
}
