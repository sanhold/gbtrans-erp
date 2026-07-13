'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import api, { facturesApi } from '@/lib/api';
import { downloadPDF } from '@/lib/generatePDF';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';
import { montantEnLettres } from '@/lib/montantEnLettres';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  PARTIELLEMENT_PAYEE: 'badge-warning', PAYEE: 'badge-success',
  EN_RETARD: 'badge-danger', ANNULEE: 'badge-danger', CONTENTIEUX: 'badge-danger',
};
const CAT_COLORS: Record<string, string> = {
  'DOUANE & COMPAGNIE': '#059669', 'DOUANE': '#059669', 'FRAIS PORTUAIRES': '#0891B2',
  'AUTRES FRAIS': '#D97706', 'TRANSPORT': '#7C3AED',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function FacturationPage() {
  const [tab, setTab] = useState<'factures' | 'attente'>('factures');
  const [factures, setFactures] = useState<any[]>([]);
  const [proformasAttente, setProformasAttente] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedFacture, setSelectedFacture] = useState<any>(null);
  const [transforming, setTransforming] = useState<string | null>(null);

  const loadFactures = async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        facturesApi.list({ page, limit, search: search || undefined }),
        facturesApi.stats(),
      ]);
      setFactures(res.data.data);
      setTotal(res.data.pagination.total);
      setStats(statsRes.data.data);
    } catch { setFactures([]); }
    finally { setLoading(false); }
  };

  const loadProformasAttente = async () => {
    try {
      const res = await api.get('/proformas/en-attente');
      setProformasAttente(res.data.data || []);
    } catch { setProformasAttente([]); }
  };

  useEffect(() => { loadFactures(); loadProformasAttente(); }, [page, limit]);

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const handleTransformer = async (proformaId: string) => {
    setTransforming(proformaId);
    try {
      const res = await api.post(`/proformas/${proformaId}/transformer-facture`);
      toast.success(res.data.message);
      loadFactures();
      loadProformasAttente();
      setTab('factures');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setTransforming(null); }
  };

  const handlePrintFacture = (facture: any) => {
    if (!facture) return;
    const lignes = facture.lignes || [];
    const categories = [...new Set(lignes.map((l: any) => l.categorie))].filter(Boolean) as string[];

    let tableRows = '';
    for (const cat of categories) {
      const catLignes = lignes.filter((l: any) => l.categorie === cat);
      const sousTotal = catLignes.reduce((s: number, l: any) => s + Number(l.prixUnitaire || 0), 0);
      const color = CAT_COLORS[cat] || '#333';
      tableRows += `<tr><td colspan="2" style="color:${color};font-weight:bold;font-size:10px;padding:4px;">${cat}</td></tr>`;
      for (const l of catLignes) {
        tableRows += `<tr><td style="padding:2px 4px 2px 16px;font-size:10px;border-bottom:1px solid #eee;">${l.designation}</td>
          <td style="padding:2px 4px;font-size:10px;text-align:right;border-bottom:1px solid #eee;font-family:monospace;">${Number(l.prixUnitaire) > 0 ? fmt(l.prixUnitaire) : ''}</td></tr>`;
      }
      tableRows += `<tr><td style="text-align:right;font-size:9px;font-weight:bold;color:#555;padding:2px 4px;">TOTAL ${cat} :</td>
        <td style="text-align:right;font-weight:bold;font-size:10px;font-family:monospace;border-bottom:2px solid ${color};color:${color};padding:2px 4px;">${fmt(sousTotal)}</td></tr>`;
    }

    const totalHT = Number(facture.montantHT);
    const totalTVA = Number(facture.montantTVA);
    const totalTTC = Number(facture.montantTTC);
    const date = new Date(facture.dateFacture).toLocaleDateString('fr-FR');
    const clientNom = facture.client?.raisonSociale || '';
    const clientAdresse = facture.client?.adresse || '';
    const dossierRef = facture.dossier?.numero || '';
    const mPresta = facture.montantPrestation ? fmt(facture.montantPrestation) : '';
    const tvaPresta = facture.tvaPrestation ? fmt(facture.tvaPrestation) : '';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture ${facture.numero}</title>
<style>
  @page { size:A4; margin:10mm 12mm; }
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#1a1a1a; }
  .header { display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:6px;border-bottom:2px solid #c00;margin-bottom:8px; }
  .header .logo { display:flex;align-items:center;gap:8px; }
  .header .logo-circle { width:40px;height:40px;border:2px solid #c00;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;color:#c00; }
  .header h1 { font-size:16px;color:#00008B;border:2px solid #00008B;padding:3px 15px; }
  .header .ref { font-size:11px;color:#555;text-align:right;margin-top:2px; }
  .header .imp { font-size:7px;color:#aaa;text-align:right; }
  .info { display:flex;justify-content:space-between;margin-bottom:8px; }
  .info-left { border:1px solid #ccc;padding:6px 8px;border-radius:3px; }
  .info-left table td { padding:1px 0;font-size:10px; }
  .info-left table td:first-child { color:#555;font-weight:600;padding-right:10px; }
  .info-right { border:1px solid #ccc;padding:6px 8px;border-radius:3px;font-size:9px; }
  .info-right .name { font-weight:bold;font-size:11px;margin-bottom:3px; }
  .titre { background:#f0f0f0;padding:5px 8px;margin-bottom:8px;font-size:9px;font-weight:bold;border-left:3px solid #00008B; }
  table.main { width:100%;border-collapse:collapse;margin-bottom:6px; }
  table.main thead th { background:#00008B;color:white;padding:3px 4px;font-size:9px;text-align:left; }
  table.main thead th:last-child { text-align:right;width:110px; }
  .bottom { display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px; }
  .presta-box { border:1px solid #ccc;padding:4px 8px;border-radius:3px;font-size:9px; }
  .presta-box td { padding:1px 4px; }
  .presta-box td:last-child { text-align:right;font-family:monospace;font-weight:bold; }
  .totaux { text-align:right;font-size:9px; }
  .totaux td { padding:1px 6px; }
  .totaux .ht { color:#00008B;font-weight:bold; }
  .totaux .tva { color:#c00;font-weight:bold;font-size:10px; }
  .totaux .ttc { color:#c00;font-weight:bold;font-size:12px;border:2px solid #c00;padding:2px 8px; }
  .lettres { padding:5px 8px;border:1px solid #ddd;border-radius:3px;font-size:9px;margin-top:8px; }
  .lettres .i { color:#555;font-style:italic; } .lettres .t { font-weight:bold;margin-top:2px; }
  .footer { text-align:center;font-size:7px;color:#999;padding-top:4px;border-top:1px solid #ddd;margin-top:8px;line-height:1.3; }
  .footer b { color:#555; }
  @media print { body { -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important; } }
</style></head><body>

<div class="header">
  <div class="logo"><div class="logo-circle">GB</div><div><div style="font-weight:bold;font-size:12px;">GBTRANS SARL</div><div style="font-size:7px;color:#666;">Bureau de Transit & Douane</div></div></div>
  <div style="text-align:right;"><h1>FACTURE</h1><div class="ref">${dossierRef}</div><div class="imp">Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div></div>
</div>

<div class="info">
  <div class="info-left"><table>
    <tr><td>Date :</td><td>${date}</td></tr>
    <tr><td>N° FACTURE :</td><td style="font-weight:bold;font-family:monospace;color:#00008B;">${facture.numero}</td></tr>
    <tr><td>Client :</td><td style="font-weight:bold;">${clientNom}</td></tr>
  </table></div>
  <div class="info-right">
    <div class="name">${clientNom}</div>
    <div>${clientAdresse}</div>
    ${facture.client?.ncc ? `<div>Nc : ${facture.client.ncc}</div>` : ''}
  </div>
</div>

${facture.titre ? `<div class="titre">${facture.titre}</div>` : ''}

<table class="main"><thead><tr><th>DÉSIGNATION</th><th>MONTANTS</th></tr></thead><tbody>${tableRows}</tbody></table>

<div class="bottom">
  <table class="presta-box">
    ${mPresta ? `<tr><td>Montant Prestation</td><td>${mPresta}</td></tr>` : ''}
    ${tvaPresta ? `<tr><td>TVA/Prestation (HU)</td><td>${tvaPresta}</td></tr>` : ''}
  </table>
  <table class="totaux">
    <tr><td>TOTAL FACTURE HT :</td><td class="ht">${fmt(totalHT)}</td></tr>
    <tr><td>TOTAL TVA :</td><td class="tva">${fmt(totalTVA)}</td></tr>
    <tr><td>TOTAL FACTURE TTC :</td><td class="ttc">${fmt(totalTTC)}</td></tr>
  </table>
</div>

<div class="lettres">
  <div class="i">Arrêtée la présente facture à la somme de :</div>
  <div class="t">${montantEnLettres(totalTTC)}</div>
</div>

<div class="footer"><b>GBTRANS SARL - Bureau de Transit et Douane</b><br/>
Siège social au 01 BP 0000 ABIDJAN 01 - Abidjan, Côte d'Ivoire - Tel/Fax : +225 27 20 00 00 00<br/>
RCCM: CI-ABJ-2024-B-00000 - NCC: CI-2024-0000000 - Régime fiscal : Réel Normal -
Banque: BICICI - IBAN: CI93 0000 0000 0000 0000 0000 000</div>

</body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const openFactureDetail = (id: string) => {
    window.location.href = `/facturation/${id}`;
  };

  const handleDownloadFacturePDF = async (id: string) => {
    try {
      const res = await facturesApi.get(id);
      const f = res.data.data;
      downloadPDF({
        type: 'FACTURE', numero: f.numero,
        date: new Date(f.dateFacture).toLocaleDateString('fr-FR'),
        client: f.client?.raisonSociale || '', dossierNumero: f.dossier?.numero, titre: f.titre,
        montantHT: Number(f.montantHT), montantTVA: Number(f.montantTVA), montantTTC: Number(f.montantTTC),
        montantPrestation: f.montantPrestation ? Number(f.montantPrestation) : undefined,
        tvaPrestation: f.tvaPrestation ? Number(f.tvaPrestation) : undefined,
        lignes: (f.lignes || []).map((l: any) => ({ categorie: l.categorie || '', designation: l.designation, montant: Number(l.prixUnitaire || 0), estTVA: l.estTVA })),
      });
      toast.success('PDF téléchargé');
    } catch { toast.error('Erreur téléchargement'); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facturation</h1>
            <p className="text-sm text-gray-500">{total} facture(s) — {proformasAttente.length} proforma(s) en attente</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">Facturé</p><p className="text-sm font-bold">{fmt(Number(stats.totalFacture))} F</p></div></div>
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">Encaissé</p><p className="text-sm font-bold text-green-600">{fmt(Number(stats.totalEncaisse))} F</p></div></div>
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">Impayé</p><p className="text-sm font-bold text-red-600">{fmt(Number(stats.totalImpaye))} F</p></div></div>
            <div className="stat-card !p-4"><div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-[10px] text-gray-500 uppercase">En attente</p><p className="text-sm font-bold text-amber-600">{proformasAttente.length} proformas</p></div></div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-fit">
          <button onClick={() => setTab('factures')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'factures' ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600'}`}>
            Factures ({total})
          </button>
          <button onClick={() => setTab('attente')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'attente' ? 'bg-white dark:bg-surface-800 shadow text-amber-600' : 'text-gray-600'}`}>
            En attente de facturation ({proformasAttente.length})
          </button>
        </div>

        {/* Tab Factures */}
        {tab === 'factures' && (
          <div className="table-container">
            <table className="w-full">
              <thead><tr>
                <th className="table-header">N° Facture</th><th className="table-header">Client</th>
                <th className="table-header">Dossier</th><th className="table-header">Proforma</th>
                <th className="table-header text-right">Total TTC</th><th className="table-header text-right">Payé</th>
                <th className="table-header text-right">Reste</th><th className="table-header">Statut</th>
                <th className="table-header">Date</th><th className="table-header">Actions</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={10} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"/>Chargement...</td></tr>
                : factures.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-gray-500">Aucune facture</td></tr>
                : factures.map(f => (
                  <tr key={f.id} className="table-row">
                    <td className="table-cell font-medium text-primary-600 cursor-pointer" onClick={() => openFactureDetail(f.id)} data-label="N° Facture">{f.numero}</td>
                    <td className="table-cell" data-label="Client">{f.client?.raisonSociale}</td>
                    <td className="table-cell font-mono text-xs" data-label="Dossier">{f.dossier?.numero || '-'}</td>
                    <td className="table-cell font-mono text-xs" data-label="Proforma">{f.proformaSourceId ? '✓' : '-'}</td>
                    <td className="table-cell text-right font-mono font-bold" data-label="Total TTC">{fmt(f.montantTTC)}</td>
                    <td className="table-cell text-right font-mono text-green-600" data-label="Payé">{fmt(f.montantPaye)}</td>
                    <td className="table-cell text-right font-mono text-red-600" data-label="Reste">{fmt(f.resteAPayer)}</td>
                    <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[f.statut] || 'badge-gray'}`}>{f.statut?.replace(/_/g, ' ')}</span></td>
                    <td className="table-cell text-xs" data-label="Date">{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</td>
                    <td className="table-cell" data-label="Actions">
                      <div className="flex gap-1">
                        <button onClick={() => openFactureDetail(f.id)} className="p-1 rounded hover:bg-gray-100" title="Voir">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleDownloadFacturePDF(f.id)} className="p-1 rounded hover:bg-gray-100" title="Télécharger PDF">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
          </div>
        )}

        {/* Tab Proformas en attente */}
        {tab === 'attente' && (
          <div className="space-y-3">
            {proformasAttente.length === 0 ? (
              <div className="card text-center py-8 text-gray-500">Aucune proforma en attente de facturation. Validez une proforma pour qu&apos;elle apparaisse ici.</div>
            ) : proformasAttente.map(p => (
              <div key={p.id} className="card !p-4 flex items-center justify-between hover:shadow-elevated transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold font-mono text-primary-600">{p.numero}</span>
                    <span className="badge badge-warning">En attente</span>
                    {p.dossier && <span className="text-xs text-gray-500">Dossier: {p.dossier.numero}</span>}
                  </div>
                  <p className="text-sm">{p.client?.raisonSociale}</p>
                  {p.titre && <p className="text-xs text-gray-500 mt-0.5">{p.titre}</p>}
                  <p className="text-sm font-bold mt-1">{fmt(Number(p.montantTTC))} F CFA — {p.lignes?.length || 0} ligne(s)</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/proformas/${p.id}`} className="btn-secondary text-xs">Voir</Link>
                  <button onClick={() => handleTransformer(p.id)} disabled={transforming === p.id} className="btn-primary text-xs disabled:opacity-50">
                    {transforming === p.id ? 'Transformation...' : 'Facturer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal détail facture */}
        {selectedFacture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              {/* Header vert */}
              <div className="bg-emerald-600 p-4 rounded-t-xl flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Fiche Facture</h2>
                  <p className="text-emerald-100 text-sm">{selectedFacture.numero}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePrintFacture(selectedFacture)} className="px-3 py-1.5 bg-white text-emerald-700 rounded text-xs font-semibold hover:bg-emerald-50">Imprimer</button>
                  <button onClick={() => setSelectedFacture(null)} className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600">Fermer</button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Infos facture */}
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-500 text-xs block">N° FACTURE</span><span className="font-bold font-mono">{selectedFacture.numero}</span></div>
                  <div><span className="text-gray-500 text-xs block">N° Proforma</span><span className="font-mono">{selectedFacture.proformaSourceId ? 'Lié' : '-'}</span></div>
                  <div><span className="text-gray-500 text-xs block">N° Dossier</span><span className="font-mono">{selectedFacture.dossier?.numero || '-'}</span></div>
                  <div><span className="text-gray-500 text-xs block">Date</span><span>{new Date(selectedFacture.dateFacture).toLocaleDateString('fr-FR')}</span></div>
                </div>
                <div><span className="text-gray-500 text-xs block">Client</span><span className="font-bold">{selectedFacture.client?.raisonSociale}</span></div>
                {selectedFacture.titre && (
                  <div className="bg-gray-50 dark:bg-surface-700 border-l-3 border-primary-500 p-3 text-sm font-bold">{selectedFacture.titre}</div>
                )}

                {/* Lignes groupées */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[40px_40px_1fr_100px_36px] bg-emerald-600 text-white text-[10px] font-semibold">
                    <div className="px-2 py-2">Act.</div><div className="px-1 py-2">N°</div>
                    <div className="px-2 py-2">Désignation</div><div className="px-2 py-2 text-right">Montant</div>
                    <div className="px-1 py-2 text-center">TVA</div>
                  </div>
                  {(() => {
                    const lignes = selectedFacture.lignes || [];
                    const cats = [...new Set(lignes.map((l: any) => l.categorie))].filter(Boolean) as string[];
                    let idx = 0;
                    return cats.map(cat => {
                      const catLignes = lignes.filter((l: any) => l.categorie === cat);
                      const sousTotal = catLignes.reduce((s: number, l: any) => s + Number(l.prixUnitaire || 0), 0);
                      const color = CAT_COLORS[cat] || '#333';
                      return (
                        <div key={cat}>
                          <div className="grid grid-cols-[40px_40px_1fr_100px_36px] text-xs font-bold" style={{ backgroundColor: color + '12', color }}>
                            <div className="px-2 py-1">—</div><div></div>
                            <div className="px-2 py-1">{cat}</div>
                            <div className="px-2 py-1 text-right">Sous Total : {fmt(sousTotal)}</div><div></div>
                          </div>
                          {catLignes.map((l: any) => { idx++; return (
                            <div key={l.id} className="grid grid-cols-[40px_40px_1fr_100px_36px] border-t border-gray-100 text-sm hover:bg-gray-50">
                              <div className="px-2 py-1"><span className="w-5 h-5 rounded bg-amber-500 text-white text-[9px] flex items-center justify-center">✎</span></div>
                              <div className="px-1 py-1 text-gray-400 text-xs text-center">{idx}</div>
                              <div className="px-2 py-1 text-xs">{l.designation}</div>
                              <div className="px-2 py-1 text-right font-mono text-xs font-bold">{fmt(l.prixUnitaire)}</div>
                              <div className="px-1 py-1 flex items-center justify-center text-gray-400">
                                {l.estTVA ? (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-6" /></svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
                                )}
                              </div>
                            </div>
                          ); })}
                        </div>
                      );
                    });
                  })()}
                  <div className="grid grid-cols-[40px_40px_1fr_100px_36px] border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                    <div></div><div></div><div className="px-2 py-2 text-right">Somme</div>
                    <div className="px-2 py-2 text-right font-mono">{fmt(selectedFacture.montantTTC)}</div><div></div>
                  </div>
                </div>

                {/* Footer facture */}
                <div className="flex justify-between items-end">
                  <div className="flex gap-4">
                    <div><p className="text-[10px] font-bold text-gray-500">Acompte</p><div className="px-3 py-1 border border-gray-200 rounded font-mono text-sm">{fmt(selectedFacture.acompte)}</div></div>
                    <div><p className="text-[10px] font-bold text-gray-500">Reste à payé</p><div className="px-3 py-1 border border-gray-200 rounded font-mono text-sm font-bold text-red-600">{fmt(selectedFacture.resteAPayer)}</div></div>
                  </div>
                  <div className="flex gap-3 items-end">
                    {selectedFacture.montantPrestation && <div className="text-center"><p className="text-[9px] text-gray-500">Montant Prestation</p><div className="px-3 py-1 border rounded font-mono text-xs">{fmt(selectedFacture.montantPrestation)}</div></div>}
                    {selectedFacture.tvaPrestation && <div className="text-center"><p className="text-[9px] text-gray-500">TVA/Prestation</p><div className="px-3 py-1 border rounded font-mono text-xs">{fmt(selectedFacture.tvaPrestation)}</div></div>}
                    <div className="text-center"><p className="text-[9px] text-gray-500">TOTAL FACTURE HT</p><div className="px-3 py-1 border rounded font-mono text-xs font-bold">{fmt(selectedFacture.montantHT)}</div></div>
                    <div className="text-center"><p className="text-[9px] text-red-500 font-bold">TOTAL TVA</p><div className="px-3 py-1 border border-red-300 rounded font-mono text-xs font-bold text-red-600">{fmt(selectedFacture.montantTVA)}</div></div>
                    <div className="text-center"><p className="text-[9px] text-red-600 font-bold">TOTAL FACTURE TTC</p><div className="px-3 py-1.5 border-2 border-red-500 bg-red-50 rounded font-mono text-sm font-bold text-red-700">{fmt(selectedFacture.montantTTC)}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
