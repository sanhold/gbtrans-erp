'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function ComptesTiersPage() {
  const { tiers, loading, reload } = useComptesFinanciers();
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(tiers);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', type: 'PARTENAIRE', devise: 'XOF', observations: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.comptesTiers.create(form);
      toast.success('Compte tiers créé');
      setShowModal(false);
      setForm({ code: '', libelle: '', type: 'PARTENAIRE', devise: 'XOF', observations: '' });
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const toggleActif = async (c: any) => {
    try {
      await (c.actif ? financeApi.comptesTiers.desactiver(c.id) : financeApi.comptesTiers.activer(c.id));
      toast.success(c.actif ? 'Compte désactivé' : 'Compte activé');
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comptes Tiers</h1><p className="text-sm text-gray-500">Comptes Partenaire, Associé et autres tiers financiers</p></div>

        <div className="flex justify-end">
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau Compte Tiers
          </button>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Code</th><th className="table-header">Libellé</th><th className="table-header">Type</th><th className="table-header">Devise</th><th className="table-header text-right">Solde</th><th className="table-header">Statut</th><th className="table-header"></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : tiers.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun compte tiers. Créez un Partenaire ou un autre type de compte.</td></tr>
              : paged.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="Code">{c.code}</td>
                  <td className="table-cell" data-label="Libellé">{c.libelle}</td>
                  <td className="table-cell" data-label="Type"><span className="badge badge-warning">{c.type}</span></td>
                  <td className="table-cell" data-label="Devise">{c.devise}</td>
                  <td className="table-cell text-right font-mono" data-label="Solde">{fmt(c.solde)}</td>
                  <td className="table-cell" data-label="Statut">{c.actif ? <span className="badge badge-success">Actif</span> : <span className="badge badge-gray">Inactif</span>}</td>
                  <td className="table-cell" data-label="Actions"><button onClick={() => toggleActif(c)} className="text-xs text-primary-600 hover:underline">{c.actif ? 'Désactiver' : 'Activer'}</button></td>
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
                <h2 className="text-lg font-bold">Nouveau Compte Tiers</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div><label className="label">Code *</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" required placeholder="TIE001" /></div>
                <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>
                <div>
                  <label className="label">Type *</label>
                  <input type="text" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field" required placeholder="PARTENAIRE" list="types-comptes-tiers" />
                  <datalist id="types-comptes-tiers"><option value="PARTENAIRE" /><option value="ASSOCIE" /><option value="AUTRE" /></datalist>
                </div>
                <div><label className="label">Devise</label><input type="text" value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })} className="input-field" /></div>
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
