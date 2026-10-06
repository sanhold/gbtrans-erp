'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { platformApi, platformAuth } from '@/lib/platformApi';
import toast from 'react-hot-toast';

const fmt = (n: any) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0))} FCFA`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const STATUT_BADGE: Record<string, string> = {
  ESSAI: 'badge-info', ACTIF: 'badge-success', IMPAYE: 'badge-warning',
  SUSPENDU: 'badge-danger', ANNULE: 'badge-gray', EXPIRE: 'badge-danger',
};
const STATUT_LABEL: Record<string, string> = {
  ESSAI: 'Essai', ACTIF: 'Actif', IMPAYE: 'Impayé', SUSPENDU: 'Suspendu', ANNULE: 'Annulé', EXPIRE: 'Expiré',
};

export default function AdminDashboardPage() {
  const [societes, setSocietes] = useState<any[]>([]);
  const [tresorerie, setTresorerie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const admin = typeof window !== 'undefined' ? platformAuth.getAdmin() : null;

  useEffect(() => {
    Promise.all([platformApi.societes(), platformApi.tresorerie()])
      .then(([s, t]) => { setSocietes(s.data.data || []); setTresorerie(t.data.data); })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminShell><div className="text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div></AdminShell>;

  const compteurs = Object.keys(STATUT_LABEL).reduce((acc, s) => ({ ...acc, [s]: societes.filter(so => so.abonnement?.statut === s).length }), {} as Record<string, number>);
  const societesRecentes = [...societes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bonjour {admin?.prenom || ''} 👋</h1>
          <p className="text-sm text-gray-500">Vue d&apos;ensemble de la plateforme GBTRANS SaaS</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/societes" className="card hover:shadow-card-hover transition-shadow">
            <p className="text-xs text-gray-500 mb-1">Sociétés clientes</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{societes.length}</p>
            <p className="text-xs text-gray-400 mt-1">{compteurs.ACTIF} actif(s) · {compteurs.ESSAI} en essai</p>
          </Link>
          <Link href="/admin/tresorerie" className="card hover:shadow-card-hover transition-shadow">
            <p className="text-xs text-gray-500 mb-1">CA total encaissé</p>
            <p className="text-2xl font-extrabold text-primary-600">{fmt(tresorerie?.caTotalEncaisse)}</p>
            <p className="text-xs text-gray-400 mt-1">{tresorerie?.nbPaiementsReussis || 0} paiement(s) réussi(s)</p>
          </Link>
          <Link href="/admin/tresorerie" className="card hover:shadow-card-hover transition-shadow">
            <p className="text-xs text-gray-500 mb-1">Revenu mensuel récurrent</p>
            <p className="text-2xl font-extrabold text-accent-600">{fmt(tresorerie?.mrr)}</p>
            <p className="text-xs text-gray-400 mt-1">MRR estimé</p>
          </Link>
          <div className="card">
            <p className="text-xs text-gray-500 mb-1">À surveiller</p>
            <p className="text-2xl font-extrabold text-amber-600">{compteurs.IMPAYE}</p>
            <p className="text-xs text-gray-400 mt-1">société(s) impayée(s)</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(STATUT_LABEL).map(s => (
            <span key={s} className={`badge ${STATUT_BADGE[s]} !text-[11px]`}>{STATUT_LABEL[s]} : {compteurs[s] || 0}</span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Dernières sociétés inscrites</h3>
              <Link href="/admin/societes" className="text-xs text-primary-600 hover:underline">Voir tout</Link>
            </div>
            {societesRecentes.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune société</p>
            ) : (
              <div className="space-y-2.5">
                {societesRecentes.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{s.raisonSociale}</p>
                      <p className="text-xs text-gray-400">{fmtDate(s.createdAt)}</p>
                    </div>
                    {s.abonnement && <span className={`badge ${STATUT_BADGE[s.abonnement.statut]} !text-[10px]`}>{STATUT_LABEL[s.abonnement.statut]}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Derniers paiements réussis</h3>
              <Link href="/admin/paiements" className="text-xs text-primary-600 hover:underline">Voir tout</Link>
            </div>
            {!tresorerie?.paiementsRecents?.length ? (
              <p className="text-sm text-gray-500">Aucun paiement</p>
            ) : (
              <div className="space-y-2.5">
                {tresorerie.paiementsRecents.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{p.societe?.raisonSociale}</p>
                      <p className="text-xs text-gray-400">{p.abonnement?.plan?.nom} · {fmtDate(p.datePaiement)}</p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white">{fmt(p.montant)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
