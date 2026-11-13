'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, Tiers, Montant, Progression, StatutPastille } from '@/components/tables/cellules';
import EmptyState from '@/components/ui/EmptyState';
import PickerField from '@/components/ui/PickerField';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import DotationTabs from '@/components/finance/DotationTabs';
import FiltresDepliables from '@/components/ui/FiltresDepliables';
import { financeApi } from '@/lib/api';
import { fmt } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import { getSocieteBranding, brandIdentity } from '@/lib/generatePDF';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function DotationPage() {
  const { hasPermission } = useAuthStore();
  const canSignature = hasPermission('DOCUMENTS:SIGNATURE');
  const [afficherSignature, setAfficherSignature] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNumero, setFilterNumero] = useState('');
  const [filterAgentId, setFilterAgentId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ montant: '', motif: '', agentId: '', dateDotation: '' });
  const [showHistorique, setShowHistorique] = useState(false);
  const [historiqueRows, setHistoriqueRows] = useState<any[]>([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    financeApi.operations.agents().then(r => setAgents(r.data.data || [])).catch(() => setAgents([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.dotations.list({ page, limit: pageSize, numero: filterNumero || undefined, agentId: filterAgentId || undefined });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [page, pageSize, filterNumero, filterAgentId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, pageSize]);

  const agentOptions = agents.map(a => ({ id: a.id, label: `${a.nom} ${a.prenom}` }));

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditing(null);
    setForm({ montant: '', motif: '', agentId: '', dateDotation: '' });
    setShowModal(true);
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setForm({ montant: String(d.montant), motif: d.motif || '', agentId: d.agentId, dateDotation: String(d.dateDotation).slice(0, 10) });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await financeApi.dotations.update(editing.id, { montant: Number(form.montant), motif: form.motif || undefined, agentId: form.agentId, dateDotation: form.dateDotation || undefined });
        toast.success('Dotation modifiée');
      } else {
        await financeApi.dotations.create({ montant: Number(form.montant), motif: form.motif || undefined, agentId: form.agentId, dateDotation: form.dateDotation || undefined });
        toast.success('Dotation créée');
      }
      setShowModal(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleAnnuler = async (d: any) => {
    if (!confirm(`Annuler la dotation ${d.numero} ?`)) return;
    try {
      await financeApi.dotations.annuler(d.id);
      toast.success('Dotation annulée');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const openHistorique = async () => {
    setShowHistorique(true);
    setLoadingHistorique(true);
    try {
      const res = await financeApi.dotations.list({ limit: 500 });
      setHistoriqueRows(res.data.data || []);
    } catch { setHistoriqueRows([]); }
    finally { setLoadingHistorique(false); }
  };

  const historiqueParAgent = historiqueRows.reduce((acc: Record<string, any>, d: any) => {
    const key = d.agent ? `${d.agent.nom} ${d.agent.prenom}` : 'Sans agent';
    if (!acc[key]) acc[key] = { nom: key, nb: 0, totalMontant: 0, totalUtilise: 0, totalRestant: 0 };
    acc[key].nb += 1;
    acc[key].totalMontant += Number(d.montant);
    acc[key].totalUtilise += Number(d.montantUtilise);
    acc[key].totalRestant += Number(d.montantRestant);
    return acc;
  }, {});

  const statutDotation = (d: any): { libelle: string; ton: 'info' | 'warning' | 'success' | 'gray' } =>
    d.statut === 'SOLDEE' ? { libelle: 'Soldée', ton: 'success' }
    : d.statut === 'ANNULEE' ? { libelle: 'Annulée', ton: 'gray' }
    : d.soumise ? { libelle: 'Soumise', ton: 'warning' } : { libelle: 'En cours', ton: 'info' };

  const bouton = 'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50';
  const actionsLigne = (d: any) => (
    <>
      {d.modifiable && <button type="button" onClick={() => openEdit(d)} className={`${bouton} border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/15 dark:text-primary-200`}>Modifier</button>}
      {d.statut === 'VALIDE' && !d.soumise && <button type="button" onClick={() => handleAnnuler(d)} className={`${bouton} border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300`}>Supprimer</button>}
      <button type="button" onClick={() => handlePrintFiche1(d)} disabled={printing === d.id + '-1'} className={`${bouton} border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200`} title="Reçu de dotation (PDF)">Fiche 1</button>
      <button type="button" onClick={() => handlePrintFiche2(d)} disabled={printing === d.id + '-2'} className={`${bouton} border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200`} title="État d'utilisation (PDF)">Fiche 2</button>
    </>
  );

  const iconBtn = 'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';
  const actionsTableau = (d: any) => (
    <>
      {d.modifiable && <button type="button" onClick={() => openEdit(d)} title="Modifier la dotation" aria-label="Modifier la dotation" className={`${iconBtn} border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/15 dark:text-primary-200`}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.768-6.768a2 2 0 112.828 2.828L11.828 15.83a2 2 0 01-.89.514L7 17l.657-3.94A2 2 0 018.172 12.2z" /></svg></button>}
      {d.statut === 'VALIDE' && !d.soumise && <button type="button" onClick={() => handleAnnuler(d)} title="Supprimer la dotation" aria-label="Supprimer la dotation" className={`${iconBtn} border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300`}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg></button>}
      <button type="button" onClick={() => handlePrintFiche1(d)} disabled={printing === d.id + '-1'} title="Fiche 1 : reçu de dotation (PDF)" aria-label="Fiche 1, reçu de dotation" className={`${iconBtn} border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200`}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button>
      <button type="button" onClick={() => handlePrintFiche2(d)} disabled={printing === d.id + '-2'} title="Fiche 2 : état d'utilisation (PDF)" aria-label="Fiche 2, état d'utilisation" className={`${iconBtn} border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200`}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" /></svg></button>
    </>
  );

  const colonnes: Colonne<any>[] = [
    { cle: 'numero', libelle: 'Dotation', rendu: d => <DoubleLigne mono haut={d.numero} bas={`${new Date(d.dateDotation).toLocaleDateString('fr-FR')}${d.motif ? ' · ' + d.motif : ''}`} />, texte: d => d.numero },
    { cle: 'agent', libelle: 'Agent', rendu: d => <Tiers nom={d.agent ? `${d.agent.prenom} ${d.agent.nom}` : null} />, texte: d => (d.agent ? `${d.agent.prenom} ${d.agent.nom}` : '') },
    { cle: 'montant', libelle: 'Montant', align: 'right', rendu: d => <Montant valeur={d.montant} />, texte: d => String(d.montant) },
    { cle: 'utilise', libelle: 'Utilisé', align: 'right', rendu: d => <Montant valeur={d.montantUtilise} ton="negatif" />, texte: d => String(d.montantUtilise) },
    { cle: 'restant', libelle: 'Restant', align: 'right', rendu: d => <Montant valeur={d.montantRestant} ton="positif" />, texte: d => String(d.montantRestant) },
    { cle: 'avancement', libelle: 'Utilisation', masquerSous: '2xl', rendu: d => <Progression fait={Number(d.montantUtilise)} total={Number(d.montant)} titre={`${fmt(d.montantUtilise)} F utilisés sur ${fmt(d.montant)} F`} /> },
    { cle: 'statut', libelle: 'Statut', rendu: d => { const st = statutDotation(d); return <StatutPastille libelle={st.libelle} ton={st.ton} />; }, texte: d => statutDotation(d).libelle },
  ];

  const handlePrintFiche1 = async (d: any) => {
    setPrinting(d.id + '-1');
    try {
      const [html2pdf, branding] = await Promise.all([
        import('html2pdf.js').then(m => m.default),
        getSocieteBranding(),
      ]);
      const brand = brandIdentity(branding);
      const showSignature = canSignature && afficherSignature;
      const element = document.createElement('div');
      element.style.cssText = "width:210mm;height:296mm;box-sizing:border-box;padding:15mm 18mm;display:flex;flex-direction:column;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;";
      // Grille de saisie des justificatifs : les lignes se partagent toute la place restante jusqu'en bas de la page.
      const nbLignesGrille = showSignature ? 19 : 22;
      const celGrille = 'border:1px solid #9aa7b4;';
      const ligneGrille = (i: number) => `<div style="display:flex;flex:1;min-height:0;">
            <div style="${celGrille}width:9%;border-top:none;border-right:none;display:flex;align-items:center;justify-content:center;font-size:9px;color:#9aa7b4;">${i + 1}</div>
            <div style="${celGrille}width:14%;border-top:none;border-right:none;"></div>
            <div style="${celGrille}width:19%;border-top:none;border-right:none;"></div>
            <div style="${celGrille}flex:1;border-top:none;border-right:none;"></div>
            <div style="${celGrille}width:20%;border-top:none;"></div>
          </div>`;
      element.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #12314f;padding-bottom:12px;margin-bottom:16px;">
          <div style="display:flex;gap:10px;align-items:center;">
            ${branding?.logo ? `<img src="${branding.logo}" style="width:38px;height:38px;object-fit:contain;" />` : ''}
            <div><div style="font-weight:800;font-size:16px;color:#12314f;">${brand.nom}</div><div style="font-size:9px;color:#666;">${brand.slogan}</div></div>
          </div>
          <div style="text-align:right;"><div style="font-weight:800;font-size:14px;">REÇU DE DOTATION</div><div style="font-size:10px;color:#666;">${d.numero}</div></div>
        </div>
        <table style="width:100%;font-size:11px;margin-bottom:14px;">
          <tr><td style="padding:5px 0;color:#666;width:160px;">Date</td><td style="font-weight:700;">${new Date(d.dateDotation).toLocaleDateString('fr-FR')}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Agent</td><td style="font-weight:700;">${d.agent?.nom} ${d.agent?.prenom}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Motif</td><td>${d.motif || '-'}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Montant alloué</td><td style="font-weight:800;font-size:14px;color:#12314f;">${fmt(d.montant)} XOF</td></tr>
        </table>
        <div style="font-weight:800;font-size:11px;background:#eaf0f5;padding:5px 8px;margin-bottom:0;">JUSTIFICATIFS DE DÉPENSES</div>
        <div style="display:flex;font-size:9px;font-weight:700;color:#12314f;background:#f4f7fa;">
          <div style="${celGrille}width:9%;border-right:none;padding:4px 0;text-align:center;">N°</div>
          <div style="${celGrille}width:14%;border-right:none;padding:4px 6px;">Date</div>
          <div style="${celGrille}width:19%;border-right:none;padding:4px 6px;">Dossier</div>
          <div style="${celGrille}flex:1;border-right:none;padding:4px 6px;">Désignation / N° de pièce</div>
          <div style="${celGrille}width:20%;padding:4px 6px;text-align:right;">Montant (XOF)</div>
        </div>
        <div style="display:flex;flex-direction:column;flex:1;min-height:0;margin-bottom:12px;">${Array.from({ length: nbLignesGrille }, (_, i) => ligneGrille(i)).join('')}</div>
        ${showSignature ? `<div style="display:flex;justify-content:space-between;margin-top:6px;flex-shrink:0;">
          <div style="text-align:center;width:220px;"><div style="font-size:10px;color:#666;margin-bottom:40px;">Signature de l&apos;agent</div><div style="border-top:1px solid #333;padding-top:4px;">${d.agent?.nom} ${d.agent?.prenom}</div></div>
          <div style="text-align:center;width:220px;">
            <div style="font-size:10px;color:#666;margin-bottom:${branding?.signature ? '4px' : '40px'};">Le Directeur / Cachet &amp; Signature</div>
            ${branding?.signature ? `<img src="${branding.signature}" style="height:32px;object-fit:contain;margin:0 auto;display:block;" />` : ''}
    ${branding?.cachet ? `<img src="${branding.cachet}" style="height:32px;object-fit:contain;margin:2px auto 0;display:block;" />` : ''}
            <div style="border-top:1px solid #333;padding-top:4px;">${brand.nom}</div>
          </div>
        </div>` : ''}
        <div style="text-align:center;font-size:8px;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:10px;flex-shrink:0;">Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${brand.nom}</div>
      `;
      document.body.appendChild(element);
      await html2pdf().set({ margin: 0, filename: `Dotation_${d.numero.replace(/\//g, '-')}_Recu.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save();
      document.body.removeChild(element);
    } catch { toast.error('Erreur lors de la génération du PDF'); }
    finally { setPrinting(null); }
  };

  const handlePrintFiche2 = async (d: any) => {
    setPrinting(d.id + '-2');
    try {
      const [depRes, html2pdf, branding] = await Promise.all([
        financeApi.depenses.list({ dotationId: d.id, limit: 200 }),
        import('html2pdf.js').then(m => m.default),
        getSocieteBranding(),
      ]);
      const depenses = depRes.data.data || [];
      const brand = brandIdentity(branding);
      const showSignature = canSignature && afficherSignature;
      const element = document.createElement('div');
      element.style.cssText = "width:210mm;padding:15mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;";
      element.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #12314f;padding-bottom:10px;margin-bottom:16px;">
          <div style="display:flex;gap:10px;align-items:center;">
            ${branding?.logo ? `<img src="${branding.logo}" style="width:34px;height:34px;object-fit:contain;" />` : ''}
            <div><div style="font-weight:800;font-size:16px;color:#12314f;">${brand.nom}</div><div style="font-size:9px;color:#666;">${brand.slogan}</div></div>
          </div>
          <div style="text-align:right;"><div style="font-weight:800;font-size:14px;">ÉTAT D&apos;UTILISATION</div><div style="font-size:10px;color:#666;">${d.numero}</div></div>
        </div>
        <table style="width:100%;font-size:10px;margin-bottom:14px;">
          <tr><td style="padding:2px 0;color:#666;width:120px;">Agent</td><td style="font-weight:700;">${d.agent?.nom} ${d.agent?.prenom}</td></tr>
          <tr><td style="padding:2px 0;color:#666;">Motif</td><td>${d.motif || '-'}</td></tr>
        </table>
        <div style="display:flex;gap:10px;margin-bottom:16px;">
          <div style="flex:1;border:1px solid #eee;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:9px;color:#666;">MONTANT</div><div style="font-weight:800;font-size:13px;">${fmt(d.montant)}</div></div>
          <div style="flex:1;border:1px solid #eee;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:9px;color:#666;">UTILISÉ</div><div style="font-weight:800;font-size:13px;color:#b91c1c;">${fmt(d.montantUtilise)}</div></div>
          <div style="flex:1;border:1px solid #eee;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:9px;color:#666;">RESTANT</div><div style="font-weight:800;font-size:13px;color:#15803d;">${fmt(d.montantRestant)}</div></div>
        </div>
        <div style="font-weight:800;font-size:11px;background:#eaf0f5;padding:5px 8px;margin-bottom:4px;">DÉPENSES IMPUTÉES (${depenses.length})</div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
          <thead><tr>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">N°</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Date</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Catégorie</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;">Désignation</th>
            <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #ccc;">Montant</th>
          </tr></thead>
          <tbody>${depenses.map((dep: any) => `<tr>
            <td style="padding:3px 6px;border-bottom:1px solid #eee;">${dep.numero}</td>
            <td style="padding:3px 6px;border-bottom:1px solid #eee;">${new Date(dep.dateDepense).toLocaleDateString('fr-FR')}</td>
            <td style="padding:3px 6px;border-bottom:1px solid #eee;">${dep.categorie}</td>
            <td style="padding:3px 6px;border-bottom:1px solid #eee;">${dep.designation}</td>
            <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;">${fmt(dep.montant)}</td>
          </tr>`).join('') || '<tr><td colspan="5" style="padding:6px;color:#999;">Aucune dépense imputée</td></tr>'}</tbody>
        </table>
        ${showSignature ? `<div style="display:flex;justify-content:flex-end;margin-top:26px;">
          <div style="text-align:center;width:220px;">
            <div style="font-size:10px;color:#666;margin-bottom:${branding?.signature ? '4px' : '38px'};">Le Directeur / Cachet &amp; Signature</div>
            ${branding?.signature ? `<img src="${branding.signature}" style="height:32px;object-fit:contain;margin:0 auto;display:block;" />` : ''}
    ${branding?.cachet ? `<img src="${branding.cachet}" style="height:32px;object-fit:contain;margin:2px auto 0;display:block;" />` : ''}
            <div style="border-top:1px solid #333;padding-top:4px;">${brand.nom}</div>
          </div>
        </div>` : ''}
        <div style="text-align:center;font-size:8px;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:16px;">Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${brand.nom}</div>
      `;
      document.body.appendChild(element);
      await html2pdf().set({ margin: 0, filename: `Dotation_${d.numero.replace(/\//g, '-')}_Etat.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save();
      document.body.removeChild(element);
    } catch { toast.error('Erreur lors de la génération du PDF'); }
    finally { setPrinting(null); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <DotationTabs />
        <PageHeader
          titre="Dotations"
          sousTitre="Remises de fonds aux agents, justifiées ensuite par leurs dépenses."
          sousTitreMasqueMobile
          actions={
            <>
              <button onClick={openHistorique} className="btn-secondary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">Historique</button>
              <button onClick={openCreate} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="sm:hidden">Nouvelle</span><span className="hidden sm:inline">Nouvelle dotation</span>
              </button>
            </>
          }
        />

        <FiltresDepliables actifs={(filterNumero ? 1 : 0) + (filterAgentId ? 1 : 0)}>
        <form onSubmit={e => { e.preventDefault(); setPage(1); load(); }}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="label">N° de dotation</label>
              <input type="text" value={filterNumero} onChange={e => setFilterNumero(e.target.value)} className="input-field" placeholder="DOT/2026/..." />
            </div>
            <div>
              <label className="label">Agent</label>
              <PickerField value={filterAgentId} onChange={setFilterAgentId} options={agentOptions} placeholder="Tous les agents" title="Sélectionner un agent" searchPlaceholder="Nom, prénom..." />
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto">Afficher</button>
          </div>
          <label className={`mt-3 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 ${canSignature ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} title={!canSignature ? 'Permission requise : DOCUMENTS:SIGNATURE' : undefined}>
            <input type="checkbox" checked={afficherSignature} disabled={!canSignature} onChange={e => setAfficherSignature(e.target.checked)} className="rounded border-gray-300" />
            Ajouter la signature sur les fiches imprimées
          </label>
        </form>
        </FiltresDepliables>

        {/* Ordinateur : tableau de bureau */}
        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={rows}
            cleLigne={(d) => d.id}
            chargement={loading}
            nomExport="dotations"
            actionsToujoursVisibles
            actions={actionsTableau}
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />}
            vide={<EmptyState titre="Aucune dotation" description="Créez une dotation pour remettre des fonds à un agent." />}
          />
        </div>

        {/* Téléphone et tablette : une carte par dotation */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1].map(i => <div key={i} className="card !p-0 animate-pulse h-36" />)
          ) : rows.length === 0 ? (
            <div className="card"><EmptyState titre="Aucune dotation" description="Créez une dotation pour remettre des fonds à un agent." /></div>
          ) : rows.map(d => {
            const st = statutDotation(d);
            return (
              <div key={d.id} className="card !p-0 overflow-hidden">
                <div className="flex items-start justify-between gap-2 px-4 pt-3">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-primary-600 dark:text-primary-300 truncate">{d.numero}</div>
                    <div className="text-xs text-gray-500 truncate">{d.agent ? `${d.agent.prenom} ${d.agent.nom}` : '—'} · {new Date(d.dateDotation).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <StatutPastille libelle={st.libelle} ton={st.ton} />
                </div>
                {d.motif && <p className="px-4 pt-1 text-xs text-gray-500 line-clamp-2">{d.motif}</p>}
                <div className="mt-3 grid grid-cols-3 gap-px bg-gray-200 dark:bg-surface-700 text-center">
                  {[
                    { l: 'Montant', v: d.montant, c: '' },
                    { l: 'Utilisé', v: d.montantUtilise, c: 'text-red-600' },
                    { l: 'Restant', v: d.montantRestant, c: 'text-green-600' },
                  ].map(k => (
                    <div key={k.l} className="bg-white dark:bg-surface-800 py-2">
                      <div className="text-[10px] uppercase text-gray-500">{k.l}</div>
                      <div className={`font-bold font-mono text-[13px] ${k.c}`}>{fmt(k.v)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 px-4 py-3">{actionsLigne(d)}</div>
              </div>
            );
          })}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} /></div>
        </div>

        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Modifier la dotation' : 'Nouvelle dotation'}
          description={editing ? editing.numero : 'Remise de fonds à un agent, qu\'il justifiera ensuite par ses dépenses.'}
          footer={
            <>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button type="submit" form="form-dotation" className="btn-primary">{editing ? 'Enregistrer' : 'Créer la dotation'}</button>
            </>
          }
        >
          <form id="form-dotation" onSubmit={handleSubmit} className="space-y-4">
            {editing && (
              <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-gray-200 dark:border-surface-700 bg-gray-200 dark:bg-surface-700 text-center">
                <div className="bg-gray-50 dark:bg-surface-800 py-2.5"><div className="text-[10px] uppercase text-gray-500">Utilisé</div><div className="font-bold font-mono text-red-600">{fmt(editing.montantUtilise)} F</div></div>
                <div className="bg-gray-50 dark:bg-surface-800 py-2.5"><div className="text-[10px] uppercase text-gray-500">Restant</div><div className="font-bold font-mono text-green-600">{fmt(editing.montantRestant)} F</div></div>
              </div>
            )}
            <div>
              <label className="label">Agent *</label>
              <PickerField value={form.agentId} onChange={id => setForm({ ...form, agentId: id })} options={agentOptions} placeholder="Sélectionner un agent..." title="Sélectionner un agent" searchPlaceholder="Nom, prénom..." required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Montant (F CFA) *</label>
                <input type="text" inputMode="numeric" required className="input-field" placeholder="0" value={form.montant ? fmt(form.montant) : ''} onChange={e => setForm({ ...form, montant: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" value={form.dateDotation} onChange={e => setForm({ ...form, dateDotation: e.target.value })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Motif</label>
              <textarea value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} className="input-field" rows={3} placeholder="Ex : frais de mission, débours portuaires..." />
            </div>
          </form>
        </Modal>

        <Modal open={showHistorique} onClose={() => setShowHistorique(false)} title="Historique par agent" description="Total des dotations attribuées, utilisées et restantes pour chaque agent." size="lg">
          <div className="overflow-x-auto">
                {loadingHistorique ? <p className="text-center text-gray-500 py-8">Chargement...</p> : (
                  <table className="w-full text-sm">
                    <thead><tr><th className="table-header">Agent</th><th className="table-header text-right">Nb. Dotations</th><th className="table-header text-right">Total Montant</th><th className="table-header text-right">Total Utilisé</th><th className="table-header text-right">Total Restant</th></tr></thead>
                    <tbody>
                      {Object.values(historiqueParAgent).length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">Aucune dotation enregistrée</td></tr>
                      : Object.values(historiqueParAgent).map((a: any) => (
                        <tr key={a.nom} className="table-row">
                          <td className="table-cell font-medium" data-label="Agent">{a.nom}</td>
                          <td className="table-cell text-right" data-label="Nb. Dotations">{a.nb}</td>
                          <td className="table-cell text-right font-mono" data-label="Total Montant">{fmt(a.totalMontant)}</td>
                          <td className="table-cell text-right font-mono text-red-600" data-label="Total Utilisé">{fmt(a.totalUtilise)}</td>
                          <td className="table-cell text-right font-mono text-green-600" data-label="Total Restant">{fmt(a.totalRestant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
