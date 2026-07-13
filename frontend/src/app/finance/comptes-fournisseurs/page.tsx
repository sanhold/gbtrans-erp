'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function ComptesFournisseursPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(rows);

  useEffect(() => {
    financeApi.comptesFournisseurs.list().then(r => setRows(r.data.data || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const openReleve = async (fournisseurId: string) => {
    setDetail({});
    setLoadingDetail(true);
    try {
      const res = await financeApi.comptesFournisseurs.get(fournisseurId);
      setDetail(res.data.data);
    } catch { setDetail(null); toast.error('Erreur de chargement du relevé'); }
    finally { setLoadingDetail(false); }
  };

  const totalDu = rows.reduce((s, r) => s + Number(r.resteAPayer), 0);
  const totalFacture = rows.reduce((s, r) => s + Number(r.totalFacture), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comptes Fournisseurs</h1><p className="text-sm text-gray-500">Solde de chaque fournisseur au titre des factures validées</p></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Total dû aux fournisseurs</p><p className="text-base font-bold text-amber-600">{fmt(totalDu)} F</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Total facturé (validé)</p><p className="text-base font-bold text-gray-900 dark:text-white">{fmt(totalFacture)} F</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Fournisseurs</p><p className="text-base font-bold text-gray-900 dark:text-white">{rows.length}</p></div>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Code</th><th className="table-header">Fournisseur</th><th className="table-header text-right">Total facturé</th><th className="table-header text-right">Total payé</th><th className="table-header text-right">Reste à payer</th><th className="table-header text-right">Factures</th><th className="table-header"></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun fournisseur facturé</td></tr>
              : paged.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="Code">{r.code}</td>
                  <td className="table-cell" data-label="Fournisseur">{r.raisonSociale}</td>
                  <td className="table-cell text-right font-mono" data-label="Total facturé">{fmt(r.totalFacture)}</td>
                  <td className="table-cell text-right font-mono" data-label="Total payé">{fmt(r.totalPaye)}</td>
                  <td className={`table-cell text-right font-mono font-semibold ${Number(r.resteAPayer) > 0 ? 'text-red-600' : 'text-green-600'}`} data-label="Reste à payer">{fmt(r.resteAPayer)}</td>
                  <td className="table-cell text-right" data-label="Factures">{Number(r.nombreFactures)}</td>
                  <td className="table-cell" data-label="Actions"><button onClick={() => openReleve(r.id)} className="text-xs text-primary-600 hover:underline">Relevé</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>

        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700"><h3 className="font-bold text-lg">Relevé de compte — {detail.fournisseur?.raisonSociale || ''}</h3><button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingDetail ? <p className="text-center text-gray-500 py-8">Chargement...</p> : (
                  <>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Factures</h4>
                      <table className="w-full text-sm">
                        <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header text-right">TTC</th><th className="table-header text-right">Payé</th><th className="table-header text-right">Reste</th><th className="table-header">Statut</th></tr></thead>
                        <tbody>{(detail.factures || []).map((f: any) => (
                          <tr key={f.id} className="table-row">
                            <td className="table-cell" data-label="N°">{f.numero}</td>
                            <td className="table-cell text-xs" data-label="Date">{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</td>
                            <td className="table-cell text-right font-mono" data-label="TTC">{fmt(f.montantTTC)}</td>
                            <td className="table-cell text-right font-mono" data-label="Payé">{fmt(f.montantPaye)}</td>
                            <td className="table-cell text-right font-mono" data-label="Reste">{fmt(f.resteAPayer)}</td>
                            <td className="table-cell" data-label="Statut"><span className="badge badge-info">{f.statut}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Paiements</h4>
                      <table className="w-full text-sm">
                        <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Facture(s)</th><th className="table-header text-right">Montant</th></tr></thead>
                        <tbody>{(detail.paiements || []).map((p: any) => (
                          <tr key={p.id} className="table-row">
                            <td className="table-cell" data-label="N°">{p.numero}</td>
                            <td className="table-cell text-xs" data-label="Date">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                            <td className="table-cell text-xs" data-label="Facture(s)">{(p.affectations || []).map((a: any) => a.factureFournisseur?.numero).join(', ')}</td>
                            <td className="table-cell text-right font-mono" data-label="Montant">{fmt(p.montant)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t flex justify-end"><button onClick={() => setDetail(null)} className="btn-primary">Fermer</button></div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
