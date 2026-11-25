'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Discret, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
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
  const router = useRouter();
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

        <div className="card !p-3 space-y-3 mb-3 sm:mb-4">
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

        <ListeResponsive
          colonnes={[
            { cle: 'soc', libelle: 'Société', texte: (x: any) => x.raisonSociale, rendu: (x: any) => (
              <span className="block leading-tight">
                <Link href={`/admin/societes/${x.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-azure hover:underline">{x.raisonSociale}</Link>
                {x.sousDomaine && <span className="block font-mono text-[11px] text-gray-400">{x.sousDomaine}.gbtrans.app</span>}
              </span>
            ) },
            { cle: 'formule', libelle: 'Formule', texte: (x: any) => x.abonnement?.plan?.nom || '', rendu: (x: any) => <Discret>{x.abonnement?.plan?.nom || 'Aucune'}</Discret> },
            { cle: 'statut', libelle: 'Statut', texte: (x: any) => (x.abonnement ? STATUT_LABEL[x.abonnement.statut] : 'Sans abonnement'), rendu: (x: any) => <StatutPastille libelle={x.abonnement ? STATUT_LABEL[x.abonnement.statut] : 'Sans abonnement'} ton={x.abonnement ? tonDepuisBadge(STATUT_BADGE[x.abonnement.statut]) : 'gray'} /> },
            { cle: 'paiement', libelle: 'Prochain paiement', masquerSous: 'xl' as const, texte: (x: any) => fmtDate(x.abonnement?.dateProchainPaiement), rendu: (x: any) => <Discret>{fmtDate(x.abonnement?.dateProchainPaiement)}</Discret> },
            { cle: 'users', libelle: 'Utilisateurs', align: 'right' as const, texte: (x: any) => String(x._count?.utilisateurs ?? 0), rendu: (x: any) => <Discret>{x._count?.utilisateurs ?? 0}</Discret> },
            { cle: 'dossiers', libelle: 'Dossiers', align: 'right' as const, texte: (x: any) => String(x._count?.dossiers ?? 0), rendu: (x: any) => <Discret>{x._count?.dossiers ?? 0}</Discret> },
            { cle: 'inscrite', libelle: 'Inscrite le', masquerSous: '2xl' as const, texte: (x: any) => fmtDate(x.createdAt), rendu: (x: any) => <Discret>{fmtDate(x.createdAt)}</Discret> },
          ]}
          lignes={erreur ? [] : filtrees}
          cleLigne={(x: any) => x.id}
          chargement={loading}
          nomExport="societes"
          actions={(x: any) => (
            <>
              {x.abonnement && (
                <select
                  value={x.abonnement.statut}
                  disabled={busyId === x.id || !isSuperAdmin}
                  title={!isSuperAdmin ? 'Compte de démonstration : lecture seule' : 'Changer le statut de l\'abonnement'}
                  aria-label={`Statut de l'abonnement de ${x.raisonSociale}`}
                  onClick={e => e.stopPropagation()}
                  onChange={e => changerStatut(x.id, e.target.value)}
                  className="input-field !h-8 !w-auto !py-0 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {STATUTS.map(st => <option key={st} value={st}>{STATUT_LABEL[st]}</option>)}
                </select>
              )}
              {x.abonnement?.statut === 'IMPAYE' && (
                <button type="button" onClick={e => { e.stopPropagation(); relancer(x.id); }} disabled={busyId === x.id} className="inline-flex h-8 items-center rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">Relancer</button>
              )}
            </>
          )}
          carte={(x: any) => ({
            titre: x.raisonSociale,
            sousTitre: `${x.abonnement?.plan?.nom || 'Aucune formule'}${x.sousDomaine ? ` — ${x.sousDomaine}.gbtrans.app` : ''}`,
            statut: <StatutPastille libelle={x.abonnement ? STATUT_LABEL[x.abonnement.statut] : 'Sans abonnement'} ton={x.abonnement ? tonDepuisBadge(STATUT_BADGE[x.abonnement.statut]) : 'gray'} />,
            details: `${x._count?.utilisateurs ?? 0} utilisateur(s) — ${x._count?.dossiers ?? 0} dossier(s) — inscrite le ${fmtDate(x.createdAt)}`,
          })}
          onClic={(x: any) => router.push(`/admin/societes/${x.id}`)}
          vide={erreur ? <ErrorState titre="Impossible de charger les sociétés" onRetry={load} /> : (
            societes.length === 0
              ? <EmptyState titre="Aucune société pour le moment" description="Les sociétés qui s'inscrivent depuis le site apparaîtront ici." />
              : <EmptyState titre="Aucune société ne correspond" description="Modifiez la recherche ou retirez le filtre de statut." action={<button onClick={() => { setSearch(''); setFiltreStatut(null); }} className="btn-secondary">Effacer les filtres</button>} />
          )}
        />
      </div>
    </AdminShell>
  );
}
