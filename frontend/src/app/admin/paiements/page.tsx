'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
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
const fmtMontant = (n: any, devise = 'XOF') => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n))} ${devise}`;

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

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Société</th>
              <th className="table-header">Formule</th>
              <th className="table-header text-right">Montant</th>
              <th className="table-header">Moyen</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Date</th>
              <th className="table-header">Référence</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} />
              ) : erreur ? (
                <tr><td colSpan={7}><ErrorState titre="Impossible de charger les paiements" onRetry={load} /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    titre={statut ? 'Aucun paiement avec ce statut' : 'Aucun paiement pour le moment'}
                    description={statut ? 'Choisissez un autre statut pour voir les autres paiements.' : "Les paiements d'abonnement des sociétés apparaîtront ici."}
                    action={statut ? <button onClick={() => setStatut('')} className="btn-secondary">Voir tous les paiements</button> : undefined}
                  />
                </td></tr>
              ) : data.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell cell-title font-medium" data-label="Société">{p.societe?.raisonSociale}</td>
                  <td className="table-cell" data-label="Formule">{p.abonnement?.plan?.nom || '-'}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant">{fmtMontant(p.montant, p.devise)}</td>
                  <td className="table-cell col-opt text-xs" data-label="Moyen">{p.moyenPaiement || '-'}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[p.statut]} !text-[10px]`}>{STATUT_LABEL[p.statut]}</span></td>
                  <td className="table-cell cell-normal text-xs" data-label="Date">{fmtDate(p.datePaiement || p.createdAt)}</td>
                  <td className="table-cell col-opt font-mono text-[11px] text-gray-400" data-label="Référence">{p.referenceExterne || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm">Précédent</button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm">Suivant</button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
