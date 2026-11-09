'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, Tiers, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import BoutonIcone, { IconeSupprimer } from '@/components/tables/BoutonIcone';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import PickerField from '@/components/ui/PickerField';
import { offresApi, clientsApi, dossiersApi, catalogueApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', ENVOYEE: 'badge-info', ACCEPTEE: 'badge-success',
  REFUSEE: 'badge-danger', EXPIREE: 'badge-danger', TRANSFORMEE: 'badge-success', ANNULEE: 'badge-danger',
};
const statutLabels: Record<string, string> = {
  BROUILLON: 'Brouillon', ENVOYEE: 'Envoyée', ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée', EXPIREE: 'Expirée', TRANSFORMEE: 'Transformée', ANNULEE: 'Annulée',
};

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

const ligneVide = () => ({ designation: '', quantite: '1', unite: 'FORFAIT', prixUnitaire: '', tauxTVA: 18 });

export default function OffresPage() {
  const router = useRouter();
  const [offres, setOffres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const setPageSize = (n: number) => { setPageSizeState(n); setPage(1); };

  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueCat, setCatalogueCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ clientId: '', dossierId: '', objet: '', description: '', dateValidite: '' });
  const [lignes, setLignes] = useState([ligneVide()]);

  const load = useCallback(() => {
    setLoading(true);
    offresApi.list({ page, limit: pageSize })
      .then(r => { setOffres(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setOffres([]))
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    clientsApi.listRef().then(r => setClients(r.data.data || [])).catch(() => {});
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
    catalogueApi.list().then(r => setCatalogue((r.data.data || []).filter((p: any) => p.actif))).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({ clientId: '', dossierId: '', objet: '', description: '', dateValidite: '' });
    setLignes([ligneVide()]);
  };

  const catalogueCategories = [...new Set(catalogue.map(p => p.categorie))];
  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));
  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));

  const addFromCatalogue = (p: any) => {
    const ligneFromCat = { designation: p.designation, quantite: '1', unite: 'FORFAIT', prixUnitaire: p.montantDefaut != null ? String(p.montantDefaut) : '', tauxTVA: Number(p.tauxTVA) || 0 };
    const estVide = lignes.length === 1 && !lignes[0].designation && !lignes[0].prixUnitaire;
    setLignes(estVide ? [ligneFromCat] : [...lignes, ligneFromCat]);
    toast.success(`${p.designation} ajouté`);
  };

  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const totalTVA = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0) * ((Number(l.tauxTVA) || 0) / 100), 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Sélectionnez un client'); return; }
    if (!form.objet.trim()) { toast.error("L'objet est requis"); return; }
    const lignesValides = lignes.filter(l => l.designation.trim() && Number(l.prixUnitaire) > 0);
    if (lignesValides.length === 0) { toast.error('Ajoutez au moins une ligne avec désignation et prix'); return; }
    setSaving(true);
    try {
      const res = await offresApi.create({ ...form, dossierId: form.dossierId || undefined, dateValidite: form.dateValidite || undefined, lignes: lignesValides });
      toast.success(`Offre ${res.data.data.numero} créée`);
      setShowModal(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleDelete = async (o: any) => {
    if (o.proformaId) { toast.error('Impossible de supprimer : déjà transformée en proforma'); return; }
    if (!confirm(`Supprimer définitivement l'offre ${o.numero} ?`)) return;
    try { await offresApi.delete(o.id); toast.success('Offre supprimée'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur lors de la suppression'); }
  };

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
  const supprimable = (o: any) => o.statut !== 'TRANSFORMEE';

  const colonnes: Colonne<any>[] = [
    { cle: 'offre', libelle: 'Offre', rendu: o => <DoubleLigne mono haut={o.numero} bas={`${fmtDate(o.dateOffre)} · valide jusqu'au ${fmtDate(o.dateValidite)}`} />, texte: o => o.numero },
    { cle: 'client', libelle: 'Client', rendu: o => <Tiers nom={o.client?.raisonSociale} detail={o.objet} />, texte: o => o.client?.raisonSociale || '' },
    { cle: 'ttc', libelle: 'Montant TTC', align: 'right', rendu: o => <Montant valeur={o.montantTTC} />, texte: o => String(o.montantTTC) },
    { cle: 'statut', libelle: 'Statut', rendu: o => <StatutPastille libelle={statutLabels[o.statut] || o.statut} ton={tonDepuisBadge(statutColors[o.statut])} />, texte: o => statutLabels[o.statut] || o.statut },
  ];

  const vide = <EmptyState titre="Aucune offre commerciale" description="Créez votre première offre." action={<button type="button" onClick={() => setShowModal(true)} className="btn-primary">Nouvelle offre</button>} />;

  const majLigne = (i: number, champ: string, valeur: string) => setLignes(lignes.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)));

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Offres commerciales"
          sousTitre={`${total} offre(s) — créez et suivez vos offres commerciales`}
          sousTitreMasqueMobile
          actions={
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="sm:hidden">Nouvelle</span><span className="hidden sm:inline">Nouvelle offre</span>
            </button>
          }
        />

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={offres}
            cleLigne={(o) => o.id}
            onClicLigne={(o) => router.push(`/offres/${o.id}`)}
            chargement={loading}
            nomExport="offres"
            actionsToujoursVisibles
            actions={(o) => (supprimable(o) ? <BoutonIcone titre="Supprimer" ton="danger" onClick={() => handleDelete(o)}><IconeSupprimer /></BoutonIcone> : null)}
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-24" />)
          ) : offres.length === 0 ? (
            <div className="card">{vide}</div>
          ) : offres.map(o => (
            <div key={o.id} className="card !p-0 overflow-hidden">
              <button type="button" onClick={() => router.push(`/offres/${o.id}`)} className="w-full text-left px-4 pt-3 pb-2 flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-primary-600 dark:text-primary-300 truncate">{o.numero}</span>
                  <StatutPastille libelle={statutLabels[o.statut] || o.statut} ton={tonDepuisBadge(statutColors[o.statut])} />
                </span>
                <span className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-gray-800 dark:text-gray-100 truncate">{o.client?.raisonSociale || '—'}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(o.montantTTC)} F</span>
                </span>
                <span className="text-xs text-gray-500 truncate">{o.objet}</span>
                <span className="text-[11px] text-gray-400">{fmtDate(o.dateOffre)} · valide jusqu&apos;au {fmtDate(o.dateValidite)}</span>
              </button>
              {supprimable(o) && <div className="flex justify-end px-4 pb-3"><BoutonIcone titre="Supprimer" ton="danger" onClick={() => handleDelete(o)}><IconeSupprimer /></BoutonIcone></div>}
            </div>
          ))}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} /></div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="Nouvelle offre commerciale"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Annuler</button>
            <button type="submit" form="form-offre" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : "Créer l'offre"}</button>
          </>
        }
      >
        <form id="form-offre" onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Client *</label>
              <PickerField value={form.clientId} onChange={id => setForm({ ...form, clientId: id })} options={clientOptions} placeholder="-- Sélectionner --" title="Sélectionner un client" searchPlaceholder="Raison sociale..." required />
            </div>
            <div>
              <label className="label">Dossier lié</label>
              <PickerField value={form.dossierId} onChange={id => setForm({ ...form, dossierId: id })} options={dossierOptions} placeholder="-- Aucun --" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." />
            </div>
          </div>

          <div>
            <label className="label">Objet *</label>
            <input type="text" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} className="input-field" placeholder="Offre de services de transit et dédouanement" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date de validité</label>
              <input type="date" value={form.dateValidite} onChange={e => setForm({ ...form, dateValidite: e.target.value })} className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="label !mb-0">Lignes de prestations</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowCatalogue(true)} className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Depuis le catalogue
                </button>
                <button type="button" onClick={() => setLignes([...lignes, ligneVide()])} className="text-xs font-medium text-primary-600 hover:underline">+ Ligne libre</button>
              </div>
            </div>
            <div className="space-y-2">
              {lignes.map((l, i) => (
                <div key={i} className="rounded-lg border border-gray-200 dark:border-surface-700 p-2.5 grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_5rem_8rem_auto] gap-2 items-center">
                  <input type="text" value={l.designation} onChange={e => majLigne(i, 'designation', e.target.value)} className="input-field col-span-3 sm:col-span-1" placeholder="Désignation" aria-label="Désignation" />
                  <input type="number" value={l.quantite} onChange={e => majLigne(i, 'quantite', e.target.value)} className="input-field" placeholder="Qté" aria-label="Quantité" min="0" step="0.01" />
                  <input type="number" value={l.prixUnitaire} onChange={e => majLigne(i, 'prixUnitaire', e.target.value)} className="input-field" placeholder="Prix unitaire" aria-label="Prix unitaire" min="0" />
                  {lignes.length > 1 ? (
                    <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))} aria-label="Retirer la ligne" className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-gray-200 dark:border-surface-700 bg-gray-200 dark:bg-surface-700 text-center">
              <div className="bg-white dark:bg-surface-800 py-2"><div className="text-[10px] uppercase text-gray-500">Total HT</div><div className="font-mono text-[13px] font-semibold text-gray-900 dark:text-white">{fmt(totalHT)}</div></div>
              <div className="bg-white dark:bg-surface-800 py-2"><div className="text-[10px] uppercase text-gray-500">TVA</div><div className="font-mono text-[13px] font-semibold text-gray-900 dark:text-white">{fmt(totalTVA)}</div></div>
              <div className="bg-primary-50 dark:bg-primary-500/15 py-2"><div className="text-[10px] uppercase text-gray-500">Total TTC</div><div className="font-mono text-[13px] font-bold text-primary-700 dark:text-primary-200">{fmt(totalHT + totalTVA)}</div></div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={showCatalogue} onClose={() => setShowCatalogue(false)} title="Catalogue des prestations" size="lg" footer={<button type="button" onClick={() => setShowCatalogue(false)} className="btn-primary">Fermer</button>}>
        <div className="space-y-3">
          <input type="text" value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} placeholder="Rechercher une prestation..." className="input-field text-sm" />
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button type="button" onClick={() => setCatalogueCat('')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${!catalogueCat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Toutes</button>
            {catalogueCategories.map(cat => (
              <button key={cat} type="button" onClick={() => setCatalogueCat(catalogueCat === cat ? '' : cat)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${catalogueCat === cat ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            {catalogue
              .filter(p => !catalogueCat || p.categorie === catalogueCat)
              .filter(p => !catalogueSearch || p.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) || p.code.toLowerCase().includes(catalogueSearch.toLowerCase()))
              .map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-surface-600 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-surface-700 transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.designation}</p>
                    <p className="text-[11px] text-gray-400">{p.categorie} — {p.code}{p.montantDefaut ? ` • Défaut : ${fmt(p.montantDefaut)} F` : ''}</p>
                  </div>
                  <button type="button" onClick={() => addFromCatalogue(p)} className="px-3 py-1.5 bg-primary-500 text-white rounded text-xs font-medium hover:bg-primary-600 whitespace-nowrap">+ Ajouter</button>
                </div>
              ))}
            {catalogue.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                Catalogue vide. <a href="/parametres/catalogue-prestations" target="_blank" className="text-primary-500 hover:underline">Ajoutez des prestations →</a>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
