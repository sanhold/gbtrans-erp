'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { clientsApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    raisonSociale: '', sigle: '', type: 'ENTREPRISE', ncc: '', rccm: '',
    adresse: '', ville: 'Abidjan', pays: 'Côte d\'Ivoire',
    telephone: '', mobile: '', email: '', conditionPaiement: 30,
  });

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await clientsApi.list({ page, limit, search: search || undefined });
      setClients(res.data.data);
      setTotal(res.data.pagination.total);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, [page, limit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadClients();
  };

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientsApi.create(form);
      toast.success('Client créé avec succès');
      setShowModal(false);
      setForm({ raisonSociale: '', sigle: '', type: 'ENTREPRISE', ncc: '', rccm: '', adresse: '', ville: 'Abidjan', pays: 'Côte d\'Ivoire', telephone: '', mobile: '', email: '', conditionPaiement: 30 });
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
            <p className="text-sm text-gray-500">{total} client(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau Client
          </button>
        </div>

        <div className="card !p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field flex-1" placeholder="Rechercher par nom, code, NCC, email..." />
            <button type="submit" className="btn-primary">Rechercher</button>
          </form>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Code</th>
                <th className="table-header">Raison Sociale</th>
                <th className="table-header">Type</th>
                <th className="table-header">NCC</th>
                <th className="table-header">Téléphone</th>
                <th className="table-header">Email</th>
                <th className="table-header">Ville</th>
                <th className="table-header">Dossiers</th>
                <th className="table-header">Factures</th>
                <th className="table-header">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-500">Aucun client trouvé. Créez votre premier client.</td></tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell font-medium text-primary-600" data-label="Code">{c.code}</td>
                    <td className="table-cell font-medium" data-label="Raison Sociale">{c.raisonSociale}</td>
                    <td className="table-cell" data-label="Type"><span className="badge badge-info">{c.type}</span></td>
                    <td className="table-cell font-mono text-xs" data-label="NCC">{c.ncc || '-'}</td>
                    <td className="table-cell" data-label="Téléphone">{c.telephone || c.mobile || '-'}</td>
                    <td className="table-cell" data-label="Email">{c.email || '-'}</td>
                    <td className="table-cell" data-label="Ville">{c.ville || '-'}</td>
                    <td className="table-cell text-center" data-label="Dossiers">{c._count?.dossiers || 0}</td>
                    <td className="table-cell text-center" data-label="Factures">{c._count?.factures || 0}</td>
                    <td className="table-cell" data-label="Statut">
                      {c.bloque ? <span className="badge badge-danger">Bloqué</span>
                        : c.actif ? <span className="badge badge-success">Actif</span>
                        : <span className="badge badge-gray">Inactif</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>

      {/* Modal Nouveau Client */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouveau Client</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2"><label className="label">Raison Sociale *</label><input type="text" value={form.raisonSociale} onChange={(e) => setForm({...form, raisonSociale: e.target.value})} className="input-field" required /></div>
                <div><label className="label">Sigle</label><input type="text" value={form.sigle} onChange={(e) => setForm({...form, sigle: e.target.value})} className="input-field" /></div>
                <div><label className="label">Type</label><select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="input-field"><option value="ENTREPRISE">Entreprise</option><option value="PARTICULIER">Particulier</option><option value="ADMINISTRATION">Administration</option><option value="ONG">ONG</option><option value="DIPLOMATIQUE">Diplomatique</option></select></div>
                <div><label className="label">NCC</label><input type="text" value={form.ncc} onChange={(e) => setForm({...form, ncc: e.target.value})} className="input-field" /></div>
                <div><label className="label">RCCM</label><input type="text" value={form.rccm} onChange={(e) => setForm({...form, rccm: e.target.value})} className="input-field" /></div>
                <div className="col-span-2"><label className="label">Adresse</label><input type="text" value={form.adresse} onChange={(e) => setForm({...form, adresse: e.target.value})} className="input-field" /></div>
                <div><label className="label">Ville</label><input type="text" value={form.ville} onChange={(e) => setForm({...form, ville: e.target.value})} className="input-field" /></div>
                <div><label className="label">Pays</label><input type="text" value={form.pays} onChange={(e) => setForm({...form, pays: e.target.value})} className="input-field" /></div>
                <div><label className="label">Téléphone</label><input type="text" value={form.telephone} onChange={(e) => setForm({...form, telephone: e.target.value})} className="input-field" /></div>
                <div><label className="label">Mobile</label><input type="text" value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} className="input-field" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" /></div>
                <div><label className="label">Délai paiement (jours)</label><input type="number" value={form.conditionPaiement} onChange={(e) => setForm({...form, conditionPaiement: parseInt(e.target.value)})} className="input-field" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">Créer le client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
