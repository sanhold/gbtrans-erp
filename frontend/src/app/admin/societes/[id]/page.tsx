'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { platformApi, platformAuth } from '@/lib/platformApi';
import toast from 'react-hot-toast';

const STATUT_BADGE: Record<string, string> = {
  ESSAI: 'badge-info', ACTIF: 'badge-success', IMPAYE: 'badge-warning',
  SUSPENDU: 'badge-danger', ANNULE: 'badge-gray', EXPIRE: 'badge-danger',
};
const STATUT_LABEL: Record<string, string> = {
  ESSAI: 'Essai', ACTIF: 'Actif', IMPAYE: 'Impayé', SUSPENDU: 'Suspendu', ANNULE: 'Annulé', EXPIRE: 'Expiré',
};
const STATUTS = Object.keys(STATUT_LABEL);
const PAIEMENT_LABEL: Record<string, string> = { EN_ATTENTE: 'En attente', REUSSI: 'Réussi', ECHEC: 'Échec', ANNULE: 'Annulé' };
const PAIEMENT_BADGE: Record<string, string> = { EN_ATTENTE: 'badge-info', REUSSI: 'badge-success', ECHEC: 'badge-danger', ANNULE: 'badge-gray' };

const fmt = (n: any) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0))} FCFA`;
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const fmtDateHeure = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export default function AdminSocieteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [societe, setSociete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { setIsSuperAdmin(!!platformAuth.getAdmin()?.superAdmin); }, []);

  const load = () => {
    setLoading(true);
    platformApi.societe(params.id as string)
      .then(r => setSociete(r.data.data))
      .catch(() => toast.error('Société introuvable'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const changerStatut = async (statut: string) => {
    setBusy(true);
    try {
      await platformApi.majAbonnement(params.id as string, { statut });
      toast.success('Statut mis à jour');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const prolongerEssai = async () => {
    setBusy(true);
    try {
      await platformApi.prolongerEssai(params.id as string, 7);
      toast.success('Essai prolongé de 7 jours');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const relancer = async () => {
    setBusy(true);
    try {
      const r = await platformApi.relancerSociete(params.id as string);
      const { email, raisonSociale } = r.data.data;
      const sujet = encodeURIComponent(`${raisonSociale} — régularisation de votre abonnement GBTRANS`);
      const corps = encodeURIComponent(`Bonjour,\n\nNous constatons un impayé sur l'abonnement GBTRANS ERP de ${raisonSociale}. Merci de régulariser votre paiement depuis votre espace pour continuer à profiter du service.\n\nCordialement,\nL'équipe GBTRANS`);
      window.open(`mailto:${email}?subject=${sujet}&body=${corps}`, '_blank');
      toast.success('Relance enregistrée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminShell><div className="text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div></AdminShell>;
  if (!societe) return <AdminShell><p className="text-gray-500">Société introuvable</p></AdminShell>;

  const abo = societe.abonnement;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/societes')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{societe.raisonSociale}</h1>
            <p className="text-sm text-gray-500">{societe.code} · Inscrite le {fmtDate(societe.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card lg:col-span-1 space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Informations</h3>
            <InfoLigne label="Email" valeur={societe.email} />
            <InfoLigne label="Téléphone" valeur={societe.telephone} />
            <InfoLigne label="Ville / Pays" valeur={[societe.ville, societe.pays].filter(Boolean).join(', ')} />
            <InfoLigne label="Sous-domaine" valeur={societe.sousDomaine ? `${societe.sousDomaine}.gbtrans.app` : '-'} />
            <InfoLigne label="Utilisateurs" valeur={String(societe._count?.utilisateurs ?? 0)} />
            <InfoLigne label="Dossiers" valeur={String(societe._count?.dossiers ?? 0)} />
          </div>

          <div className="card lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Abonnement</h3>
              {abo && <span className={`badge ${STATUT_BADGE[abo.statut]}`}>{STATUT_LABEL[abo.statut]}</span>}
            </div>
            {!abo ? (
              <p className="text-sm text-gray-500">Aucun abonnement</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <InfoLigne label="Formule" valeur={abo.plan?.nom} />
                  <InfoLigne label="Périodicité" valeur={abo.periodicite} />
                  <InfoLigne label="Fin d'essai" valeur={fmtDate(abo.dateFinEssai)} />
                  <InfoLigne label="Prochain paiement" valeur={fmtDate(abo.dateProchainPaiement)} />
                  <InfoLigne label="Prix mensuel" valeur={fmt(abo.plan?.prixMensuel)} />
                  <InfoLigne label="Prix annuel" valeur={abo.plan?.prixAnnuel ? fmt(abo.plan.prixAnnuel) : '-'} />
                </div>

                {isSuperAdmin && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-surface-700">
                    <select disabled={busy} value={abo.statut} onChange={e => changerStatut(e.target.value)} className="input-field !py-1.5 !text-sm !w-auto">
                      {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
                    </select>
                    <button onClick={prolongerEssai} disabled={busy} className="btn-secondary !text-sm disabled:opacity-50">Prolonger l&apos;essai (+7j)</button>
                    {abo.statut === 'IMPAYE' && (
                      <button onClick={relancer} disabled={busy} className="btn-secondary !text-sm !text-amber-600 disabled:opacity-50">Relancer par email</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Utilisateurs ({societe.utilisateurs?.length || 0})</h3>
          {!societe.utilisateurs?.length ? (
            <p className="text-sm text-gray-500">Aucun utilisateur</p>
          ) : (
            <div className="table-container !shadow-none !border-0">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">Nom</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Profil</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Dernière connexion</th>
                </tr></thead>
                <tbody>
                  {societe.utilisateurs.map((u: any) => (
                    <tr key={u.id} className="table-row">
                      <td className="table-cell font-medium" data-label="Nom">{u.prenom} {u.nom}</td>
                      <td className="table-cell text-xs" data-label="Email">{u.email}</td>
                      <td className="table-cell" data-label="Profil">{u.profil?.nom || '-'}</td>
                      <td className="table-cell" data-label="Statut"><span className={`badge ${u.actif ? 'badge-success' : 'badge-gray'} !text-[10px]`}>{u.actif ? 'Actif' : 'Désactivé'}</span></td>
                      <td className="table-cell text-xs" data-label="Dernière connexion">{fmtDateHeure(u.derniereConnexion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Historique des paiements ({societe.paiements?.length || 0})</h3>
          {!societe.paiements?.length ? (
            <p className="text-sm text-gray-500">Aucun paiement</p>
          ) : (
            <div className="table-container !shadow-none !border-0">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header text-right">Montant</th>
                  <th className="table-header">Moyen</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Date</th>
                </tr></thead>
                <tbody>
                  {societe.paiements.map((p: any) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell text-right font-mono" data-label="Montant">{fmt(p.montant)}</td>
                      <td className="table-cell text-xs" data-label="Moyen">{p.moyenPaiement || '-'}</td>
                      <td className="table-cell" data-label="Statut"><span className={`badge ${PAIEMENT_BADGE[p.statut]} !text-[10px]`}>{PAIEMENT_LABEL[p.statut]}</span></td>
                      <td className="table-cell text-xs" data-label="Date">{fmtDateHeure(p.datePaiement || p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function InfoLigne({ label, valeur }: { label: string; valeur?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white text-right">{valeur || '-'}</span>
    </div>
  );
}
