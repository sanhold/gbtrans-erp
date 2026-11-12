'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import PageHeader from '@/components/ui/PageHeader';

const MONTANT_MASQUE = '•••••••';

export default function ComptesClientsPage() {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(rows);

  useEffect(() => {
    financeApi.comptesClients.list().then(r => setRows(r.data.data || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const openReleve = async (clientId: string) => {
    setDetail({});
    setLoadingDetail(true);
    try {
      const res = await financeApi.comptesClients.get(clientId);
      setDetail(res.data.data);
    } catch { setDetail(null); toast.error('Erreur de chargement du relevé'); }
    finally { setLoadingDetail(false); }
  };

  const totalDu = rows.reduce((s, r) => s + Number(r.resteAPayer), 0);
  const totalFacture = rows.reduce((s, r) => s + Number(r.totalFacture), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Comptes Clients" subtitle="Solde de chaque client au titre des factures validées" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-600 dark:text-gray-300 uppercase">Total dû par les clients</p><p className="text-base font-bold text-red-600">{canSeeMontants ? `${fmt(totalDu)} F` : MONTANT_MASQUE}</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-600 dark:text-gray-300 uppercase">Total facturé (validé)</p><p className="text-base font-bold text-gray-900 dark:text-white">{canSeeMontants ? `${fmt(totalFacture)} F` : MONTANT_MASQUE}</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-600 dark:text-gray-300 uppercase">Clients</p><p className="text-base font-bold text-gray-900 dark:text-white">{rows.length}</p></div>
        </div>
        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              </colgroup>
            <thead><tr><th className="table-header !text-[10px] !px-1.5 truncate">Actions</th><th className="table-header !text-[10px] !px-1.5 truncate">Code</th><th className="table-header !text-[10px] !px-1.5 truncate">Client</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Total facturé</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Total payé</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Reste</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Factures</th></tr></thead>
            <tbody>
              {loading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun client facturé</td></tr>
              : paged.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell !px-1.5" data-label="Actions"><button onClick={() => openReleve(r.id)} className="text-xs px-2 py-2 text-primary-600 hover:underline">Relevé</button></td>
                  <td className="table-cell font-medium text-primary-600 !px-1.5 !text-[11px] truncate" data-label="Code">{r.code}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Client" title={r.raisonSociale}>{r.raisonSociale}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Total facturé">{canSeeMontants ? fmt(r.totalFacture) : MONTANT_MASQUE}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Total payé">{canSeeMontants ? fmt(r.totalPaye) : MONTANT_MASQUE}</td>
                  <td className={`table-cell text-right font-mono font-semibold !px-1.5 !text-[10.5px] truncate ${Number(r.resteAPayer) > 0 ? 'text-red-600' : 'text-green-600'}`} data-label="Reste à payer">{canSeeMontants ? fmt(r.resteAPayer) : MONTANT_MASQUE}</td>
                  <td className="table-cell text-right !px-1.5 !text-[10.5px] truncate" data-label="Factures">{Number(r.nombreFactures)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>

        <Sheet open={!!detail} onClose={() => setDetail(null)} title={`Relevé de compte — ${detail?.client?.raisonSociale || ''}`} size="2xl">
              <div className="space-y-4">
                {loadingDetail ? <p className="text-center text-gray-500 py-8">Chargement...</p> : (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Factures</h4>
                      <table className="w-full text-sm">
                        <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header text-right">TTC</th><th className="table-header text-right">Payé</th><th className="table-header text-right">Reste</th><th className="table-header">Statut</th></tr></thead>
                        <tbody>{(detail.factures || []).map((f: any) => (
                          <tr key={f.id} className="table-row">
                            <td className="table-cell" data-label="N°">{f.numero}</td>
                            <td className="table-cell text-xs" data-label="Date">{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</td>
                            <td className="table-cell text-right font-mono" data-label="TTC">{canSeeMontants ? fmt(f.montantTTC) : MONTANT_MASQUE}</td>
                            <td className="table-cell text-right font-mono" data-label="Payé">{canSeeMontants ? fmt(f.montantPaye) : MONTANT_MASQUE}</td>
                            <td className="table-cell text-right font-mono" data-label="Reste">{canSeeMontants ? fmt(f.resteAPayer) : MONTANT_MASQUE}</td>
                            <td className="table-cell" data-label="Statut"><span className="badge badge-info">{f.statut}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Paiements</h4>
                      <table className="w-full text-sm">
                        <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Facture(s)</th><th className="table-header text-right">Montant</th></tr></thead>
                        <tbody>{(detail.paiements || []).map((p: any) => (
                          <tr key={p.id} className="table-row">
                            <td className="table-cell" data-label="N°">{p.numero}</td>
                            <td className="table-cell text-xs" data-label="Date">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                            <td className="table-cell text-xs" data-label="Facture(s)">{(p.affectations || []).map((a: any) => a.facture?.numero).join(', ')}</td>
                            <td className="table-cell text-right font-mono" data-label="Montant">{canSeeMontants ? fmt(p.montant) : MONTANT_MASQUE}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4"><button type="button" onClick={() => setDetail(null)} className="btn-secondary min-h-[44px] w-full sm:w-auto">Fermer</button></div>
            
        </Sheet>
      </div>
    </AppLayout>
  );
}
