'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import api, { facturesApi } from '@/lib/api';
import { downloadPDF } from '@/lib/generatePDF';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  PARTIELLEMENT_PAYEE: 'badge-warning', PAYEE: 'badge-success',
  EN_RETARD: 'badge-danger', ANNULEE: 'badge-danger', CONTENTIEUX: 'badge-danger',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function FacturationPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'factures' | 'attente'>('factures');
  const [factures, setFactures] = useState<any[]>([]);
  const [proformasAttente, setProformasAttente] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
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

  const openFactureDetail = (id: string) => {
    router.push(`/facturation/${id}`);
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
        acompte: Number(f.acompte) || undefined,
        resteAPayer: Number(f.resteAPayer) || undefined,
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
                  <tr key={f.id} className="table-row cursor-pointer" onClick={() => openFactureDetail(f.id)}>
                    <td className="table-cell font-medium text-primary-600" data-label="N° Facture">{f.numero}</td>
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
                        <button onClick={(e) => { e.stopPropagation(); openFactureDetail(f.id); }} className="p-1 rounded hover:bg-gray-100" title="Voir">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadFacturePDF(f.id); }} className="p-1 rounded hover:bg-gray-100" title="Télécharger PDF">
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

      </div>
    </AppLayout>
  );
}
