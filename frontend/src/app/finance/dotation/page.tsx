'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import PickerField from '@/components/ui/PickerField';
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
    setForm({ montant: String(d.montant), motif: d.motif || '', agentId: d.agentId, dateDotation: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await financeApi.dotations.update(editing.id, { montant: Number(form.montant), motif: form.motif || undefined, agentId: form.agentId });
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
      element.style.cssText = "width:210mm;padding:20mm;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;";
      element.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #12314f;padding-bottom:12px;margin-bottom:20px;">
          <div style="display:flex;gap:10px;align-items:center;">
            ${branding?.logo ? `<img src="${branding.logo}" style="width:38px;height:38px;object-fit:contain;" />` : ''}
            <div><div style="font-weight:800;font-size:16px;color:#12314f;">${brand.nom}</div><div style="font-size:9px;color:#666;">${brand.slogan}</div></div>
          </div>
          <div style="text-align:right;"><div style="font-weight:800;font-size:14px;">REÇU DE DOTATION</div><div style="font-size:10px;color:#666;">${d.numero}</div></div>
        </div>
        <table style="width:100%;font-size:11px;margin-bottom:24px;">
          <tr><td style="padding:5px 0;color:#666;width:160px;">Date</td><td style="font-weight:700;">${new Date(d.dateDotation).toLocaleDateString('fr-FR')}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Agent</td><td style="font-weight:700;">${d.agent?.nom} ${d.agent?.prenom}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Motif</td><td>${d.motif || '-'}</td></tr>
          <tr><td style="padding:5px 0;color:#666;">Montant alloué</td><td style="font-weight:800;font-size:14px;color:#12314f;">${fmt(d.montant)} XOF</td></tr>
        </table>
        ${showSignature ? `<div style="display:flex;justify-content:space-between;margin-top:60px;">
          <div style="text-align:center;width:220px;"><div style="font-size:10px;color:#666;margin-bottom:40px;">Signature de l&apos;agent</div><div style="border-top:1px solid #333;padding-top:4px;">${d.agent?.nom} ${d.agent?.prenom}</div></div>
          <div style="text-align:center;width:220px;">
            <div style="font-size:10px;color:#666;margin-bottom:${branding?.signature ? '4px' : '40px'};">Le Directeur / Cachet &amp; Signature</div>
            ${branding?.signature ? `<img src="${branding.signature}" style="height:32px;object-fit:contain;margin:0 auto;display:block;" />` : ''}
            <div style="border-top:1px solid #333;padding-top:4px;">${brand.nom}</div>
          </div>
        </div>` : ''}
        <div style="text-align:center;font-size:8px;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:40px;">Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${brand.nom}</div>
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
        <div className="card !p-3 overflow-x-auto">
          <div className="flex flex-nowrap items-center gap-2 min-w-max">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0 mr-1 whitespace-nowrap">Dotation</h1>
            <input type="text" value={filterNumero} onChange={e => setFilterNumero(e.target.value)} className="input-field !py-1.5 text-xs !w-32 flex-shrink-0" placeholder="N° Dotation..." />
            <PickerField value={filterAgentId} onChange={setFilterAgentId} options={agentOptions} placeholder="Tous les agents" title="Sélectionner un agent" searchPlaceholder="Nom, prénom..." className="!py-1.5 text-xs w-36 flex-shrink-0" />
            <button onClick={load} className="btn-secondary !px-3 !py-1.5 text-xs flex-shrink-0">Afficher</button>
            <label className={`flex items-center gap-1.5 text-[10.5px] text-gray-600 dark:text-gray-300 flex-shrink-0 whitespace-nowrap ${canSignature ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} title={!canSignature ? 'Permission requise : DOCUMENTS:SIGNATURE' : undefined}>
              <input type="checkbox" checked={afficherSignature} disabled={!canSignature} onChange={e => setAfficherSignature(e.target.checked)} className="rounded border-gray-300" />
              Signature sur fiches
            </label>
            <div className="flex gap-2 flex-shrink-0 ml-auto">
              <button onClick={openHistorique} className="btn-secondary !px-3 !py-1.5 text-xs">Historique</button>
              <button onClick={openCreate} className="btn-primary !px-3 !py-1.5 text-xs">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nouvelle Dotation
              </button>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead><tr>
              <th className="table-header !text-[10px] !px-1.5 truncate">N° Dotation</th><th className="table-header !text-[10px] !px-1.5 truncate">Date</th>
              <th className="table-header !text-[10px] !px-1.5 truncate text-right">Montant</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Utilisé</th>
              <th className="table-header !text-[10px] !px-1.5 truncate text-right">Restant</th><th className="table-header !text-[10px] !px-1.5 truncate">Agent</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Motif</th><th className="table-header !text-[10px] !px-1.5 truncate">Statut</th><th className="table-header !text-[10px] !px-1.5 truncate"></th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-gray-500">Aucune dotation enregistrée</td></tr>
              : rows.map(d => (
                <tr key={d.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600 !px-1.5 !text-[11px] truncate" data-label="N° Dotation" title={d.numero}>{d.numero}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date">{new Date(d.dateDotation).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Montant">{fmt(d.montant)}</td>
                  <td className="table-cell text-right font-mono text-red-600 !px-1.5 !text-[10.5px] truncate" data-label="Utilisé">{fmt(d.montantUtilise)}</td>
                  <td className="table-cell text-right font-mono text-green-600 !px-1.5 !text-[10.5px] truncate" data-label="Restant">{fmt(d.montantRestant)}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Agent">{d.agent ? `${d.agent.nom} ${d.agent.prenom}` : '-'}</td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" title={d.motif} data-label="Motif">{d.motif || '-'}</td>
                  <td className="table-cell !px-1.5" data-label="Statut"><span className={`badge ${d.statut === 'VALIDE' ? 'badge-success' : 'badge-gray'} !text-[10px] !px-1.5 !py-0`}>{d.statut === 'VALIDE' ? 'Validée' : 'Annulée'}</span></td>
                  <td className="table-cell !px-1.5" data-label="Actions">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      {d.statut === 'VALIDE' && <button onClick={() => openEdit(d)} className="text-[10px] text-primary-600 hover:underline">Modifier</button>}
                      {d.statut === 'VALIDE' && <button onClick={() => handleAnnuler(d)} className="text-[10px] text-red-600 hover:underline">Supprimer</button>}
                      <button onClick={() => handlePrintFiche1(d)} disabled={printing === d.id + '-1'} className="text-[10px] text-gray-500 hover:underline disabled:opacity-50">Fiche 1</button>
                      <button onClick={() => handlePrintFiche2(d)} disabled={printing === d.id + '-2'} className="text-[10px] text-gray-500 hover:underline disabled:opacity-50">Fiche 2</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">{editing ? 'Modifier la Dotation' : 'Fiche Dotation'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {editing && <p className="text-xs text-gray-500 font-mono">{editing.numero}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Montant *</label><input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} className="input-field" required /></div>
                  {!editing && <div><label className="label">Date</label><input type="date" value={form.dateDotation} onChange={e => setForm({ ...form, dateDotation: e.target.value })} className="input-field" /></div>}
                </div>
                {editing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="label text-gray-400">Montant Utilisé</label><input type="text" value={fmt(editing.montantUtilise)} disabled className="input-field bg-gray-50 dark:bg-surface-700 text-gray-400" /></div>
                    <div><label className="label text-gray-400">Montant Restant</label><input type="text" value={fmt(editing.montantRestant)} disabled className="input-field bg-gray-50 dark:bg-surface-700 text-gray-400" /></div>
                  </div>
                )}
                <div><label className="label">Agent *</label>
                  <PickerField value={form.agentId} onChange={id => setForm({ ...form, agentId: id })} options={agentOptions} placeholder="Sélectionner un agent..." title="Sélectionner un agent" searchPlaceholder="Nom, prénom..." required />
                </div>
                <div><label className="label">Motif</label><textarea value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })} className="input-field" rows={3} /></div>
                <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Valider</button></div>
              </form>
            </div>
          </div>
        )}

        {showHistorique && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
                <h3 className="font-bold text-lg">Historique des Dotations par Agent</h3>
                <button onClick={() => setShowHistorique(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
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
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
