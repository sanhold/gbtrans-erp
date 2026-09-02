'use client';

import { useState, useCallback, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, mergedComptes, parseCompteValue, TYPE_OPERATION_LABELS, useComptesFinanciers } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const { caisses, comptes, tiers, reload: onChanged } = useComptesFinanciers();
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCompte, setFilterCompte] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [resume, setResume] = useState({ totalEntrees: 0, totalSorties: 0 });
  const [form, setForm] = useState({ type: 'ENCAISSEMENT', montant: '', libelle: '', dateOperation: '', reference: '', beneficiaire: '', observations: '', source: '', destination: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const compte = parseCompteValue(filterCompte);
    try {
      const res = await financeApi.operations.list({
        page, limit: pageSize,
        type: filterType || undefined,
        dateDebut: filterDateDebut || undefined,
        dateFin: filterDateFin || undefined,
        ...(compte?.type === 'CAISSE' && { caisseId: compte.id }),
        ...(compte?.type === 'BANQUE' && { compteBancaireId: compte.id }),
        ...(compte?.type === 'TIERS' && { compteTiersId: compte.id }),
      });
      setOperations(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setResume(res.data.resume || { totalEntrees: 0, totalSorties: 0 });
    } catch { setOperations([]); }
    finally { setLoading(false); }
  }, [page, pageSize, filterType, filterCompte, filterDateDebut, filterDateFin]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, pageSize]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const options = mergedComptes(caisses, comptes, tiers);
  const needsSource = ['DECAISSEMENT', 'RETRAIT', 'VIREMENT_INTERNE'].includes(form.type);
  const needsDestination = ['ENCAISSEMENT', 'DOTATION', 'VIREMENT_INTERNE'].includes(form.type);

  const { totalEntrees, totalSorties } = resume;
  const soldeNet = totalEntrees - totalSorties;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const source = parseCompteValue(form.source);
    const destination = parseCompteValue(form.destination);
    try {
      await financeApi.operations.create({
        type: form.type, montant: Number(form.montant), libelle: form.libelle,
        dateOperation: form.dateOperation || undefined, reference: form.reference || undefined,
        beneficiaire: form.beneficiaire || undefined, observations: form.observations || undefined,
        sourceType: source?.type, sourceId: source?.id,
        destinationType: destination?.type, destinationId: destination?.id,
      });
      toast.success('Opération enregistrée');
      setShowModal(false);
      setForm({ type: 'ENCAISSEMENT', montant: '', libelle: '', dateOperation: '', reference: '', beneficiaire: '', observations: '', source: '', destination: '' });
      load();
      onChanged();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1><p className="text-sm text-gray-500">Journal de tous les mouvements financiers</p></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">↘ Entrées</p><p className="text-base font-bold text-green-600">{fmt(totalEntrees)} F</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">↗ Sorties</p><p className="text-base font-bold text-red-600">{fmt(totalSorties)} F</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Solde net période</p><p className={`text-base font-bold ${soldeNet >= 0 ? 'text-primary-600' : 'text-red-600'}`}>{fmt(soldeNet)} F</p></div>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Nb. transactions</p><p className="text-base font-bold text-gray-900 dark:text-white">{total}</p></div>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-3">
          <div className="flex items-end flex-wrap gap-3">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field !w-auto">
              <option value="">Tous les types</option>
              {Object.entries(TYPE_OPERATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterCompte} onChange={e => setFilterCompte(e.target.value)} className="input-field !w-auto">
              <option value="">Tous les comptes</option>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div><label className="label !mb-1">Du</label><input type="date" value={filterDateDebut} onChange={e => setFilterDateDebut(e.target.value)} className="input-field !w-auto" /></div>
            <div><label className="label !mb-1">Au</label><input type="date" value={filterDateFin} onChange={e => setFilterDateFin(e.target.value)} className="input-field !w-auto" /></div>
            <button onClick={load} className="btn-secondary">Afficher</button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle Opération
          </button>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Type</th><th className="table-header">Compte</th><th className="table-header">Libellé</th><th className="table-header text-right">Montant</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : operations.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucune opération enregistrée</td></tr>
              : operations.map(op => (
                <tr key={op.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="N°">{op.numero}</td>
                  <td className="table-cell text-xs" data-label="Date">{new Date(op.dateOperation).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Type"><span className="badge badge-info">{TYPE_OPERATION_LABELS[op.type] || op.type}</span></td>
                  <td className="table-cell" data-label="Compte">{op.caisse?.libelle || op.compteBancaire?.libelle || op.compteTiers?.libelle || '-'}</td>
                  <td className="table-cell" data-label="Libellé">{op.libelle}</td>
                  <td className={`table-cell text-right font-mono font-semibold ${op.sens === 'ENTREE' ? 'text-green-600' : 'text-red-600'}`} data-label="Montant">{op.sens === 'ENTREE' ? '+' : '-'}{fmt(op.montant)}</td>
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
                <h2 className="text-lg font-bold">Nouvelle Opération</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div><label className="label">Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, source: '', destination: '' })} className="input-field">
                    {Object.entries(TYPE_OPERATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {needsSource && (
                  <div><label className="label">Compte source *</label>
                    <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="input-field" required>
                      <option value="">Sélectionner...</option>
                      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
                {needsDestination && (
                  <div><label className="label">Compte de destination *</label>
                    <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="input-field" required>
                      <option value="">Sélectionner...</option>
                      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Montant *</label><input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Date</label><input type="date" value={form.dateOperation} onChange={e => setForm({ ...form, dateOperation: e.target.value })} className="input-field" /></div>
                </div>
                <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Bénéficiaire</label><input type="text" value={form.beneficiaire} onChange={e => setForm({ ...form, beneficiaire: e.target.value })} className="input-field" /></div>
                </div>
                <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
                <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Enregistrer</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
