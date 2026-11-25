'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Discret, Tronque, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
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
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Prospects"
          sousTitre={`${prospects.length} prospect(s)`}
          icone="M9 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-3 3-5 7-5s7 2 7 5M19 8v6M16 11h6"
          actions={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau prospect
            </button>
          }
        />
        <ListeResponsive
          colonnes={[
            { cle: 'nom', libelle: 'Raison sociale', texte: (p: any) => p.raisonSociale, rendu: (p: any) => <Tronque texte={p.raisonSociale} largeur="18rem" /> },
            { cle: 'contact', libelle: 'Contact', masquerSous: 'xl' as const, texte: (p: any) => p.contact || '', rendu: (p: any) => <Tronque texte={p.contact} largeur="12rem" /> },
            { cle: 'tel', libelle: 'Téléphone', texte: (p: any) => p.telephone || '', rendu: (p: any) => <span className="tabular-nums">{p.telephone || '—'}</span> },
            { cle: 'email', libelle: 'Email', masquerSous: 'xl' as const, texte: (p: any) => p.email || '', rendu: (p: any) => <Tronque texte={p.email} largeur="14rem" /> },
            { cle: 'activite', libelle: 'Activité', masquerSous: '2xl' as const, texte: (p: any) => p.activite || '', rendu: (p: any) => <Tronque texte={p.activite} largeur="12rem" /> },
            { cle: 'source', libelle: 'Source', masquerSous: '2xl' as const, texte: (p: any) => p.source || '', rendu: (p: any) => <Tronque texte={p.source} largeur="10rem" /> },
            { cle: 'statut', libelle: 'Statut', texte: (p: any) => (p.statut || '').replace(/_/g, ' '), rendu: (p: any) => <StatutPastille libelle={(p.statut || '').replace(/_/g, ' ')} ton={tonDepuisBadge(statutColors[p.statut])} /> },
            { cle: 'date', libelle: 'Date', texte: (p: any) => new Date(p.createdAt).toLocaleDateString('fr-FR'), rendu: (p: any) => <Discret>{new Date(p.createdAt).toLocaleDateString('fr-FR')}</Discret> },
          ]}
          lignes={paged}
          cleLigne={(p: any) => p.id}
          chargement={loading}
          nomExport="prospects"
          carte={(p: any) => ({ titre: p.raisonSociale, sousTitre: p.contact || p.telephone || undefined, statut: <StatutPastille libelle={(p.statut || '').replace(/_/g, ' ')} ton={tonDepuisBadge(statutColors[p.statut])} />, details: [p.telephone, p.email].filter(Boolean).join(' · ') || undefined })}
          pagination={{ page, totalPages, total: totalProspects, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre="Aucun prospect" description="Ajoutez votre premier prospect commercial." />}
        />
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
