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

  // Volontaire : la recherche/les filtres ne declenchent le rechargement qu'a la validation du formulaire,
  // pas a chaque frappe ; l'effet ne suit donc que la pagination.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const statut = (c: any): { libelle: string; ton: 'danger' | 'success' | 'gray' } =>
    c.bloque ? { libelle: 'Bloqué', ton: 'danger' } : c.actif ? { libelle: 'Actif', ton: 'success' } : { libelle: 'Inactif', ton: 'gray' };
  const typeLibelle: Record<string, string> = { ENTREPRISE: 'Entreprise', PARTICULIER: 'Particulier', ADMINISTRATION: 'Administration', ONG: 'ONG', DIPLOMATIQUE: 'Diplomatique' };

  const colonnes: Colonne<any>[] = [
    { cle: 'client', libelle: 'Client', rendu: c => <Tiers nom={c.raisonSociale} detail={<span className="font-mono">{c.code}</span>} />, texte: c => c.raisonSociale },
    { cle: 'type', libelle: 'Type', masquerSous: 'xl', rendu: c => typeLibelle[c.type] || c.type || '—', texte: c => c.type || '' },
    { cle: 'contact', libelle: 'Contact', rendu: c => <DoubleLigne haut={c.telephone || c.mobile || '—'} bas={c.email} />, texte: c => `${c.telephone || c.mobile || ''} ${c.email || ''}`.trim() },
    { cle: 'ncc', libelle: 'NCC', masquerSous: '2xl', mono: true, rendu: c => c.ncc || '—', texte: c => c.ncc || '' },
    { cle: 'ville', libelle: 'Ville', masquerSous: 'xl', rendu: c => c.ville || '—', texte: c => c.ville || '' },
    { cle: 'dossiers', libelle: 'Dossiers', align: 'right', rendu: c => <span className="tabular-nums">{c._count?.dossiers || 0}</span>, texte: c => String(c._count?.dossiers || 0) },
    { cle: 'factures', libelle: 'Factures', align: 'right', rendu: c => <span className="tabular-nums">{c._count?.factures || 0}</span>, texte: c => String(c._count?.factures || 0) },
    { cle: 'statut', libelle: 'Statut', rendu: c => { const st = statut(c); return <StatutPastille libelle={st.libelle} ton={st.ton} />; }, texte: c => statut(c).libelle },
  ];

  const vide = <EmptyState titre="Aucun client trouvé" description="Créez votre premier client." action={<button type="button" onClick={() => setShowModal(true)} className="btn-primary">Nouveau client</button>} />;


  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          titre="Clients"
          sousTitre={`${total} client(s)`}
          actions={
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau client
            </button>
          }
        />

        <form onSubmit={handleSearch} className="card !p-3 sm:!p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="label">Recherche</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" placeholder="Nom, code, NCC, email..." />
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto">Rechercher</button>
          </div>
        </form>

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={clients}
            cleLigne={(c) => c.id}
            chargement={loading}
            nomExport="clients"
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-24" />)
          ) : clients.length === 0 ? (
            <div className="card">{vide}</div>
          ) : clients.map(c => {
            const st = statut(c);
            return (
              <div key={c.id} className="card !px-4 !py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <Tiers nom={c.raisonSociale} detail={<span className="font-mono">{c.code}</span>} />
                  <StatutPastille libelle={st.libelle} ton={st.ton} />
                </div>
                <div className="text-xs text-gray-500 truncate">{c.telephone || c.mobile || '—'}{c.email ? ` · ${c.email}` : ''}</div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{typeLibelle[c.type] || c.type}{c.ville ? ` · ${c.ville}` : ''}</span>
                  <span className="ml-auto">{c._count?.dossiers || 0} dossier(s)</span>
                  <span>{c._count?.factures || 0} facture(s)</span>
                </div>
              </div>
            );
          })}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} /></div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau client"
        description="Les champs marqués d'une étoile sont obligatoires."
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-client" className="btn-primary">Créer le client</button>
          </>
        }
      >
        <form id="form-client" onSubmit={handleCreate} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Identité</legend>
            <div><label className="label">Raison sociale *</label><input type="text" value={form.raisonSociale} onChange={(e) => setForm({ ...form, raisonSociale: e.target.value })} className="input-field" required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Sigle</label><input type="text" value={form.sigle} onChange={(e) => setForm({ ...form, sigle: e.target.value })} className="input-field" /></div>
              <div><label className="label">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field"><option value="ENTREPRISE">Entreprise</option><option value="PARTICULIER">Particulier</option><option value="ADMINISTRATION">Administration</option><option value="ONG">ONG</option><option value="DIPLOMATIQUE">Diplomatique</option></select></div>
              <div><label className="label">NCC</label><input type="text" value={form.ncc} onChange={(e) => setForm({ ...form, ncc: e.target.value })} className="input-field" /></div>
              <div><label className="label">RCCM</label><input type="text" value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} className="input-field" /></div>
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Coordonnées</legend>
            <div><label className="label">Adresse</label><input type="text" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="input-field" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Ville</label><input type="text" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className="input-field" /></div>
              <div><label className="label">Pays</label><input type="text" value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} className="input-field" /></div>
              <div><label className="label">Téléphone</label><input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="input-field" /></div>
              <div><label className="label">Mobile</label><input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="input-field" /></div>
            </div>
            <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Facturation</legend>
            <label className="label">Délai de paiement (jours)</label>
            <input type="number" min={0} value={form.conditionPaiement} onChange={(e) => setForm({ ...form, conditionPaiement: parseInt(e.target.value) || 0 })} className="input-field sm:w-40" />
          </fieldset>
        </form>
      </Modal>
    </AppLayout>
  );
}
