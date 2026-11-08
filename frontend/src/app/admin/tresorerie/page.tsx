'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import Indicateur, { fmtCourt, fmtFcfa } from '@/components/admin/Indicateur';
import PageHeader from '@/components/ui/PageHeader';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton';
import { platformApi } from '@/lib/platformApi';

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function AdminTresoreriePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = () => {
    setLoading(true);
    setErreur(false);
    platformApi.tresorerie().then(r => setData(r.data.data)).catch(() => setErreur(true)).finally(() => setLoading(false));
  };
  useEffect(() => { charger(); }, []);

  const entete = <PageHeader titre="Trésorerie" sousTitre="Revenus des abonnements, toutes sociétés clientes confondues" />;

  if (loading) {
    return (
      <AdminShell>
        {entete}
        <SkeletonCards count={3} className="mb-5" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </AdminShell>
    );
  }

  if (erreur || !data) {
    return (
      <AdminShell>
        {entete}
        <div className="card"><ErrorState titre="Impossible de charger la trésorerie" onRetry={charger} /></div>
      </AdminShell>
    );
  }

  const repartition: { plan: string; nbAbonnements: number }[] = data.repartitionParPlan || [];
  const totalAbonnes = repartition.reduce((t, p) => t + p.nbAbonnements, 0);
  const paiements: any[] = data.paiementsRecents || [];

  return (
    <AdminShell>
      {entete}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        <Indicateur titre="Encaissé au total" valeur={fmtCourt(data.caTotalEncaisse)} infobulle={fmtFcfa(data.caTotalEncaisse)}
          detail={`${data.nbPaiementsReussis || 0} paiement(s) réussi(s)`} href="/admin/paiements"
          couleur="bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-300"
          icone="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V7m0 1v8m0 0v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <Indicateur titre="Revenu mensuel récurrent" valeur={fmtCourt(data.mrr)} infobulle={fmtFcfa(data.mrr)}
          detail="Abonnements actifs ramenés au mois (MRR)"
          couleur="bg-accent-50 text-accent-600 dark:bg-accent-500/20 dark:text-accent-100"
          icone="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        <Indicateur titre="Abonnements actifs" valeur={String(data.nbAbonnementsActifs ?? 0)}
          detail={`${data.nbEnEssai ?? 0} en essai · ${data.nbImpayes ?? 0} impayé(s)`} href="/admin/societes"
          couleur="bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200"
          icone="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="card lg:col-span-2" aria-labelledby="repartition-formules">
          <h2 id="repartition-formules" className="font-bold text-gray-900 dark:text-white mb-4">Abonnements par formule</h2>
          {repartition.length === 0 ? (
            <EmptyState titre="Aucun abonnement" description="La répartition apparaîtra avec les premiers abonnements." />
          ) : (
            <ul className="space-y-4">
              {repartition.map(p => {
                const pct = totalAbonnes > 0 ? Math.round((p.nbAbonnements / totalAbonnes) * 100) : 0;
                return (
                  <li key={p.plan}>
                    <div className="flex items-baseline justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{p.plan}</span>
                      <span className="text-gray-500 dark:text-gray-400"><span className="font-bold text-gray-900 dark:text-white">{p.nbAbonnements}</span> · {pct} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden" role="img" aria-label={`${p.plan} : ${p.nbAbonnements} abonnement(s), ${pct} %`}>
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-3" aria-labelledby="derniers-paiements">
          <div className="flex items-center justify-between mb-3">
            <h2 id="derniers-paiements" className="font-bold text-gray-900 dark:text-white">Derniers paiements réussis</h2>
            <a href="/admin/paiements" className="text-sm text-primary-600 dark:text-primary-300 hover:underline">Voir tout</a>
          </div>
          {paiements.length === 0 ? (
            <EmptyState titre="Aucun paiement" description="Les paiements d'abonnement réussis apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/10">
              {paiements.map((p: any) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-9 h-9 rounded-lg bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-300 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{p.societe?.raisonSociale}</span>
                    <span className="block text-xs text-gray-500">{p.abonnement?.plan?.nom || '-'} · {fmtDate(p.datePaiement)}</span>
                  </span>
                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtFcfa(p.montant)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
