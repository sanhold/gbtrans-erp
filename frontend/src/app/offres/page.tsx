'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
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

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

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

  const load = () => {
    setLoading(true);
    offresApi.list({ page, limit: pageSize })
      .then(r => { setOffres(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setOffres([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, pageSize]);

  useEffect(() => {
    clientsApi.list({ limit: 500 }).then(r => setClients(r.data.data || [])).catch(() => {});
    dossiersApi.list({ limit: 500 }).then(r => setDossiers(r.data.data || [])).catch(() => {});
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offres Commerciales</h1><p className="text-sm text-gray-500">{total} offre(s) — créez et suivez vos offres commerciales</p></div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle Offre
          </button>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">N°</th><th className="table-header">Client</th><th className="table-header">Objet</th>
              <th className="table-header text-right">Montant TTC</th><th className="table-header">Date</th>
              <th className="table-header">Validité</th><th className="table-header">Statut</th><th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"/>Chargement...</td></tr>
              : offres.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucune offre commerciale. Créez votre première offre.</td></tr>
              : offres.map(o => (
                <tr key={o.id} className="table-row cursor-pointer" onClick={() => router.push(`/offres/${o.id}`)}>
                  <td className="table-cell font-medium text-primary-600" data-label="N°">{o.numero}</td>
                  <td className="table-cell" data-label="Client">{o.client?.raisonSociale}</td>
                  <td className="table-cell" data-label="Objet">{o.objet}</td>
                  <td className="table-cell text-right font-mono font-bold" data-label="Montant TTC">{fmt(o.montantTTC)}</td>
                  <td className="table-cell text-xs" data-label="Date">{new Date(o.dateOffre).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-xs" data-label="Validité">{new Date(o.dateValidite).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[o.statut] || 'badge-gray'}`}>{statutLabels[o.statut] || o.statut}</span></td>
                  <td className="table-cell" data-label="Actions">
                    {!['TRANSFORMEE'].includes(o.statut) && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(o); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouvelle Offre Commerciale</h2>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Lignes de prestations</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setShowCatalogue(true)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Choisir depuis le catalogue
                    </button>
                    <button type="button" onClick={() => setLignes([...lignes, ligneVide()])} className="text-xs text-primary-600 hover:underline">+ Ligne libre</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {lignes.map((l, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" value={l.designation} onChange={e => setLignes(lignes.map((x, j) => j === i ? { ...x, designation: e.target.value } : x))} className="input-field flex-1" placeholder="Désignation" />
                      <input type="number" value={l.quantite} onChange={e => setLignes(lignes.map((x, j) => j === i ? { ...x, quantite: e.target.value } : x))} className="input-field w-20" placeholder="Qté" min="0" step="0.01" />
                      <input type="number" value={l.prixUnitaire} onChange={e => setLignes(lignes.map((x, j) => j === i ? { ...x, prixUnitaire: e.target.value } : x))} className="input-field w-32" placeholder="Prix unitaire" min="0" />
                      {lignes.length > 1 && (
                        <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-6 mt-3 text-sm">
                  <span className="text-gray-500">Total HT : <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(totalHT)} XOF</span></span>
                  <span className="text-gray-500">TVA : <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(totalTVA)} XOF</span></span>
                  <span className="text-gray-500">Total TTC : <span className="font-mono font-bold text-primary-600">{fmt(totalHT + totalTVA)} XOF</span></span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer l\'offre'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCatalogue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCatalogue(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Catalogue des Prestations</h3>
              <button type="button" onClick={() => setShowCatalogue(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 pt-3 space-y-2">
              <input type="text" value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} placeholder="Rechercher une prestation..." className="input-field text-sm" autoFocus />
              <div className="flex gap-1 flex-wrap">
                <button type="button" onClick={() => setCatalogueCat('')} className={`px-3 py-1 rounded-full text-xs font-medium ${!catalogueCat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Toutes</button>
                {catalogueCategories.map(cat => (
                  <button key={cat} type="button" onClick={() => setCatalogueCat(catalogueCat === cat ? '' : cat)} className={`px-3 py-1 rounded-full text-xs font-medium ${catalogueCat === cat ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {catalogue
                .filter(p => !catalogueCat || p.categorie === catalogueCat)
                .filter(p => !catalogueSearch || p.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) || p.code.toLowerCase().includes(catalogueSearch.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-surface-600 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-surface-700 transition-all">
                    <div>
                      <p className="text-sm font-medium">{p.designation}</p>
                      <p className="text-[10px] text-gray-400">{p.categorie} — {p.code}{p.montantDefaut ? ` • Défaut: ${fmt(p.montantDefaut)} F` : ''}</p>
                    </div>
                    <button type="button" onClick={() => addFromCatalogue(p)} className="px-3 py-1 bg-primary-500 text-white rounded text-xs font-medium hover:bg-primary-600 whitespace-nowrap">+ Ajouter</button>
                  </div>
                ))}
              {catalogue.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  Catalogue vide. <a href="/parametres/catalogue-prestations" target="_blank" className="text-primary-500 hover:underline">Ajoutez des prestations →</a>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-surface-700 flex justify-end">
              <button type="button" onClick={() => setShowCatalogue(false)} className="btn-primary">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
