'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import api from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const typeFournisseurLabels: Record<string, string> = {
  PRESTATAIRE: 'Prestataire', TRANSPORTEUR: 'Transporteur', COMPAGNIE_MARITIME: 'Cie Maritime',
  COMPAGNIE_AERIENNE: 'Cie Aérienne', ACCONIER: 'Acconier', MAGASIN: 'Magasin',
  BANQUE: 'Banque', DOUANE: 'Douane', ASSURANCE: 'Assurance', TRANSITAIRE: 'Transitaire',
  MANUTENTION: 'Manutention', AUTRE: 'Autre',
};

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ raisonSociale: '', type: 'PRESTATAIRE', telephone: '', email: '', adresse: '', ville: 'Abidjan' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fournisseurs', { params: { page, limit, search: search || undefined } });
      setFournisseurs(res.data.data);
      setTotal(res.data.pagination?.total || 0);
    } catch { setFournisseurs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, limit]);

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fournisseurs', form);
      toast.success('Fournisseur créé');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fournisseurs</h1>
            <p className="text-sm text-gray-500">{total} fournisseur(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau Fournisseur
          </button>
        </div>

        <div className="card !p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="flex gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field flex-1" placeholder="Rechercher..." />
            <button type="submit" className="btn-primary">Rechercher</button>
          </form>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Code</th><th className="table-header">Raison Sociale</th>
              <th className="table-header">Type</th><th className="table-header">Téléphone</th>
              <th className="table-header">Email</th><th className="table-header">Ville</th>
              <th className="table-header">Statut</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : fournisseurs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun fournisseur. Créez votre premier fournisseur.</td></tr>
              ) : fournisseurs.map((f) => (
                <tr key={f.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="Code">{f.code}</td>
                  <td className="table-cell font-medium" data-label="Raison Sociale">{f.raisonSociale}</td>
                  <td className="table-cell" data-label="Type"><span className="badge badge-info">{typeFournisseurLabels[f.type] || f.type}</span></td>
                  <td className="table-cell" data-label="Téléphone">{f.telephone || '-'}</td>
                  <td className="table-cell" data-label="Email">{f.email || '-'}</td>
                  <td className="table-cell" data-label="Ville">{f.ville || '-'}</td>
                  <td className="table-cell" data-label="Statut">{f.actif ? <span className="badge badge-success">Actif</span> : <span className="badge badge-gray">Inactif</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Nouveau Fournisseur</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div><label className="label">Raison Sociale *</label><input type="text" value={form.raisonSociale} onChange={(e) => setForm({...form, raisonSociale: e.target.value})} className="input-field" required /></div>
              <div><label className="label">Type</label><select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="input-field">{Object.entries(typeFournisseurLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Téléphone</label><input type="text" value={form.telephone} onChange={(e) => setForm({...form, telephone: e.target.value})} className="input-field" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" /></div>
              </div>
              <div><label className="label">Adresse</label><input type="text" value={form.adresse} onChange={(e) => setForm({...form, adresse: e.target.value})} className="input-field" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Créer</button></div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
