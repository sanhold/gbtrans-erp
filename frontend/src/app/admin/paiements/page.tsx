'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
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
    platformApi.paiements({ page, limit: 20, statut: statut || undefined })
      .then(r => { setData(r.data.data.data || []); setTotal(r.data.data.total || 0); setTotalPages(r.data.data.totalPages || 1); })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [page, statut]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Factures &amp; paiements d&apos;abonnement</h1>
            <p className="text-sm text-gray-500">{total} paiement(s), toutes sociétés confondues</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={statut} onChange={e => { setPage(1); setStatut(e.target.value); }} className="input-field !w-48 text-sm">
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
            </select>
            <button onClick={exporter} disabled={exporting} className="btn-secondary !text-sm disabled:opacity-50">{exporting ? 'Export...' : 'Exporter CSV'}</button>
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
                <tr><td colSpan={7} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun paiement</td></tr>
              ) : data.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell font-medium" data-label="Société">{p.societe?.raisonSociale}</td>
                  <td className="table-cell" data-label="Formule">{p.abonnement?.plan?.nom || '-'}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant">{fmtMontant(p.montant, p.devise)}</td>
                  <td className="table-cell text-xs" data-label="Moyen">{p.moyenPaiement || '-'}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[p.statut]} !text-[10px]`}>{STATUT_LABEL[p.statut]}</span></td>
                  <td className="table-cell text-xs" data-label="Date">{fmtDate(p.datePaiement || p.createdAt)}</td>
                  <td className="table-cell font-mono text-[11px] text-gray-400" data-label="Référence">{p.referenceExterne || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Précédent</button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Suivant</button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
