'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Discret, Tronque, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import { platformApi } from '@/lib/platformApi';
import { exportCSV } from '@/lib/exportCsv';
import toast from 'react-hot-toast';

const STATUT_BADGE: Record<string, string> = {
  EN_ATTENTE: 'badge-info', REUSSI: 'badge-success', ECHEC: 'badge-danger', ANNULE: 'badge-gray',
};
const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: 'En attente', REUSSI: 'Réussi', ECHEC: 'Échec', ANNULE: 'Annulé',
};
const STATUTS = Object.keys(STATUT_LABEL);

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export default function AdminPaiementsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [statut, setStatut] = useState('');
  const [exporting, setExporting] = useState(false);

  const exporter = async () => {
    setExporting(true);
    try {
      const r = await platformApi.paiements({ page: 1, limit: 5000, statut: statut || undefined });
      const lignes = r.data.data.data || [];
      exportCSV('paiements_abonnements', [
        { cle: 'societe', label: 'Société' },
        { cle: 'formule', label: 'Formule' },
        { cle: 'montant', label: 'Montant' },
        { cle: 'devise', label: 'Devise' },
        { cle: 'moyen', label: 'Moyen de paiement' },
        { cle: 'statut', label: 'Statut' },
        { cle: 'date', label: 'Date' },
        { cle: 'reference', label: 'Référence' },
      ], lignes.map((p: any) => ({
        societe: p.societe?.raisonSociale || '', formule: p.abonnement?.plan?.nom || '', montant: p.montant, devise: p.devise,
        moyen: p.moyenPaiement || '', statut: STATUT_LABEL[p.statut], date: fmtDate(p.datePaiement || p.createdAt), reference: p.referenceExterne || '',
      })));
    } catch { toast.error('Erreur lors de l\'export'); }
    finally { setExporting(false); }
  };

  const load = () => {
    setLoading(true);
    setErreur(false);
    platformApi.paiements({ page, limit: 20, statut: statut || undefined })
      .then(r => { setData(r.data.data.data || []); setTotal(r.data.data.total || 0); setTotalPages(r.data.data.totalPages || 1); })
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [page, statut]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AdminShell>
      <div>
        <PageHeader
          titre="Factures et paiements"
          sousTitre={`${total} paiement${total > 1 ? 's' : ''} d'abonnement, toutes sociétés confondues`}
          actions={<button onClick={exporter} disabled={exporting || total === 0} className="btn-secondary">{exporting ? 'Export en cours…' : 'Exporter en CSV'}</button>}
        />

        <div className="card !p-3 mb-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
            <button onClick={() => { setPage(1); setStatut(''); }} aria-pressed={!statut} className={`badge badge-gray !text-[12px] !px-3 !py-1 ${!statut ? '!ring-2 !ring-primary-500' : ''}`}>Tous</button>
            {STATUTS.map(st => (
              <button key={st} onClick={() => { setPage(1); setStatut(statut === st ? '' : st); }} aria-pressed={statut === st}
                className={`badge ${STATUT_BADGE[st]} !text-[12px] !px-3 !py-1 ${statut === st ? '!ring-2 !ring-primary-500 !ring-offset-1' : ''}`}>
                {STATUT_LABEL[st]}
              </button>
            ))}
          </div>
        </div>

        <ListeResponsive
          colonnes={[
            { cle: 'soc', libelle: 'Société', texte: (p: any) => p.societe?.raisonSociale || '', rendu: (p: any) => <Tronque texte={p.societe?.raisonSociale} largeur="18rem" /> },
            { cle: 'formule', libelle: 'Formule', texte: (p: any) => p.abonnement?.plan?.nom || '', rendu: (p: any) => <Discret>{p.abonnement?.plan?.nom || '—'}</Discret> },
            { cle: 'montant', libelle: 'Montant', align: 'right' as const, texte: (p: any) => String(p.montant), rendu: (p: any) => <Montant valeur={p.montant} unite={p.devise || 'XOF'} /> },
            { cle: 'moyen', libelle: 'Moyen', masquerSous: 'xl' as const, texte: (p: any) => p.moyenPaiement || '', rendu: (p: any) => <Discret>{p.moyenPaiement || '—'}</Discret> },
            { cle: 'statut', libelle: 'Statut', texte: (p: any) => STATUT_LABEL[p.statut], rendu: (p: any) => <StatutPastille libelle={STATUT_LABEL[p.statut] || p.statut} ton={tonDepuisBadge(STATUT_BADGE[p.statut])} /> },
            { cle: 'date', libelle: 'Date', texte: (p: any) => fmtDate(p.datePaiement || p.createdAt), rendu: (p: any) => <Discret>{fmtDate(p.datePaiement || p.createdAt)}</Discret> },
            { cle: 'ref', libelle: 'Référence', masquerSous: '2xl' as const, texte: (p: any) => p.referenceExterne || '', rendu: (p: any) => <Discret>{p.referenceExterne || '—'}</Discret> },
          ]}
          lignes={erreur ? [] : data}
          cleLigne={(p: any) => p.id}
          chargement={loading}
          nomExport="paiements-abonnements"
          carte={(p: any) => ({ titre: p.societe?.raisonSociale || '—', sousTitre: `${p.abonnement?.plan?.nom || '—'} — ${p.moyenPaiement || ''}`, statut: <StatutPastille libelle={STATUT_LABEL[p.statut] || p.statut} ton={tonDepuisBadge(STATUT_BADGE[p.statut])} />, droite: <Montant valeur={p.montant} unite={p.devise || 'XOF'} />, details: fmtDate(p.datePaiement || p.createdAt) })}
          pagination={{ page, totalPages, total, pageSize: 20, onPageChange: setPage, onPageSizeChange: () => {} }}
          vide={erreur ? <ErrorState titre="Impossible de charger les paiements" onRetry={load} /> : (
            <EmptyState
              titre={statut ? 'Aucun paiement avec ce statut' : 'Aucun paiement pour le moment'}
              description={statut ? 'Choisissez un autre statut pour voir les autres paiements.' : "Les paiements d'abonnement des sociétés apparaîtront ici."}
              action={statut ? <button onClick={() => setStatut('')} className="btn-secondary">Voir tous les paiements</button> : undefined}
            />
          )}
        />
      </div>
    </AdminShell>
  );
}
