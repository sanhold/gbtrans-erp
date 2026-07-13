'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function RapprochementPage() {
  const { comptes } = useComptesFinanciers();
  const [compteId, setCompteId] = useState('');
  const [rapprochements, setRapprochements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(rapprochements);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ dateBancaire: '', dateComptable: '', soldeReleve: '', soldeComptable: '', observations: '' });

  const load = useCallback(async () => {
    if (!compteId) { setRapprochements([]); return; }
    setLoading(true);
    try {
      const res = await financeApi.rapprochements.list({ compteBancaireId: compteId });
      setRapprochements(res.data.data || []);
    } catch { setRapprochements([]); }
    finally { setLoading(false); }
  }, [compteId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!compteId && comptes.length > 0) setCompteId(comptes[0].id);
  }, [comptes, compteId]);

  const ecartPreview = form.soldeReleve && form.soldeComptable ? Number(form.soldeReleve) - Number(form.soldeComptable) : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.rapprochements.create({
        compteBancaireId: compteId, dateBancaire: form.dateBancaire, dateComptable: form.dateComptable,
        soldeReleve: Number(form.soldeReleve), soldeComptable: Number(form.soldeComptable), observations: form.observations || undefined,
      });
      toast.success('Rapprochement créé');
      setShowModal(false);
      setForm({ dateBancaire: '', dateComptable: '', soldeReleve: '', soldeComptable: '', observations: '' });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const updateStatut = async (id: string, statut: string) => {
    try {
      await financeApi.rapprochements.updateStatut(id, statut);
      toast.success('Statut mis à jour');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rapprochement Bancaire</h1><p className="text-sm text-gray-500">Comparez le solde relevé bancaire au solde comptable</p></div>

        <div className="flex justify-between items-center flex-wrap gap-3">
          <select value={compteId} onChange={e => setCompteId(e.target.value)} className="input-field !w-auto">
            <option value="">Sélectionner un compte bancaire...</option>
            {comptes.map(c => <option key={c.id} value={c.id}>{c.libelle} ({c.banque})</option>)}
          </select>
          <button onClick={() => setShowModal(true)} disabled={!compteId} className="btn-primary disabled:opacity-50">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau Rapprochement
          </button>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Date bancaire</th><th className="table-header">Date comptable</th><th className="table-header text-right">Solde relevé</th><th className="table-header text-right">Solde comptable</th><th className="table-header text-right">Écart</th><th className="table-header">Statut</th><th className="table-header"></th></tr></thead>
            <tbody>
              {!compteId ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Sélectionnez un compte bancaire</td></tr>
              : loading ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : rapprochements.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun rapprochement en cours</td></tr>
              : paged.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell text-xs" data-label="Date bancaire">{new Date(r.dateBancaire).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-xs" data-label="Date comptable">{new Date(r.dateComptable).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono" data-label="Solde relevé">{fmt(r.soldeReleve)}</td>
                  <td className="table-cell text-right font-mono" data-label="Solde comptable">{fmt(r.soldeComptable)}</td>
                  <td className={`table-cell text-right font-mono font-semibold ${Number(r.ecart) === 0 ? 'text-green-600' : 'text-red-600'}`} data-label="Écart">{fmt(r.ecart)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${r.statut === 'VALIDE' || r.statut === 'CLOTURE' ? 'badge-success' : 'badge-warning'}`}>{r.statut}</span></td>
                  <td className="table-cell" data-label="Actions">
                    {r.statut === 'EN_COURS' && <button onClick={() => updateStatut(r.id, 'VALIDE')} className="text-xs text-primary-600 hover:underline">Valider</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">Nouveau Rapprochement</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Date bancaire *</label><input type="date" value={form.dateBancaire} onChange={e => setForm({ ...form, dateBancaire: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Date comptable *</label><input type="date" value={form.dateComptable} onChange={e => setForm({ ...form, dateComptable: e.target.value })} className="input-field" required /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Solde relevé *</label><input type="number" value={form.soldeReleve} onChange={e => setForm({ ...form, soldeReleve: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Solde comptable *</label><input type="number" value={form.soldeComptable} onChange={e => setForm({ ...form, soldeComptable: e.target.value })} className="input-field" required /></div>
                </div>
                {ecartPreview !== null && (
                  <p className={`text-sm font-semibold ${ecartPreview === 0 ? 'text-green-600' : 'text-red-600'}`}>Écart prévisionnel : {fmt(ecartPreview)}</p>
                )}
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
