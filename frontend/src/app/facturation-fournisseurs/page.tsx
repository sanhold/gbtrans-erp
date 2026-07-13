'use client';

import { useEffect, useState } from 'react';
import api, { financeApi } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  PARTIELLEMENT_PAYEE: 'badge-warning', PAYEE: 'badge-success',
  EN_RETARD: 'badge-danger', ANNULEE: 'badge-danger', CONTENTIEUX: 'badge-danger',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function FacturationFournisseursPage() {
  const [factures, setFactures] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [form, setForm] = useState({ fournisseurId: '', dossierId: '', dateEcheance: '', reference: '', objet: '', observations: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await financeApi.facturesFournisseurs.list({ page, limit: pageSize });
      setFactures(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { setFactures([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, pageSize]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    api.get('/fournisseurs', { params: { limit: 200 } }).then(r => setFournisseurs(r.data.data || [])).catch(() => setFournisseurs([]));
  }, []);

  const totaux = factures.reduce((acc, f) => ({
    ttc: acc.ttc + Number(f.montantTTC), paye: acc.paye + Number(f.montantPaye), reste: acc.reste + Number(f.resteAPayer),
  }), { ttc: 0, paye: 0, reste: 0 });

  const openDetail = (id: string) => { window.location.href = `/facturation-fournisseurs/${id}`; };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await financeApi.facturesFournisseurs.create({
        fournisseurId: form.fournisseurId, dossierId: form.dossierId || undefined,
        dateEcheance: form.dateEcheance, reference: form.reference || undefined,
        objet: form.objet || undefined, observations: form.observations || undefined,
      });
      toast.success('Facture fournisseur créée');
      setShowModal(false);
      setForm({ fournisseurId: '', dossierId: '', dateEcheance: '', reference: '', objet: '', observations: '' });
      window.location.href = `/facturation-fournisseurs/${res.data.data.id}`;
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facturation Fournisseur</h1>
            <p className="text-sm text-gray-500">{total} facture(s) fournisseur</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle Facture Fournisseur
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Total facturé</p><p className="text-sm font-bold">{fmt(totaux.ttc)} F</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Total payé</p><p className="text-sm font-bold text-green-600">{fmt(totaux.paye)} F</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Reste à payer</p><p className="text-sm font-bold text-red-600">{fmt(totaux.reste)} F</p></div>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">N° Facture</th><th className="table-header">Fournisseur</th>
              <th className="table-header">Dossier</th><th className="table-header text-right">Total TTC</th>
              <th className="table-header text-right">Payé</th><th className="table-header text-right">Reste</th>
              <th className="table-header">Statut</th><th className="table-header">Échéance</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : factures.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucune facture fournisseur</td></tr>
              : factures.map(f => (
                <tr key={f.id} className="table-row cursor-pointer" onClick={() => openDetail(f.id)}>
                  <td className="table-cell font-medium text-primary-600" data-label="N° Facture">{f.numero}</td>
                  <td className="table-cell" data-label="Fournisseur">{f.fournisseur?.raisonSociale}</td>
                  <td className="table-cell font-mono text-xs" data-label="Dossier">{f.dossier?.numero || '-'}</td>
                  <td className="table-cell text-right font-mono font-bold" data-label="Total TTC">{fmt(f.montantTTC)}</td>
                  <td className="table-cell text-right font-mono text-green-600" data-label="Payé">{fmt(f.montantPaye)}</td>
                  <td className="table-cell text-right font-mono text-red-600" data-label="Reste">{fmt(f.resteAPayer)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[f.statut] || 'badge-gray'}`}>{f.statut?.replace(/_/g, ' ')}</span></td>
                  <td className="table-cell text-xs" data-label="Échéance">{new Date(f.dateEcheance).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">Nouvelle Facture Fournisseur</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div><label className="label">Fournisseur *</label>
                  <select value={form.fournisseurId} onChange={e => setForm({ ...form, fournisseurId: e.target.value })} className="input-field" required>
                    <option value="">Sélectionner...</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.raisonSociale}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Échéance *</label><input type="date" value={form.dateEcheance} onChange={e => setForm({ ...form, dateEcheance: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
                </div>
                <div><label className="label">Objet</label><input type="text" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} className="input-field" /></div>
                <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
                <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Créer</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
