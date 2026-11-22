'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeVoir } from '@/components/tables/BoutonIcone';
import { Numero, Tronque, Montant } from '@/components/tables/cellules';
import { financeApi } from '@/lib/api';
import { fmt } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

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
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Comptes clients"
          sousTitre="Solde de chaque client au titre des factures validées"
          icone="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8z"
          centre={
            <>
              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" /><b className="tabular-nums">{canSeeMontants ? fmt(totalDu) : MONTANT_MASQUE}</b><span className="text-gray-500">F dus par les clients</span></span>
              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-blue-600" /><b className="tabular-nums">{canSeeMontants ? fmt(totalFacture) : MONTANT_MASQUE}</b><span className="text-gray-500">F facturés</span></span>
              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-violet-600" /><b className="tabular-nums">{rows.length}</b><span className="text-gray-500">clients</span></span>
            </>
          }
        />
        <ListeResponsive
          colonnes={[
            { cle: 'code', libelle: 'Code', texte: (r: any) => r.code, rendu: (r: any) => <Numero>{r.code}</Numero> },
            { cle: 'nom', libelle: 'Client', texte: (r: any) => r.raisonSociale, rendu: (r: any) => <Tronque texte={r.raisonSociale} largeur="22rem" /> },
            { cle: 'facture', libelle: 'Total facturé', align: 'right' as const, texte: (r: any) => String(r.totalFacture), rendu: (r: any) => (canSeeMontants ? <Montant valeur={r.totalFacture} /> : MONTANT_MASQUE) },
            { cle: 'paye', libelle: 'Total payé', align: 'right' as const, masquerSous: 'xl' as const, texte: (r: any) => String(r.totalPaye), rendu: (r: any) => (canSeeMontants ? <Montant valeur={r.totalPaye} ton="positif" /> : MONTANT_MASQUE) },
            { cle: 'reste', libelle: 'Reste à payer', align: 'right' as const, texte: (r: any) => String(r.resteAPayer), rendu: (r: any) => (canSeeMontants ? <Montant valeur={r.resteAPayer} ton={Number(r.resteAPayer) > 0 ? 'negatif' : 'positif'} /> : MONTANT_MASQUE) },
            { cle: 'nb', libelle: 'Factures', align: 'right' as const, texte: (r: any) => String(Number(r.nombreFactures)), rendu: (r: any) => <span className="tabular-nums">{Number(r.nombreFactures)}</span> },
          ]}
          lignes={paged}
          cleLigne={(r: any) => r.id}
          chargement={loading}
          nomExport="comptes-clients"
          onClic={(r: any) => openReleve(r.id)}
          actions={(r: any) => <BoutonIcone titre="Relevé de compte" ton="primaire" onClick={() => openReleve(r.id)}><IconeVoir /></BoutonIcone>}
          carte={(r: any) => ({ titre: r.raisonSociale, sousTitre: r.code, droite: canSeeMontants ? <Montant valeur={r.resteAPayer} ton={Number(r.resteAPayer) > 0 ? 'negatif' : 'positif'} /> : MONTANT_MASQUE, details: `${Number(r.nombreFactures)} facture(s)` })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre="Aucun client facturé" description="Les comptes apparaissent dès qu'une facture est validée." />}
        />

        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700"><h3 className="font-bold text-lg">Relevé de compte — {detail.client?.raisonSociale || ''}</h3><button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
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
                            <td className="table-cell text-right font-mono" data-label="TTC">{canSeeMontants ? fmt(f.montantTTC) : MONTANT_MASQUE}</td>
                            <td className="table-cell text-right font-mono" data-label="Payé">{canSeeMontants ? fmt(f.montantPaye) : MONTANT_MASQUE}</td>
                            <td className="table-cell text-right font-mono" data-label="Reste">{canSeeMontants ? fmt(f.resteAPayer) : MONTANT_MASQUE}</td>
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
                            <td className="table-cell text-xs" data-label="Facture(s)">{(p.affectations || []).map((a: any) => a.facture?.numero).join(', ')}</td>
                            <td className="table-cell text-right font-mono" data-label="Montant">{canSeeMontants ? fmt(p.montant) : MONTANT_MASQUE}</td>
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
