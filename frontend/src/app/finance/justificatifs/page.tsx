'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { financeApi } from '@/lib/api';
import { fmt } from '@/lib/financeHelpers';

const VUES = [
  { id: 'A_VALIDER', label: 'À valider' },
  { id: 'OUVERTES', label: 'Dotations ouvertes' },
  { id: 'SOLDEES', label: 'Soldées' },
];
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

/** File d'attente de la trésorerie : une carte par dotation, qu'on ouvre pour cocher et valider les dépenses. */
export default function DotationsAValiderPage() {
  const [vue, setVue] = useState('A_VALIDER');
  const [dotations, setDotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErreur(false);
    financeApi.justificatifs.file(vue)
      .then(r => setDotations(r.data.data || []))
      .catch(() => { setDotations([]); setErreur(true); })
      .finally(() => setLoading(false));
  }, [vue]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Dotations à valider"
          sousTitre="Ouvrez une dotation pour vérifier les dépenses saisies, cocher celles à retenir et choisir les comptes de trésorerie."
        />

        <div className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-fit max-w-full overflow-x-auto">
          {VUES.map(v => (
            <button key={v.id} onClick={() => setVue(v.id)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${vue === v.id ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}>
              {v.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {[0, 1].map(i => <div key={i} className="card !p-0 animate-pulse h-40" />)}
          </div>
        ) : erreur ? (
          <div className="card"><ErrorState titre="Impossible de charger les dotations" onRetry={load} /></div>
        ) : dotations.length === 0 ? (
          <div className="card">
            <EmptyState
              titre={vue === 'A_VALIDER' ? 'Aucune dotation à valider' : vue === 'SOLDEES' ? 'Aucune dotation soldée' : 'Aucune dotation ouverte'}
              description={vue === 'A_VALIDER' ? 'Les dotations apparaissent ici dès qu\'un agent soumet son état de dépenses.' : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            {dotations.map(d => (
              <div key={d.id} className="card !p-0 overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-primary-600 text-white">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{d.numero} <span className="font-normal text-white/70">— {fmtDate(d.dateDotation)}</span></div>
                    <div className="text-xs text-white/75 truncate">{d.agent ? `${d.agent.prenom} ${d.agent.nom}` : ''}{d.motif ? ` · ${d.motif}` : ''}</div>
                  </div>
                  <Link href={`/finance/justificatifs/${d.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50">
                    {d.statut === 'SOLDEE' ? 'Consulter' : 'Ouvrir et valider'} →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-surface-700 text-center">
                  {[
                    { l: 'Montant dotation', v: d.montant, c: '' },
                    { l: 'Dépensé (validé)', v: d.montantUtilise, c: 'text-green-600' },
                    { l: `Soumis (${d.nbEnAttente})`, v: d.montantEnAttente, c: 'text-amber-600' },
                    { l: d.statut === 'SOLDEE' ? 'Reliquat retourné' : 'Reste', v: d.montantRestant, c: 'text-primary-600 dark:text-primary-300' },
                  ].map(k => (
                    <div key={k.l} className="bg-white dark:bg-surface-800 py-2.5">
                      <div className="text-[10px] uppercase text-gray-500">{k.l}</div>
                      <div className={`font-bold font-mono ${k.c}`}>{fmt(k.v)} F</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
