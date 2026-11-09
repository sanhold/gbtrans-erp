'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, Tiers, StatutPastille } from '@/components/tables/cellules';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
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

  // Volontaire : la recherche/les filtres ne declenchent le rechargement qu'a la validation du formulaire,
  // pas a chaque frappe ; l'effet ne suit donc que la pagination.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, limit]);

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const statut = (f: any): { libelle: string; ton: 'success' | 'gray' } => f.actif ? { libelle: 'Actif', ton: 'success' } : { libelle: 'Inactif', ton: 'gray' };

  const colonnes: Colonne<any>[] = [
    { cle: 'fournisseur', libelle: 'Fournisseur', rendu: f => <Tiers nom={f.raisonSociale} detail={<span className="font-mono">{f.code}</span>} />, texte: f => f.raisonSociale },
    { cle: 'type', libelle: 'Type', rendu: f => <StatutPastille libelle={typeFournisseurLabels[f.type] || f.type} ton="info" />, texte: f => typeFournisseurLabels[f.type] || f.type },
    { cle: 'contact', libelle: 'Contact', rendu: f => <DoubleLigne haut={f.telephone || '—'} bas={f.email} />, texte: f => `${f.telephone || ''} ${f.email || ''}`.trim() },
    { cle: 'ville', libelle: 'Ville', masquerSous: 'xl', rendu: f => f.ville || '—', texte: f => f.ville || '' },
    { cle: 'statut', libelle: 'Statut', rendu: f => { const st = statut(f); return <StatutPastille libelle={st.libelle} ton={st.ton} />; }, texte: f => statut(f).libelle },
  ];

  const vide = <EmptyState titre="Aucun fournisseur" description="Créez votre premier fournisseur." action={<button type="button" onClick={() => setShowModal(true)} className="btn-primary">Nouveau fournisseur</button>} />;

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
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Fournisseurs"
          sousTitre={`${total} fournisseur(s)`}
          actions={
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="sm:hidden">Nouveau</span><span className="hidden sm:inline">Nouveau fournisseur</span>
            </button>
          }
        />

        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="card !p-3 sm:!p-4">
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-end">
            <div>
              <label className="label">Recherche</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" placeholder="Nom, code, téléphone..." />
            </div>
            <button type="submit" className="btn-primary">Rechercher</button>
          </div>
        </form>

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={fournisseurs}
            cleLigne={(f) => f.id}
            chargement={loading}
            nomExport="fournisseurs"
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-24" />)
          ) : fournisseurs.length === 0 ? (
            <div className="card">{vide}</div>
          ) : fournisseurs.map((f) => {
            const st = statut(f);
            return (
              <div key={f.id} className="card !px-4 !py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <Tiers nom={f.raisonSociale} detail={<span className="font-mono">{f.code}</span>} />
                  <StatutPastille libelle={st.libelle} ton={st.ton} />
                </div>
                <div className="text-xs text-gray-500 truncate">{f.telephone || '—'}{f.email ? ` · ${f.email}` : ''}</div>
                <div className="text-xs text-gray-500">{typeFournisseurLabels[f.type] || f.type}{f.ville ? ` · ${f.ville}` : ''}</div>
              </div>
            );
          })}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} /></div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau fournisseur"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-fournisseur" className="btn-primary">Créer</button>
          </>
        }
      >
        <form id="form-fournisseur" onSubmit={handleCreate} className="space-y-4">
          <div><label className="label">Raison sociale *</label><input type="text" value={form.raisonSociale} onChange={(e) => setForm({ ...form, raisonSociale: e.target.value })} className="input-field" required /></div>
          <div><label className="label">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">{Object.entries(typeFournisseurLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Téléphone</label><input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
            <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Adresse</label><input type="text" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="input-field" /></div>
        </form>
      </Modal>
    </AppLayout>
  );
}
