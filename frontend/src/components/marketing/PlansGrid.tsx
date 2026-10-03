'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { saasApi } from '@/lib/api';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

export default function PlansGrid({
  selectedCode, onSelect, compact = false,
}: {
  selectedCode?: string;
  onSelect?: (code: string) => void;
  compact?: boolean;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodicite, setPeriodicite] = useState<'MENSUEL' | 'ANNUEL'>('MENSUEL');

  useEffect(() => {
    saasApi.plans().then(r => setPlans(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12"><div className="animate-spin w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
  }

  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-surface-800 rounded-full p-1">
          <button onClick={() => setPeriodicite('MENSUEL')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${periodicite === 'MENSUEL' ? 'bg-white dark:bg-surface-700 shadow text-primary-600' : 'text-gray-500'}`}>Mensuel</button>
          <button onClick={() => setPeriodicite('ANNUEL')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${periodicite === 'ANNUEL' ? 'bg-white dark:bg-surface-700 shadow text-primary-600' : 'text-gray-500'}`}>
            Annuel <span className="text-[10px] font-bold text-accent-600 bg-accent-50 dark:bg-accent-900/30 px-1.5 py-0.5 rounded-full">-17%</span>
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-3 gap-4' : 'md:grid-cols-3 gap-6'}`}>
        {plans.map(p => {
          const prix = periodicite === 'ANNUEL' ? Number(p.prixAnnuel ?? p.prixMensuel * 12) : Number(p.prixMensuel);
          const parMois = periodicite === 'ANNUEL' ? Math.round(prix / 12) : prix;
          const estSelectionne = selectedCode === p.code;
          return (
            <div
              key={p.code}
              onClick={() => onSelect?.(p.code)}
              className={`rounded-2xl p-6 bg-white dark:bg-surface-800 border-2 transition-all ${onSelect ? 'cursor-pointer' : ''} ${
                estSelectionne ? 'border-primary-500 shadow-elevated' : p.misEnAvant ? 'border-primary-200 dark:border-primary-800 shadow-card' : 'border-gray-200 dark:border-surface-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">{p.nom}</h3>
                {p.misEnAvant && <span className="badge badge-info !text-[10px]">Le plus choisi</span>}
              </div>
              <p className="text-sm text-gray-500 mb-4 min-h-[40px]">{p.description}</p>
              <div className="mb-1">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{fmt(parMois)}</span>
                <span className="text-sm font-medium text-gray-400"> FCFA / mois</span>
              </div>
              {periodicite === 'ANNUEL' && <p className="text-xs text-gray-400 mb-4">Facturé {fmt(prix)} FCFA / an</p>}
              {periodicite === 'MENSUEL' && <p className="text-xs text-gray-400 mb-4">Facturé mensuellement</p>}

              <ul className="space-y-2 mb-6">
                {(p.fonctionnalites || []).map((f: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                    <svg className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>

              {!onSelect && (
                <Link href={`/inscription?plan=${p.code}`} className={`block text-center w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${p.misEnAvant ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-surface-600'}`}>
                  Démarrer l&apos;essai gratuit
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
