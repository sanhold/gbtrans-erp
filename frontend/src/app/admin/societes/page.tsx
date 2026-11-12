'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import { platformApi, platformAuth } from '@/lib/platformApi';
import { exportCSV } from '@/lib/exportCsv';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import EmptyRow from '@/components/tables/EmptyRow';

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
  const [filtreStatut, setFiltreStatut] = useState<string | null>(null);
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

  const relancer = async (societeId: string) => {
    setBusyId(societeId);
    try {
      const r = await platformApi.relancerSociete(societeId);
      const { email, raisonSociale } = r.data.data;
      const sujet = encodeURIComponent(`${raisonSociale} — régularisation de votre abonnement GBTRANS`);
      const corps = encodeURIComponent(`Bonjour,\n\nNous constatons un impayé sur l'abonnement GBTRANS ERP de ${raisonSociale}. Merci de régulariser votre paiement depuis votre espace pour continuer à profiter du service.\n\nCordialement,\nL'équipe GBTRANS`);
      window.open(`mailto:${email}?subject=${sujet}&body=${corps}`, '_blank');
      toast.success('Relance enregistrée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyId(null); }
  };

  const filtrees = societes.filter(s =>
    (!search || s.raisonSociale.toLowerCase().includes(search.toLowerCase()) || s.sousDomaine?.toLowerCase().includes(search.toLowerCase())) &&
    (!filtreStatut || s.abonnement?.statut === filtreStatut)
  );

  const compteurs = STATUTS.reduce((acc, s) => ({ ...acc, [s]: societes.filter(so => so.abonnement?.statut === s).length }), {} as Record<string, number>);

  const exporter = () => {
    exportCSV('societes_gbtrans', [
      { cle: 'raisonSociale', label: 'Société' },
      { cle: 'sousDomaine', label: 'Sous-domaine' },
      { cle: 'formule', label: 'Formule' },
      { cle: 'statut', label: 'Statut' },
      { cle: 'prochainPaiement', label: 'Prochain paiement' },
      { cle: 'utilisateurs', label: 'Utilisateurs' },
      { cle: 'dossiers', label: 'Dossiers' },
      { cle: 'inscrite', label: 'Inscrite le' },
    ], filtrees.map(s => ({
      raisonSociale: s.raisonSociale, sousDomaine: s.sousDomaine || '', formule: s.abonnement?.plan?.nom || '',
      statut: s.abonnement ? STATUT_LABEL[s.abonnement.statut] : '', prochainPaiement: fmtDate(s.abonnement?.dateProchainPaiement),
      utilisateurs: s._count?.utilisateurs ?? 0, dossiers: s._count?.dossiers ?? 0, inscrite: fmtDate(s.createdAt),
    })));
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        <PageHeader
          title="Sociétés clientes"
          subtitle={`${societes.length} société(s) inscrite(s)`}
          className="!mb-0"
          secondaryActions={[{ label: 'Exporter CSV', onClick: exporter }]}
        />
        <input type="search" inputMode="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." aria-label="Rechercher une société" className="input-field sm:max-w-xs" />

        <div className="flex gap-2 overflow-x-auto sm:flex-wrap -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtrer par statut">
          <button type="button" aria-pressed={!filtreStatut} onClick={() => setFiltreStatut(null)} className={`badge flex-shrink-0 min-h-[40px] px-3 ${!filtreStatut ? 'badge-gray !border-2 !border-gray-400' : 'badge-gray'} !text-xs`}>Tous : {societes.length}</button>
          {STATUTS.map(s => (
            <button key={s} type="button" aria-pressed={filtreStatut === s} onClick={() => setFiltreStatut(filtreStatut === s ? null : s)} className={`badge flex-shrink-0 min-h-[40px] px-3 ${STATUT_BADGE[s]} !text-xs ${filtreStatut === s ? '!ring-2 !ring-offset-1 !ring-primary-500' : ''}`}>
              {STATUT_LABEL[s]} : {compteurs[s] || 0}
            </button>
          ))}
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Actions</th>
              <th className="table-header">Société</th>
              <th className="table-header">Sous-domaine</th>
              <th className="table-header">Formule</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Prochain paiement</th>
              <th className="table-header text-center">Utilisateurs</th>
              <th className="table-header text-center">Dossiers</th>
              <th className="table-header">Inscrite le</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={9} />
              ) : filtrees.length === 0 ? (
                <EmptyRow colSpan={9} message="Aucune société" />
              ) : filtrees.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {s.abonnement && (
                        <select
                          aria-label={`Statut de l'abonnement de ${s.raisonSociale}`}
                          value={s.abonnement.statut}
                          disabled={busyId === s.id || !isSuperAdmin}
                          title={!isSuperAdmin ? 'Compte de démonstration : lecture seule' : undefined}
                          onChange={e => changerStatut(s.id, e.target.value)}
                          className="input-field !w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {STATUTS.map(st => <option key={st} value={st}>{STATUT_LABEL[st]}</option>)}
                        </select>
                      )}
                      {s.abonnement?.statut === 'IMPAYE' && (
                        <button type="button" onClick={() => relancer(s.id)} disabled={busyId === s.id} className="text-sm font-medium text-amber-700 hover:underline px-2 py-1.5 disabled:opacity-50">Relancer</button>
                      )}
                    </div>
                  </td>
                  <td className="table-cell font-medium" data-label="Société">
                    <Link href={`/admin/societes/${s.id}`} className="text-primary-600 hover:underline">{s.raisonSociale}</Link>
                  </td>
                  <td className="table-cell font-mono text-xs col-opt" data-label="Sous-domaine">{s.sousDomaine ? `${s.sousDomaine}.gbtrans.app` : '-'}</td>
                  <td className="table-cell" data-label="Formule">{s.abonnement?.plan?.nom || '-'}</td>
                  <td className="table-cell" data-label="Statut">
                    {s.abonnement ? <span className={`badge ${STATUT_BADGE[s.abonnement.statut]}`}>{STATUT_LABEL[s.abonnement.statut]}</span> : '-'}
                  </td>
                  <td className="table-cell text-xs" data-label="Prochain paiement">{fmtDate(s.abonnement?.dateProchainPaiement)}</td>
                  <td className="table-cell text-center" data-label="Utilisateurs">{s._count?.utilisateurs ?? 0}</td>
                  <td className="table-cell text-center" data-label="Dossiers">{s._count?.dossiers ?? 0}</td>
                  <td className="table-cell text-xs col-opt" data-label="Inscrite le">{fmtDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
