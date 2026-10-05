'use client';

import { useEffect, useState } from 'react';
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

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function AdminSocietesPage() {
  const [societes, setSocietes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { setIsSuperAdmin(!!platformAuth.getAdmin()?.superAdmin); }, []);

  const load = () => {
    setLoading(true);
    platformApi.societes().then(r => setSocietes(r.data.data || [])).catch(() => toast.error('Erreur de chargement')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const changerStatut = async (societeId: string, statut: string) => {
    setBusyId(societeId);
    try {
      await platformApi.majAbonnement(societeId, { statut });
      toast.success('Statut mis à jour');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyId(null); }
  };

  const filtrees = societes.filter(s =>
    !search || s.raisonSociale.toLowerCase().includes(search.toLowerCase()) || s.sousDomaine?.toLowerCase().includes(search.toLowerCase())
  );

  const compteurs = STATUTS.reduce((acc, s) => ({ ...acc, [s]: societes.filter(so => so.abonnement?.statut === s).length }), {} as Record<string, number>);

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sociétés clientes</h1>
            <p className="text-sm text-gray-500">{societes.length} société(s) inscrite(s)</p>
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field !w-56 text-sm" />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUTS.map(s => (
            <span key={s} className={`badge ${STATUT_BADGE[s]} !text-[11px]`}>{STATUT_LABEL[s]} : {compteurs[s] || 0}</span>
          ))}
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Société</th>
              <th className="table-header">Sous-domaine</th>
              <th className="table-header">Formule</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Prochain paiement</th>
              <th className="table-header text-center">Utilisateurs</th>
              <th className="table-header text-center">Dossiers</th>
              <th className="table-header">Inscrite le</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : filtrees.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">Aucune société</td></tr>
              ) : filtrees.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell font-medium" data-label="Société">{s.raisonSociale}</td>
                  <td className="table-cell font-mono text-xs" data-label="Sous-domaine">{s.sousDomaine ? `${s.sousDomaine}.gbtrans.app` : '-'}</td>
                  <td className="table-cell" data-label="Formule">{s.abonnement?.plan?.nom || '-'}</td>
                  <td className="table-cell" data-label="Statut">
                    {s.abonnement ? <span className={`badge ${STATUT_BADGE[s.abonnement.statut]} !text-[10px]`}>{STATUT_LABEL[s.abonnement.statut]}</span> : '-'}
                  </td>
                  <td className="table-cell text-xs" data-label="Prochain paiement">{fmtDate(s.abonnement?.dateProchainPaiement)}</td>
                  <td className="table-cell text-center" data-label="Utilisateurs">{s._count?.utilisateurs ?? 0}</td>
                  <td className="table-cell text-center" data-label="Dossiers">{s._count?.dossiers ?? 0}</td>
                  <td className="table-cell text-xs" data-label="Inscrite le">{fmtDate(s.createdAt)}</td>
                  <td className="table-cell" data-label="Actions">
                    {s.abonnement && (
                      <select
                        value={s.abonnement.statut}
                        disabled={busyId === s.id || !isSuperAdmin}
                        title={!isSuperAdmin ? 'Compte de démonstration : lecture seule' : undefined}
                        onChange={e => changerStatut(s.id, e.target.value)}
                        className="input-field !py-1 !text-xs !w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {STATUTS.map(st => <option key={st} value={st}>{STATUT_LABEL[st]}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
