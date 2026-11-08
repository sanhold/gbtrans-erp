'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import PageHeader from '@/components/ui/PageHeader';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton';
import Indicateur, { fmtCourt } from '@/components/admin/Indicateur';
import { platformApi, platformAuth } from '@/lib/platformApi';

const fmt = (n: any) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0))} FCFA`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const JOURS = 24 * 60 * 60 * 1000;

const STATUT_BADGE: Record<string, string> = {
  ESSAI: 'badge-info', ACTIF: 'badge-success', IMPAYE: 'badge-warning',
  SUSPENDU: 'badge-danger', ANNULE: 'badge-gray', EXPIRE: 'badge-danger',
};
const STATUT_LABEL: Record<string, string> = {
  ESSAI: 'Essai', ACTIF: 'Actif', IMPAYE: 'Impayé', SUSPENDU: 'Suspendu', ANNULE: 'Annulé', EXPIRE: 'Expiré',
};
const STATUT_COULEUR: Record<string, string> = {
  ACTIF: 'bg-green-500', ESSAI: 'bg-primary-400', IMPAYE: 'bg-amber-500',
  SUSPENDU: 'bg-red-500', EXPIRE: 'bg-red-300', ANNULE: 'bg-gray-400',
};

export default function AdminDashboardPage() {
  const [societes, setSocietes] = useState<any[]>([]);
  const [tresorerie, setTresorerie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const admin = typeof window !== 'undefined' ? platformAuth.getAdmin() : null;

  const charger = () => {
    setLoading(true);
    setErreur(false);
    Promise.all([platformApi.societes(), platformApi.tresorerie()])
      .then(([s, t]) => { setSocietes(s.data.data || []); setTresorerie(t.data.data); })
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { charger(); }, []);

  const entete = (
    <PageHeader
      titre={`Bonjour${admin?.prenom ? ` ${admin.prenom}` : ''}`}
      sousTitre="Vue d'ensemble de la plateforme GBTrans"
      actions={<Link href="/admin/societes" className="btn-primary">Voir les sociétés</Link>}
    />
  );

  if (loading) {
    return (
      <AdminShell>
        {entete}
        <SkeletonCards count={4} className="mb-5" />
        <Skeleton className="h-24 mb-5" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </AdminShell>
    );
  }

  if (erreur) {
    return (
      <AdminShell>
        {entete}
        <div className="card"><ErrorState titre="Impossible de charger le tableau de bord" onRetry={charger} /></div>
      </AdminShell>
    );
  }

  const compteurs = Object.keys(STATUT_LABEL).reduce((acc, s) => ({ ...acc, [s]: societes.filter(so => so.abonnement?.statut === s).length }), {} as Record<string, number>);
  const sansAbonnement = societes.filter(so => !so.abonnement);
  const maintenant = Date.now();
  const essaisProches = societes.filter(so => so.abonnement?.statut === 'ESSAI' && so.abonnement.dateFinEssai
    && new Date(so.abonnement.dateFinEssai).getTime() - maintenant < 7 * JOURS);
  const societesRecentes = [...societes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const totalAvecAbo = societes.length - sansAbonnement.length;

  const alertes: { cle: string; titre: string; detail: string; href: string; ton: string }[] = [];
  if (compteurs.IMPAYE > 0) alertes.push({ cle: 'impaye', titre: `${compteurs.IMPAYE} société(s) en impayé`, detail: 'Relancez-les pour régulariser le paiement.', href: '/admin/societes', ton: 'amber' });
  if (compteurs.SUSPENDU + compteurs.EXPIRE > 0) alertes.push({ cle: 'suspendu', titre: `${compteurs.SUSPENDU + compteurs.EXPIRE} société(s) suspendue(s) ou expirée(s)`, detail: 'Leur accès à l\'application est restreint.', href: '/admin/societes', ton: 'red' });
  if (essaisProches.length > 0) alertes.push({ cle: 'essai', titre: `${essaisProches.length} essai(s) se terminent sous 7 jours`, detail: 'Contactez-les avant la fin pour proposer une formule.', href: '/admin/societes', ton: 'blue' });
  if (sansAbonnement.length > 0) alertes.push({ cle: 'sans', titre: `${sansAbonnement.length} société(s) sans abonnement`, detail: 'Aucune formule n\'est rattachée à ces sociétés.', href: '/admin/societes', ton: 'gray' });

  const TON: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200',
    red: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200',
    blue: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-500/10 dark:border-primary-500/30 dark:text-primary-100',
    gray: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-white/5 dark:border-white/10 dark:text-gray-200',
  };

  return (
    <AdminShell>
      {entete}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <Indicateur titre="Sociétés clientes" valeur={String(societes.length)} detail={`${compteurs.ACTIF} active(s) · ${compteurs.ESSAI} en essai`}
          couleur="bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200" href="/admin/societes"
          icone="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 10h.01M12 10h.01M15 10h.01" />
        <Indicateur titre="Encaissé au total" valeur={fmtCourt(tresorerie?.caTotalEncaisse)} infobulle={fmt(tresorerie?.caTotalEncaisse)} detail={`${tresorerie?.nbPaiementsReussis || 0} paiement(s) réussi(s)`}
          couleur="bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-300" href="/admin/tresorerie"
          icone="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V7m0 1v8m0 0v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <Indicateur titre="Revenu mensuel récurrent" valeur={fmtCourt(tresorerie?.mrr)} infobulle={fmt(tresorerie?.mrr)} detail="Estimation (MRR) des abonnements actifs"
          couleur="bg-accent-50 text-accent-600 dark:bg-accent-500/20 dark:text-accent-100" href="/admin/tresorerie"
          icone="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        <Indicateur titre="Impayés" valeur={String(compteurs.IMPAYE)} detail="société(s) à relancer"
          couleur="bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" href="/admin/societes"
          icone="M12 9v4m0 4h.01M10.29 3.86l-8.18 14A2 2 0 003.82 21h16.36a2 2 0 001.71-3.14l-8.18-14a2 2 0 00-3.42 0z" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 lg:items-start">
        <section className="card lg:col-span-2" aria-labelledby="repartition">
          <h2 id="repartition" className="font-bold text-gray-900 dark:text-white mb-3">Répartition des abonnements</h2>
          {totalAvecAbo === 0 ? (
            <p className="text-sm text-gray-500">Aucun abonnement pour le moment.</p>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10" role="img"
                aria-label={Object.keys(STATUT_LABEL).filter(s => compteurs[s]).map(s => `${STATUT_LABEL[s]} : ${compteurs[s]}`).join(', ')}>
                {Object.keys(STATUT_LABEL).filter(s => compteurs[s] > 0).map(s => (
                  <div key={s} className={STATUT_COULEUR[s]} style={{ width: `${(compteurs[s] / totalAvecAbo) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {Object.keys(STATUT_LABEL).map(s => (
                  <li key={s} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUT_COULEUR[s]}`} aria-hidden="true" />
                    {STATUT_LABEL[s]}
                    <span className="ml-auto font-semibold text-gray-900 dark:text-white">{compteurs[s] || 0}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="surveiller">
          <h2 id="surveiller" className="font-bold text-gray-900 dark:text-white mb-3">À surveiller</h2>
          {alertes.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Tout est en ordre.
            </div>
          ) : (
            <ul className="space-y-2">
              {alertes.map(a => (
                <li key={a.cle}>
                  <Link href={a.href} className={`block rounded-lg border px-3 py-2.5 ${TON[a.ton]} hover:opacity-90 transition-opacity`}>
                    <p className="text-sm font-semibold">{a.titre}</p>
                    <p className="text-xs opacity-80">{a.detail}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="card" aria-labelledby="recentes">
          <div className="flex items-center justify-between mb-3">
            <h2 id="recentes" className="font-bold text-gray-900 dark:text-white">Dernières sociétés inscrites</h2>
            <Link href="/admin/societes" className="text-sm text-primary-600 dark:text-primary-300 hover:underline">Voir tout</Link>
          </div>
          {societesRecentes.length === 0 ? (
            <EmptyState titre="Aucune société" description="Les sociétés qui s'inscrivent apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/10">
              {societesRecentes.map(s => (
                <li key={s.id}>
                  <Link href={`/admin/societes/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 -mx-2 px-2 rounded-lg transition-colors">
                    <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200 flex items-center justify-center text-sm font-bold flex-shrink-0">{s.raisonSociale?.[0]?.toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{s.raisonSociale}</span>
                      <span className="block text-xs text-gray-500">Inscrite le {fmtDate(s.createdAt)}</span>
                    </span>
                    {s.abonnement
                      ? <span className={`badge ${STATUT_BADGE[s.abonnement.statut]} !text-[10px]`}>{STATUT_LABEL[s.abonnement.statut]}</span>
                      : <span className="badge badge-gray !text-[10px]">Sans abonnement</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="paiements">
          <div className="flex items-center justify-between mb-3">
            <h2 id="paiements" className="font-bold text-gray-900 dark:text-white">Derniers paiements réussis</h2>
            <Link href="/admin/paiements" className="text-sm text-primary-600 dark:text-primary-300 hover:underline">Voir tout</Link>
          </div>
          {!tresorerie?.paiementsRecents?.length ? (
            <EmptyState titre="Aucun paiement" description="Les paiements d'abonnement réussis apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/10">
              {tresorerie.paiementsRecents.slice(0, 5).map((p: any) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-9 h-9 rounded-lg bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-300 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{p.societe?.raisonSociale}</span>
                    <span className="block text-xs text-gray-500">{p.abonnement?.plan?.nom} · {fmtDate(p.datePaiement)}</span>
                  </span>
                  <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{fmt(p.montant)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
