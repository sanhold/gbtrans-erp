'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import PickerField from '@/components/ui/PickerField';
import { dossiersApi, clientsApi, facturesApi } from '@/lib/api';
import { fmt, STATUTS_DOSSIER } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function EtatFacturationDossierPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [statut, setStatut] = useState('');
  const [clientId, setClientId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    clientsApi.list({ limit: 200 }).then(r => setClients(r.data.data || [])).catch(() => setClients([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dossiersApi.bilan({ annee: annee || undefined, statut: statut || undefined, clientId: clientId || undefined, page, limit: pageSize });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [annee, statut, clientId, page, pageSize]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, pageSize]);

  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openDetail = async (dossierId: string) => {
    setDetail({});
    setLoadingDetail(true);
    try {
      const res = await dossiersApi.get(dossierId);
      const dossier = res.data.data;
      const factures = (dossier.factures || []).filter((f: any) => f.statut !== 'BROUILLON');
      const paiementsParFacture = await Promise.all(
        factures.map((f: any) => facturesApi.get(f.id).then(r => r.data.data.paiements || []).catch(() => []))
      );
      // Associe chaque paiement à sa facture d'origine pour l'affichage
      const paiementsAvecFacture: any[] = [];
      factures.forEach((f: any, idx: number) => {
        (paiementsParFacture[idx] || []).forEach((aff: any) => paiementsAvecFacture.push({ ...aff, factureNumero: f.numero }));
      });
      setDetail({ dossier, factures, depenses: dossier.depenses || [], paiements: paiementsAvecFacture });
    } catch { setDetail(null); toast.error('Erreur de chargement du détail du dossier'); }
    finally { setLoadingDetail(false); }
  };

  const handleDownloadPdf = async () => {
    if (!detail?.dossier) return;
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const { dossier, factures, depenses, paiements } = detail;

      const totalFactureTTC = factures.reduce((s: number, f: any) => s + Number(f.montantTTC || 0), 0);
      const totalPaye = factures.reduce((s: number, f: any) => s + Number(f.montantPaye || 0), 0);
      const totalReste = factures.reduce((s: number, f: any) => s + Number(f.resteAPayer || 0), 0);
      const totalDepenses = depenses.reduce((s: number, d: any) => s + Number(d.montant || 0), 0);

      const element = document.createElement('div');
      element.style.cssText = "width:210mm;padding:12mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;";
      element.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5d1590;padding-bottom:10px;margin-bottom:14px;">
          <div><div style="font-weight:800;font-size:16px;color:#5d1590;">GBTRANS SARL</div><div style="font-size:9px;color:#666;">Bureau de Transit &amp; Douane</div></div>
          <div style="text-align:right;"><div style="font-weight:800;font-size:14px;">ÉTAT DU DOSSIER</div><div style="font-size:10px;color:#666;">${dossier.numero}</div></div>
        </div>
        <table style="width:100%;font-size:10px;margin-bottom:14px;">
          <tr><td style="padding:2px 0;color:#666;width:120px;">Client</td><td style="font-weight:700;">${dossier.client?.raisonSociale || '-'}</td></tr>
          <tr><td style="padding:2px 0;color:#666;">Statut</td><td style="font-weight:700;">${dossier.statut}</td></tr>
          <tr><td style="padding:2px 0;color:#666;">Nature</td><td>${dossier.nature || '-'}</td></tr>
        </table>

        <div style="font-weight:800;font-size:11px;background:#f0e6fa;padding:5px 8px;margin-bottom:4px;">FACTURES (${factures.length})</div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:12px;">
          <thead><tr>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">N°</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Date</th>
            <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #ccc;">TTC</th>
            <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #ccc;">Payé</th>
            <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #ccc;">Reste</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Statut</th>
          </tr></thead>
          <tbody>
            ${factures.map((f: any) => `<tr>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${f.numero}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${f.dateFacture ? new Date(f.dateFacture).toLocaleDateString('fr-FR') : '-'}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;">${fmt(f.montantTTC)}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;">${fmt(f.montantPaye)}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;">${fmt(f.resteAPayer)}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${f.statut}</td>
            </tr>`).join('') || '<tr><td colspan="6" style="padding:6px;color:#999;">Aucune facture</td></tr>'}
            <tr><td colspan="2" style="padding:4px 6px;font-weight:800;text-align:right;">TOTAL</td>
              <td style="padding:4px 6px;font-weight:800;text-align:right;">${fmt(totalFactureTTC)}</td>
              <td style="padding:4px 6px;font-weight:800;text-align:right;">${fmt(totalPaye)}</td>
              <td style="padding:4px 6px;font-weight:800;text-align:right;">${fmt(totalReste)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight:800;font-size:11px;background:#f0e6fa;padding:5px 8px;margin-bottom:4px;">DÉPENSES (${depenses.length})</div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:12px;">
          <thead><tr>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">N°</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Date</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Catégorie</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Désignation</th>
            <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #ccc;">Montant</th>
          </tr></thead>
          <tbody>
            ${depenses.map((d: any) => `<tr>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${d.numero}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${d.dateDepense ? new Date(d.dateDepense).toLocaleDateString('fr-FR') : '-'}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${d.categorie}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${d.designation}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;">${fmt(d.montant)}</td>
            </tr>`).join('') || '<tr><td colspan="5" style="padding:6px;color:#999;">Aucune dépense</td></tr>'}
            <tr><td colspan="4" style="padding:4px 6px;font-weight:800;text-align:right;">TOTAL</td><td style="padding:4px 6px;font-weight:800;text-align:right;">${fmt(totalDepenses)}</td></tr>
          </tbody>
        </table>

        <div style="font-weight:800;font-size:11px;background:#f0e6fa;padding:5px 8px;margin-bottom:4px;">PAIEMENTS (${paiements.length})</div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
          <thead><tr>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">N°</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Date</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Facture</th>
            <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #ccc;">Montant</th>
          </tr></thead>
          <tbody>
            ${paiements.map((p: any) => `<tr>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${p.paiement?.numero || '-'}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${p.paiement?.datePaiement ? new Date(p.paiement.datePaiement).toLocaleDateString('fr-FR') : '-'}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;">${p.factureNumero || '-'}</td>
              <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;">${fmt(p.montant)}</td>
            </tr>`).join('') || '<tr><td colspan="4" style="padding:6px;color:#999;">Aucun paiement</td></tr>'}
          </tbody>
        </table>

        <div style="text-align:center;font-size:8px;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:16px;">
          Document généré le ${new Date().toLocaleDateString('fr-FR')} — GBTRANS SARL
        </div>
      `;
      document.body.appendChild(element);
      await html2pdf()
        .set({
          margin: 0,
          filename: `Etat_Dossier_${dossier.numero.replace(/\//g, '-')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
      document.body.removeChild(element);
    } catch { toast.error('Erreur lors de la génération du PDF'); }
    finally { setDownloading(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">État Facturation Dossier</h1><p className="text-sm text-gray-500">Vérifiez les dossiers facturés et non facturés — cliquez une ligne pour le détail</p></div>

        <div className="flex items-end flex-wrap gap-3">
          <div><label className="label !mb-1">Année</label><input type="number" value={annee} onChange={e => setAnnee(e.target.value)} className="input-field !w-28" /></div>
          <div>
            <label className="label !mb-1">Statut</label>
            <select value={statut} onChange={e => setStatut(e.target.value)} className="input-field !w-auto">
              <option value="">Tous</option>
              {STATUTS_DOSSIER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label !mb-1">Client</label>
            <PickerField value={clientId} onChange={setClientId} options={clientOptions} placeholder="Tous" title="Sélectionner un client" searchPlaceholder="Raison sociale..." className="!w-44" />
          </div>
          <button onClick={load} className="btn-secondary">Afficher</button>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">N° Dossier</th><th className="table-header">Statut</th>
              <th className="table-header text-right">Montant Proforma</th><th className="table-header text-right">Montant TVA</th>
              <th className="table-header text-right">Montant Prestation</th><th className="table-header text-right">Montant Payé</th>
              <th className="table-header text-right">Montant Restant</th><th className="table-header text-right">Montant Dépensé</th>
              <th className="table-header">Facturation</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-gray-500">Aucun dossier trouvé pour ces critères</td></tr>
              : rows.map((r: any) => {
                const facture = Number(r.montantTVA) > 0 || Number(r.montantPrestation) > 0;
                return (
                  <tr key={r.id} className="table-row cursor-pointer" onClick={() => openDetail(r.id)}>
                    <td className="table-cell font-medium text-primary-600" data-label="N° Dossier">{r.numero}</td>
                    <td className="table-cell" data-label="Statut"><span className="badge badge-info">{r.statut}</span></td>
                    <td className="table-cell text-right font-mono" data-label="Montant Proforma">{fmt(r.montantProforma)}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant TVA">{fmt(r.montantTVA)}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant Prestation">{fmt(r.montantPrestation)}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant Payé">{fmt(r.montantPaye)}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant Restant">{fmt(r.montantRestant)}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant Dépensé">{fmt(r.montantDepense)}</td>
                    <td className="table-cell" data-label="Facturation">{facture ? <span className="badge badge-success">Facturé</span> : <span className="badge badge-gray">Non facturé</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />
        </div>

        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
                <h3 className="font-bold text-lg">Dossier — {detail.dossier?.numero || ''}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={handleDownloadPdf} disabled={downloading || loadingDetail} className="btn-primary text-xs disabled:opacity-50">
                    {downloading ? 'Génération...' : 'Télécharger l’état PDF'}
                  </button>
                  <button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {loadingDetail ? <p className="text-center text-gray-500 py-8">Chargement...</p> : (
                  <>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">{detail.dossier?.client?.raisonSociale}</span> — <span className="badge badge-info">{detail.dossier?.statut}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Factures ({detail.factures?.length || 0})</h4>
                      <table className="w-full text-sm">
                        <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header text-right">TTC</th><th className="table-header text-right">Payé</th><th className="table-header text-right">Reste</th><th className="table-header">Statut</th></tr></thead>
                        <tbody>{(detail.factures || []).length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-gray-500">Aucune facture liée</td></tr> : detail.factures.map((f: any) => (
                          <tr key={f.id} className="table-row">
                            <td className="table-cell" data-label="N°">{f.numero}</td>
                            <td className="table-cell text-xs" data-label="Date">{f.dateFacture ? new Date(f.dateFacture).toLocaleDateString('fr-FR') : '-'}</td>
                            <td className="table-cell text-right font-mono" data-label="TTC">{fmt(f.montantTTC)}</td>
                            <td className="table-cell text-right font-mono text-green-600" data-label="Payé">{fmt(f.montantPaye)}</td>
                            <td className="table-cell text-right font-mono text-red-600" data-label="Reste">{fmt(f.resteAPayer)}</td>
                            <td className="table-cell" data-label="Statut"><span className="badge badge-info">{f.statut}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Dépenses ({detail.depenses?.length || 0})</h4>
                      <table className="w-full text-sm">
                        <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Catégorie</th><th className="table-header">Désignation</th><th className="table-header text-right">Montant</th></tr></thead>
                        <tbody>{(detail.depenses || []).length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-500">Aucune dépense liée</td></tr> : detail.depenses.map((d: any) => (
                          <tr key={d.id} className="table-row">
                            <td className="table-cell" data-label="N°">{d.numero}</td>
                            <td className="table-cell text-xs" data-label="Date">{d.dateDepense ? new Date(d.dateDepense).toLocaleDateString('fr-FR') : '-'}</td>
                            <td className="table-cell" data-label="Catégorie">{d.categorie}</td>
                            <td className="table-cell" data-label="Désignation">{d.designation}</td>
                            <td className="table-cell text-right font-mono" data-label="Montant">{fmt(d.montant)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Paiements ({detail.paiements?.length || 0})</h4>
                      <table className="w-full text-sm">
                        <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Facture</th><th className="table-header text-right">Montant</th></tr></thead>
                        <tbody>{(detail.paiements || []).length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-gray-500">Aucun paiement enregistré</td></tr> : detail.paiements.map((p: any, i: number) => (
                          <tr key={p.id || i} className="table-row">
                            <td className="table-cell" data-label="N°">{p.paiement?.numero || '-'}</td>
                            <td className="table-cell text-xs" data-label="Date">{p.paiement?.datePaiement ? new Date(p.paiement.datePaiement).toLocaleDateString('fr-FR') : '-'}</td>
                            <td className="table-cell font-mono text-xs text-primary-600" data-label="Facture">{p.factureNumero || '-'}</td>
                            <td className="table-cell text-right font-mono" data-label="Montant">{fmt(p.montant)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
