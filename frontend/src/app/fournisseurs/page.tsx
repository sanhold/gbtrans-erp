'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import api from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';

const typeFournisseurLabels: Record<string, string> = {
  PRESTATAIRE: 'Prestataire', TRANSPORTEUR: 'Transporteur', COMPAGNIE_MARITIME: 'Cie Maritime',
  COMPAGNIE_AERIENNE: 'Cie Aérienne', ACCONIER: 'Acconier', MAGASIN: 'Magasin',
  BANQUE: 'Banque', DOUANE: 'Douane', ASSURANCE: 'Assurance', TRANSITAIRE: 'Transitaire',
  MANUTENTION: 'Manutention', AUTRE: 'Autre',
};

const EMPTY_FORM = { raisonSociale: '', type: 'PRESTATAIRE', telephone: '', email: '', adresse: '', ville: 'Abidjan' };

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

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
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Fournisseurs"
          subtitle={`${total} fournisseur(s)`}
          actions={
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary hidden lg:inline-flex">
              <svg aria-hidden="true" className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau fournisseur
            </button>
          }
        />
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="card !p-3 flex flex-col sm:flex-row gap-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field flex-1" placeholder="Rechercher..." aria-label="Rechercher un fournisseur" />
          <button type="submit" className="btn-primary">Rechercher</button>
        </form>

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
                <SkeletonRows cols={7} />
              ) : fournisseurs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-600">
                  <p className="mb-3">{search ? 'Aucun fournisseur ne correspond à votre recherche.' : 'Aucun fournisseur pour le moment.'}</p>
                  <button type="button" onClick={() => setShowModal(true)} className="btn-primary">Créer un fournisseur</button>
                </td></tr>
              ) : fournisseurs.map((f) => (
                <tr key={f.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="Code">{f.code}</td>
                  <td className="table-cell font-medium" data-label="Raison Sociale" title={f.raisonSociale}>{f.raisonSociale}</td>
                  <td className="table-cell" data-label="Type"><span className="badge badge-info">{typeFournisseurLabels[f.type] || f.type}</span></td>
                  <td className="table-cell" data-label="Téléphone">{f.telephone || '-'}</td>
                  <td className="table-cell col-opt" data-label="Email" title={f.email || undefined}>{f.email || '-'}</td>
                  <td className="table-cell col-opt" data-label="Ville">{f.ville || '-'}</td>
                  <td className="table-cell" data-label="Statut">{f.actif ? <span className="badge badge-success">Actif</span> : <span className="badge badge-gray">Inactif</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>

      <Sheet open={showModal} onClose={() => setShowModal(false)} title="Nouveau fournisseur" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="label">Raison Sociale *</label><input type="text" value={form.raisonSociale} onChange={(e) => setForm({...form, raisonSociale: e.target.value})} className="input-field" required /></div>
          <div><label className="label">Type</label><select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="input-field">{Object.entries(typeFournisseurLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Téléphone</label><input type="tel" inputMode="tel" value={form.telephone} onChange={(e) => setForm({...form, telephone: e.target.value})} className="input-field" /></div>
            <div><label className="label">Email</label><input type="email" inputMode="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="label">Adresse</label><input type="text" value={form.adresse} onChange={(e) => setForm({...form, adresse: e.target.value})} className="input-field" /></div>
          <div className="sticky bottom-0 -mx-4 -mb-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary w-full sm:w-auto">Annuler</button>
            <button type="submit" className="btn-primary w-full sm:w-auto">Créer</button>
          </div>
        </form>
      </Sheet>
      <FAB label="Nouveau fournisseur" onClick={() => setShowModal(true)} />
    </AppLayout>
  );
}
