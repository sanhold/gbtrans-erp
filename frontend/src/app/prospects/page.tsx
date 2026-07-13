'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import api from '@/lib/api';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  NOUVEAU: 'badge-info', CONTACTE: 'badge-warning', EN_NEGOCIATION: 'badge-warning',
  GAGNE: 'badge-success', PERDU: 'badge-danger', ARCHIVE: 'badge-gray',
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { paged, page, setPage, pageSize, setPageSize, total: totalProspects, totalPages } = usePagination(prospects);
  const [form, setForm] = useState({
    raisonSociale: '', contact: '', telephone: '', email: '',
    activite: '', source: '', statut: 'NOUVEAU', notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/prospects');
      setProspects(res.data.data || []);
    } catch { setProspects([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/prospects', form);
      toast.success('Prospect ajouté');
      setShowModal(false);
      setForm({ raisonSociale: '', contact: '', telephone: '', email: '', activite: '', source: '', statut: 'NOUVEAU', notes: '' });
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prospects</h1>
            <p className="text-sm text-gray-500">{prospects.length} prospect(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau Prospect
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Nouveaux', statut: 'NOUVEAU', color: 'blue' },
            { label: 'En négociation', statut: 'EN_NEGOCIATION', color: 'amber' },
            { label: 'Gagnés', statut: 'GAGNE', color: 'green' },
            { label: 'Perdus', statut: 'PERDU', color: 'red' },
          ].map(s => (
            <div key={s.label} className="stat-card !p-4">
              <div className={`w-9 h-9 rounded-lg bg-${s.color}-50 flex items-center justify-center`}>
                <span className={`text-lg font-bold text-${s.color}-500`}>{prospects.filter(p => p.statut === s.statut).length}</span>
              </div>
              <div><p className="text-xs text-gray-500 uppercase">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Raison Sociale</th>
              <th className="table-header">Contact</th>
              <th className="table-header">Téléphone</th>
              <th className="table-header">Email</th>
              <th className="table-header">Activité</th>
              <th className="table-header">Source</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Date</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"/>Chargement...</td></tr>
              ) : prospects.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucun prospect. Ajoutez votre premier prospect commercial.</td></tr>
              ) : paged.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell font-medium" data-label="Raison Sociale">{p.raisonSociale}</td>
                  <td className="table-cell" data-label="Contact">{p.contact || '-'}</td>
                  <td className="table-cell" data-label="Téléphone">{p.telephone || '-'}</td>
                  <td className="table-cell" data-label="Email">{p.email || '-'}</td>
                  <td className="table-cell" data-label="Activité">{p.activite || '-'}</td>
                  <td className="table-cell" data-label="Source">{p.source || '-'}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[p.statut] || 'badge-gray'}`}>{p.statut?.replace(/_/g, ' ')}</span></td>
                  <td className="table-cell text-xs" data-label="Date">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={totalProspects} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Nouveau Prospect</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div><label className="label">Raison Sociale / Nom *</label><input type="text" value={form.raisonSociale} onChange={e => setForm({...form, raisonSociale: e.target.value})} className="input-field" required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Contact</label><input type="text" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} className="input-field" /></div>
                <div><label className="label">Téléphone</label><input type="text" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} className="input-field" /></div>
              </div>
              <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Activité</label><input type="text" value={form.activite} onChange={e => setForm({...form, activite: e.target.value})} className="input-field" placeholder="Import, BTP..." /></div>
                <div><label className="label">Source</label><select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="input-field">
                  <option value="">--</option><option>Recommandation</option><option>Site web</option><option>Salon</option><option>Démarchage</option><option>Publicité</option><option>Partenaire</option><option>Autre</option>
                </select></div>
              </div>
              <div><label className="label">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" rows={2} /></div>
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Ajouter</button></div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
