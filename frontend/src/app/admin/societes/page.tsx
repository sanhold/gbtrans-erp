'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { platformApi, platformAuth } from '@/lib/platformApi';
import { exportCSV } from '@/lib/exportCsv';
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
  const [erreur, setErreur] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { setIsSuperAdmin(!!platformAuth.getAdmin()?.superAdmin); }, []);

  const load = () => {
    setLoading(true);
    setErreur(false);
    platformApi.societes().then(r => setSocietes(r.data.data || [])).catch(() => setErreur(true)).finally(() => setLoading(false));
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
      <div>
        <PageHeader
          titre="Sociétés clientes"
          sousTitre={`${societes.length} société${societes.length > 1 ? 's' : ''} inscrite${societes.length > 1 ? 's' : ''}`}
          actions={<button onClick={exporter} disabled={filtrees.length === 0} className="btn-secondary">Exporter en CSV</button>}
        />

        <div className="card !p-3 space-y-3">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une société…"
            aria-label="Rechercher une société"
            className="input-field"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
            <button onClick={() => setFiltreStatut(null)} aria-pressed={!filtreStatut} className={`badge badge-gray !text-[12px] !px-3 !py-1 ${!filtreStatut ? '!ring-2 !ring-primary-500' : ''}`}>Toutes : {societes.length}</button>
            {STATUTS.filter(st => compteurs[st] > 0 || filtreStatut === st).map(st => (
              <button key={st} onClick={() => setFiltreStatut(filtreStatut === st ? null : st)} aria-pressed={filtreStatut === st}
                className={`badge ${STATUT_BADGE[st]} !text-[12px] !px-3 !py-1 ${filtreStatut === st ? '!ring-2 !ring-primary-500 !ring-offset-1' : ''}`}>
                {STATUT_LABEL[st]} : {compteurs[st] || 0}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Société</th>
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
                <SkeletonRows cols={8} />
              ) : erreur ? (
                <tr><td colSpan={8}><ErrorState titre="Impossible de charger les sociétés" onRetry={load} /></td></tr>
              ) : filtrees.length === 0 ? (
                <tr><td colSpan={8}>
                  {societes.length === 0
                    ? <EmptyState titre="Aucune société pour le moment" description="Les sociétés qui s'inscrivent depuis le site apparaîtront ici." />
                    : <EmptyState titre="Aucune société ne correspond" description="Modifiez la recherche ou retirez le filtre de statut."
                        action={<button onClick={() => { setSearch(''); setFiltreStatut(null); }} className="btn-secondary">Effacer les filtres</button>} />}
                </td></tr>
              ) : filtrees.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell cell-title font-medium" data-label="Société">
                    <Link href={`/admin/societes/${s.id}`} className="text-primary-600 hover:underline">{s.raisonSociale}</Link>
                    {s.sousDomaine && <span className="block font-mono text-[11px] font-normal text-gray-400">{s.sousDomaine}.gbtrans.app</span>}
                  </td>
                  <td className="table-cell" data-label="Formule">{s.abonnement?.plan?.nom || <span className="text-gray-400">Aucune</span>}</td>
                  <td className="table-cell" data-label="Statut">
                    {s.abonnement ? <span className={`badge ${STATUT_BADGE[s.abonnement.statut]} !text-[10px]`}>{STATUT_LABEL[s.abonnement.statut]}</span> : <span className="badge badge-gray !text-[10px]">Sans abonnement</span>}
                  </td>
                  <td className="table-cell col-opt text-xs" data-label="Prochain paiement">{fmtDate(s.abonnement?.dateProchainPaiement)}</td>
                  <td className="table-cell text-center" data-label="Utilisateurs">{s._count?.utilisateurs ?? 0}</td>
                  <td className="table-cell text-center" data-label="Dossiers">{s._count?.dossiers ?? 0}</td>
                  <td className="table-cell cell-normal text-xs" data-label="Inscrite le">{fmtDate(s.createdAt)}</td>
                  <td className="table-cell row-actions" data-label="Actions">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                      {s.abonnement?.statut === 'IMPAYE' && (
                        <button onClick={() => relancer(s.id)} disabled={busyId === s.id} className="text-xs text-amber-600 hover:underline disabled:opacity-50">Relancer</button>
                      )}
                    </div>
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
