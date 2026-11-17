'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Numero, Discret, Tronque, Montant, StatutPastille } from '@/components/tables/cellules';
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
      setDetail({ dossier, factures, depenses: (dossier.depenses || []).filter((d: any) => d.statut !== 'ANNULEE'), paiements: paiementsAvecFacture });
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
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #12314f;padding-bottom:10px;margin-bottom:14px;">
          <div><div style="font-weight:800;font-size:16px;color:#12314f;">GBTRANS SARL</div><div style="font-size:9px;color:#666;">Bureau de Transit &amp; Douane</div></div>
          <div style="text-align:right;"><div style="font-weight:800;font-size:14px;">ÉTAT DU DOSSIER</div><div style="font-size:10px;color:#666;">${dossier.numeroPhysique || dossier.numero}</div></div>
        </div>
        <table style="width:100%;font-size:10px;margin-bottom:14px;">
          <tr><td style="padding:2px 0;color:#666;width:120px;">Client</td><td style="font-weight:700;">${dossier.client?.raisonSociale || '-'}</td></tr>
          <tr><td style="padding:2px 0;color:#666;">Statut</td><td style="font-weight:700;">${dossier.statut}</td></tr>
          <tr><td style="padding:2px 0;color:#666;">Nature</td><td>${dossier.nature || '-'}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;border:1px solid #ccd6e0;">
          <tr>
            <td style="padding:8px 10px;text-align:center;border-right:1px solid #ccd6e0;"><div style="font-size:9px;color:#666;">ENCAISSÉ (PAIEMENTS)</div><div style="font-weight:800;font-size:13px;color:#16a34a;">${fmt(totalPaye)} F</div></td>
            <td style="padding:8px 10px;text-align:center;border-right:1px solid #ccd6e0;"><div style="font-size:9px;color:#666;">DÉPENSÉ</div><div style="font-weight:800;font-size:13px;color:#dc2626;">${fmt(totalDepenses)} F</div></td>
            <td style="padding:8px 10px;text-align:center;background:#eaf0f5;"><div style="font-size:9px;color:#666;">RÉSULTAT DU DOSSIER</div><div style="font-weight:800;font-size:13px;color:${totalPaye - totalDepenses < 0 ? '#dc2626' : '#12314f'};">${fmt(totalPaye - totalDepenses)} F</div></td>
          </tr>
        </table>

        <div style="font-weight:800;font-size:11px;background:#eaf0f5;padding:5px 8px;margin-bottom:4px;">FACTURES (${factures.length})</div>
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

        <div style="font-weight:800;font-size:11px;background:#eaf0f5;padding:5px 8px;margin-bottom:4px;">DÉPENSES (${depenses.length})</div>
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

        <div style="font-weight:800;font-size:11px;background:#eaf0f5;padding:5px 8px;margin-bottom:4px;">PAIEMENTS (${paiements.length})</div>
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
          filename: `Etat_Dossier_${(dossier.numeroPhysique || dossier.numero).replace(/\//g, '-')}.pdf`,
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

  const nomStatut = (x?: string) => (x || '').replace(/_/g, ' ');
  const dateFr = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  const factureOk = (r: any) => Number(r.montantTVA) > 0 || Number(r.montantPrestation) > 0;

  const colonnes = [
    { cle: 'num', libelle: 'N° dossier', texte: (r: any) => r.numeroPhysique || r.numero, rendu: (r: any) => <Numero>{r.numeroPhysique || r.numero}</Numero> },
    { cle: 'statut', libelle: 'Statut', texte: (r: any) => nomStatut(r.statut), rendu: (r: any) => <StatutPastille libelle={nomStatut(r.statut)} ton="info" /> },
    { cle: 'prof', libelle: 'Proforma', align: 'right' as const, texte: (r: any) => String(r.montantProforma), rendu: (r: any) => <Montant valeur={r.montantProforma} unite="" /> },
    { cle: 'tva', libelle: 'TVA', align: 'right' as const, masquerSous: '2xl' as const, texte: (r: any) => String(r.montantTVA), rendu: (r: any) => <Montant valeur={r.montantTVA} unite="" /> },
    { cle: 'prest', libelle: 'Prestation', align: 'right' as const, masquerSous: '2xl' as const, texte: (r: any) => String(r.montantPrestation), rendu: (r: any) => <Montant valeur={r.montantPrestation} unite="" /> },
    { cle: 'paye', libelle: 'Payé', align: 'right' as const, texte: (r: any) => String(r.montantPaye), rendu: (r: any) => <Montant valeur={r.montantPaye} ton="positif" unite="" /> },
    { cle: 'reste', libelle: 'Restant', align: 'right' as const, texte: (r: any) => String(r.montantRestant), rendu: (r: any) => <Montant valeur={r.montantRestant} unite="" /> },
    { cle: 'dep', libelle: 'Dépensé', align: 'right' as const, masquerSous: '2xl' as const, texte: (r: any) => String(r.montantDepense), rendu: (r: any) => <Montant valeur={r.montantDepense} unite="" /> },
    { cle: 'res', libelle: 'Résultat', align: 'right' as const, texte: (r: any) => String(r.resultat), rendu: (r: any) => <Montant valeur={r.resultat} ton={Number(r.resultat) < 0 ? 'negatif' : Number(r.resultat) > 0 ? 'positif' : 'normal'} unite="" /> },
    { cle: 'fact', libelle: 'Facturation', texte: (r: any) => factureOk(r) ? 'Facturé' : 'Non facturé', rendu: (r: any) => <StatutPastille libelle={factureOk(r) ? 'Facturé' : 'Non facturé'} ton={factureOk(r) ? 'success' : 'gray'} /> },
  ];

  const encaisse = (detail?.factures || []).reduce((s: number, f: any) => s + Number(f.montantPaye || 0), 0);
  const depense = (detail?.depenses || []).reduce((s: number, d: any) => s + Number(d.montant || 0), 0);
  const resultat = encaisse - depense;

  const Section = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
    <section><h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">{titre}</h4>{children}</section>
  );

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader titre="État facturation dossier" sousTitre="Touchez une ligne pour voir le détail du dossier" />

        <div className="card !p-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <input type="number" value={annee} onChange={e => setAnnee(e.target.value)} className="input-field !py-2 text-sm sm:!w-24" title="Année" aria-label="Année" />
          <select value={statut} onChange={e => setStatut(e.target.value)} aria-label="Statut" className="input-field !py-2 text-sm sm:!w-auto">
            <option value="">Tous statuts</option>
            {STATUTS_DOSSIER.map(s => <option key={s} value={s}>{nomStatut(s)}</option>)}
          </select>
          <div className="col-span-2 sm:col-span-1 sm:w-56"><PickerField value={clientId} onChange={setClientId} options={clientOptions} placeholder="Tous clients" title="Sélectionner un client" searchPlaceholder="Raison sociale..." className="!py-2 text-sm" /></div>
          <button onClick={() => { setPage(1); load(); }} className="btn-primary col-span-2 sm:col-span-1">Afficher</button>
        </div>

        <ListeResponsive
          colonnes={colonnes}
          lignes={rows}
          cleLigne={(r: any) => r.id}
          chargement={loading}
          nomExport="etat-facturation-dossier"
          onClic={(r: any) => openDetail(r.id)}
          carte={(r: any) => ({
            titre: r.numeroPhysique || r.numero,
            sousTitre: <span>Proforma {fmt(r.montantProforma)} F — Payé {fmt(r.montantPaye)} F</span>,
            statut: <StatutPastille libelle={factureOk(r) ? 'Facturé' : 'Non facturé'} ton={factureOk(r) ? 'success' : 'gray'} />,
            details: <span>Restant {fmt(r.montantRestant)} F — Résultat <b className={Number(r.resultat) < 0 ? 'text-red-600' : 'text-gray-700'}>{fmt(r.resultat)} F</b></span>,
          })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: changePageSize }}
          vide={<EmptyState titre="Aucun dossier" description="Aucun dossier trouvé pour ces critères." />}
        />

        {detail && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in" onClick={() => setDetail(null)}>
            <div onClick={e => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-elevated dark:bg-surface-800 sm:mx-4 sm:rounded-xl">
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-surface-700">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-bold text-primary-600 dark:text-white sm:text-lg">Dossier {detail.dossier?.numeroPhysique || detail.dossier?.numero || ''}</h3>
                  {detail.dossier && <p className="truncate text-xs text-gray-500">{detail.dossier.client?.raisonSociale} · {nomStatut(detail.dossier.statut)}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <button onClick={handleDownloadPdf} disabled={downloading || loadingDetail} className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-50">{downloading ? '…' : 'PDF'}</button>
                  <button onClick={() => setDetail(null)} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {loadingDetail ? <p className="py-8 text-center text-gray-500">Chargement...</p> : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[['Encaissé', encaisse, 'text-green-600'], ['Dépensé', depense, 'text-red-600'], ['Résultat', resultat, resultat < 0 ? 'text-red-600' : 'text-primary-600 dark:text-primary-200']].map(([l, v, c]: any) => (
                        <div key={l} className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-2 py-2.5 text-center dark:border-surface-700 dark:bg-surface-700/40">
                          <div className="text-[10.5px] uppercase text-gray-500">{l}</div>
                          <div className={`truncate font-mono text-[13px] font-bold tabular-nums sm:text-[15px] ${c}`}>{fmt(v)}<span className="text-[10px] text-gray-400"> F</span></div>
                        </div>
                      ))}
                    </div>

                    <Section titre={`Factures (${detail.factures?.length || 0})`}>
                      <ListeResponsive
                        colonnes={[
                          { cle: 'n', libelle: 'N°', texte: (f: any) => f.numero, rendu: (f: any) => <Numero>{f.numero}</Numero> },
                          { cle: 'd', libelle: 'Date', texte: (f: any) => dateFr(f.dateFacture), rendu: (f: any) => <Discret>{dateFr(f.dateFacture)}</Discret> },
                          { cle: 't', libelle: 'TTC', align: 'right' as const, texte: (f: any) => String(f.montantTTC), rendu: (f: any) => <Montant valeur={f.montantTTC} unite="" /> },
                          { cle: 'p', libelle: 'Payé', align: 'right' as const, texte: (f: any) => String(f.montantPaye), rendu: (f: any) => <Montant valeur={f.montantPaye} ton="positif" unite="" /> },
                          { cle: 'r', libelle: 'Reste', align: 'right' as const, texte: (f: any) => String(f.resteAPayer), rendu: (f: any) => <Montant valeur={f.resteAPayer} ton="negatif" unite="" /> },
                          { cle: 's', libelle: 'Statut', texte: (f: any) => nomStatut(f.statut), rendu: (f: any) => <StatutPastille libelle={nomStatut(f.statut)} ton="info" /> },
                        ]}
                        lignes={detail.factures || []}
                        cleLigne={(f: any) => f.id}
                        carte={(f: any) => ({ titre: f.numero, sousTitre: `${dateFr(f.dateFacture)} — Payé ${fmt(f.montantPaye)} F`, droite: <Montant valeur={f.resteAPayer} ton="negatif" />, details: nomStatut(f.statut) })}
                        vide={<p className="py-3 text-center text-sm text-gray-500">Aucune facture liée</p>}
                      />
                    </Section>

                    <Section titre={`Dépenses (${detail.depenses?.length || 0})`}>
                      <ListeResponsive
                        colonnes={[
                          { cle: 'n', libelle: 'N°', texte: (d: any) => d.numero, rendu: (d: any) => <Numero>{d.numero}</Numero> },
                          { cle: 'd', libelle: 'Date', texte: (d: any) => dateFr(d.dateDepense), rendu: (d: any) => <Discret>{dateFr(d.dateDepense)}</Discret> },
                          { cle: 'c', libelle: 'Catégorie', texte: (d: any) => d.categorie, rendu: (d: any) => <Discret>{d.categorie}</Discret> },
                          { cle: 'des', libelle: 'Désignation', texte: (d: any) => d.designation, rendu: (d: any) => <Tronque texte={d.designation} largeur="16rem" /> },
                          { cle: 'm', libelle: 'Montant', align: 'right' as const, texte: (d: any) => String(d.montant), rendu: (d: any) => <Montant valeur={d.montant} unite="" /> },
                        ]}
                        lignes={detail.depenses || []}
                        cleLigne={(d: any) => d.id}
                        carte={(d: any) => ({ titre: d.designation || d.numero, sousTitre: `${d.numero} — ${dateFr(d.dateDepense)} — ${d.categorie || ''}`, droite: <Montant valeur={d.montant} /> })}
                        vide={<p className="py-3 text-center text-sm text-gray-500">Aucune dépense liée</p>}
                      />
                    </Section>

                    <Section titre={`Paiements (${detail.paiements?.length || 0})`}>
                      <ListeResponsive
                        colonnes={[
                          { cle: 'n', libelle: 'N°', texte: (p: any) => p.paiement?.numero || '', rendu: (p: any) => <Numero>{p.paiement?.numero || '—'}</Numero> },
                          { cle: 'd', libelle: 'Date', texte: (p: any) => dateFr(p.paiement?.datePaiement), rendu: (p: any) => <Discret>{dateFr(p.paiement?.datePaiement)}</Discret> },
                          { cle: 'f', libelle: 'Facture', texte: (p: any) => p.factureNumero || '', rendu: (p: any) => <Discret>{p.factureNumero || '—'}</Discret> },
                          { cle: 'm', libelle: 'Montant', align: 'right' as const, texte: (p: any) => String(p.montant), rendu: (p: any) => <Montant valeur={p.montant} ton="positif" unite="" /> },
                        ]}
                        lignes={detail.paiements || []}
                        cleLigne={(p: any) => p.id || p.paiement?.numero || String(Math.random())}
                        carte={(p: any) => ({ titre: p.paiement?.numero || '—', sousTitre: `${dateFr(p.paiement?.datePaiement)} — ${p.factureNumero || ''}`, droite: <Montant valeur={p.montant} ton="positif" /> })}
                        vide={<p className="py-3 text-center text-sm text-gray-500">Aucun paiement enregistré</p>}
                      />
                    </Section>
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
