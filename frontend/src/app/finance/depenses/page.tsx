'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, mergedComptes, parseCompteValue, MODE_PAIEMENT_LABELS, CATEGORIES_DEPENSE, useComptesFinanciers } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function DepensesPage() {
  const { caisses, comptes, reload: onChanged } = useComptesFinanciers();
  const [depenses, setDepenses] = useState<any[]>([]);
  const [dotations, setDotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ categorie: CATEGORIES_DEPENSE[0], designation: '', montant: '', modePaiement: 'ESPECES', compte: '', reference: '', observations: '', dotationId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.depenses.list({ page, limit: pageSize });
      setDepenses(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { setDepenses([]); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    financeApi.dotations.list({ limit: 200, statut: 'VALIDE' })
      .then(r => setDotations((r.data.data || []).filter((d: any) => Number(d.montantRestant) > 0)))
      .catch(() => setDotations([]));
  }, []);

  const options = mergedComptes(caisses, comptes);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const compte = parseCompteValue(form.compte);
    if (!compte) { toast.error('Sélectionnez un compte à débiter'); return; }
    try {
      await financeApi.depenses.create({
        categorie: form.categorie, designation: form.designation, montant: Number(form.montant),
        modePaiement: form.modePaiement, reference: form.reference || undefined, observations: form.observations || undefined,
        caisseId: compte.type === 'CAISSE' ? compte.id : undefined,
        compteBancaireId: compte.type === 'BANQUE' ? compte.id : undefined,
        dotationId: form.dotationId || undefined,
      });
      toast.success('Dépense enregistrée');
      setShowModal(false);
      setForm({ categorie: CATEGORIES_DEPENSE[0], designation: '', montant: '', modePaiement: 'ESPECES', compte: '', reference: '', observations: '', dotationId: '' });
      load();
      onChanged();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dépenses</h1><p className="text-sm text-gray-500">Gérez vos dépenses et sorties de caisse</p></div>

        <div className="flex justify-end">
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle Dépense
          </button>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Catégorie</th><th className="table-header">Désignation</th><th className="table-header">Compte débité</th><th className="table-header">Dotation</th><th className="table-header text-right">Montant</th><th className="table-header">Statut</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : depenses.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucune dépense enregistrée</td></tr>
              : depenses.map(d => (
                <tr key={d.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="N°">{d.numero}</td>
                  <td className="table-cell text-xs" data-label="Date">{new Date(d.dateDepense).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Catégorie">{d.categorie}</td>
                  <td className="table-cell" data-label="Désignation">{d.designation}</td>
                  <td className="table-cell" data-label="Compte débité">{d.caisse?.libelle || d.compteBancaire?.libelle || '-'}</td>
                  <td className="table-cell font-mono text-xs" data-label="Dotation">{d.dotation?.numero || '-'}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant">{fmt(d.montant)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${d.statut === 'VALIDE' ? 'badge-success' : 'badge-gray'}`}>{d.statut}</span></td>
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
                <h2 className="text-lg font-bold">Nouvelle Dépense</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div><label className="label">Catégorie *</label>
                  <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className="input-field">
                    {CATEGORIES_DEPENSE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Désignation *</label><input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Montant *</label><input type="number" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Mode de paiement</label>
                    <select value={form.modePaiement} onChange={e => setForm({ ...form, modePaiement: e.target.value })} className="input-field">
                      {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">Compte débité *</label>
                  <select value={form.compte} onChange={e => setForm({ ...form, compte: e.target.value })} className="input-field" required>
                    <option value="">Sélectionner...</option>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div><label className="label">Dotation (agent)</label>
                  <select value={form.dotationId} onChange={e => setForm({ ...form, dotationId: e.target.value })} className="input-field">
                    <option value="">Aucune</option>
                    {dotations.map(d => <option key={d.id} value={d.id}>{d.numero} — {d.agent?.nom} {d.agent?.prenom} (reste {fmt(d.montantRestant)})</option>)}
                  </select>
                </div>
                <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
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
