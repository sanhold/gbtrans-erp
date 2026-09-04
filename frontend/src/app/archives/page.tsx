'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { documentsApi, getFileUrl, clientsApi, dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const CATEGORIE_LABELS: Record<string, string> = {
  BL: 'BL',
  FACTURE_COMMERCIALE: 'Factures Commerciales',
  PACKING_LIST: 'Packing Lists',
  CERTIFICAT_ORIGINE: 'Certificats d\'Origine',
  CERTIFICAT_CONFORMITE: 'Certificats de Conformité',
  DECLARATION_DOUANE: 'Déclarations Douane',
  BON_LIVRAISON: 'Bons de Livraison',
  CONNAISSEMENT: 'Connaissements',
  LETTRE_VOITURE: 'Lettres de Voiture',
  ASSURANCE: 'Assurances',
  LICENCE_IMPORT: 'Licences Import',
  LICENCE_EXPORT: 'Licences Export',
  AUTORISATION: 'Autorisations',
  CONTRAT: 'Contrats',
  CERTIFICAT_PROLONGATION_AT: 'Certificats Prolongation AT',
  CERTIFICAT_APUREMENT_AT: 'Certificats Apurement AT',
  CORRESPONDANCE: 'Correspondances',
  PHOTO: 'Photos',
  AUTRE: 'Autres',
};

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const fmtSize = (n: number) => n < 1024 ? `${n} o` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} Ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`;

export default function ArchivesPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categorieFiltre, setCategorieFiltre] = useState('');
  const [dossierFiltre, setDossierFiltre] = useState('');
  const [dossierSearch, setDossierSearch] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const setPageSize = (n: number) => { setPageSizeState(n); setPage(1); };
  const [countsByCategorie, setCountsByCategorie] = useState<Record<string, number>>({});

  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ categorie: '', description: '', dossierId: '', clientId: '' });

  useEffect(() => {
    clientsApi.list({ limit: 500 }).then(r => setClients(r.data.data || [])).catch(() => {});
    dossiersApi.list({ limit: 500 }).then(r => setDossiers(r.data.data || [])).catch(() => {});
    documentsApi.comptageCategories().then(r => setCountsByCategorie(r.data.data || {})).catch(() => {});
  }, []);

  const resetUploadForm = () => { setUploadFile(null); setUploadForm({ categorie: '', description: '', dossierId: '', clientId: '' }); };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) { toast.error('Sélectionnez un fichier'); return; }
    if (!uploadForm.categorie) { toast.error('Catégorie requise'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('categorie', uploadForm.categorie);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.dossierId) formData.append('dossierId', uploadForm.dossierId);
      if (uploadForm.clientId) formData.append('clientId', uploadForm.clientId);
      await documentsApi.upload(formData);
      toast.success('Document archivé');
      setShowUpload(false);
      resetUploadForm();
      load();
      documentsApi.comptageCategories().then(r => setCountsByCategorie(r.data.data || {})).catch(() => {});
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur lors de l\'import'); }
    finally { setUploading(false); }
  };

  const load = () => {
    setLoading(true);
    const params: any = { page, limit: pageSize };
    if (appliedSearch) params.search = appliedSearch;
    if (categorieFiltre) params.categorie = categorieFiltre;
    if (dossierFiltre) params.dossierId = dossierFiltre;
    documentsApi.list(params)
      .then(res => { setDocuments(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [appliedSearch, categorieFiltre, dossierFiltre, page, pageSize]);
  useEffect(() => { setPage(1); }, [appliedSearch, categorieFiltre, dossierFiltre]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setAppliedSearch(search); };

  const dossierSelectionne = dossiers.find(d => d.id === dossierFiltre);
  const dossiersFiltres = dossiers.filter(d => {
    if (!dossierSearch) return true;
    const q = dossierSearch.toLowerCase();
    return d.numeroPhysique?.toLowerCase().includes(q) || d.numero?.toLowerCase().includes(q) || d.client?.raisonSociale?.toLowerCase().includes(q) || d.numeroBL?.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archives Numériques</h1>
            <p className="text-sm text-gray-500">GED - Gestion Électronique des Documents</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={`btn-secondary flex items-center ${showCategories ? '!bg-primary-50 !text-primary-600 dark:!bg-primary-900/30' : ''}`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              {categorieFiltre ? CATEGORIE_LABELS[categorieFiltre] : 'Catégories'}
              <svg className={`w-3.5 h-3.5 ml-2 transition-transform ${showCategories ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <button onClick={() => setShowUpload(true)} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importer un document
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6">
            {showCategories && (
              <div className="card !p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Choisir une catégorie de document</h3>
                  <button onClick={() => setShowCategories(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Fermer">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Object.entries(CATEGORIE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setCategorieFiltre(categorieFiltre === key ? '' : key); setShowCategories(false); }}
                      className={`card !p-4 text-center cursor-pointer hover:shadow-elevated hover:border-primary-300 transition-all group ${categorieFiltre === key ? 'border-primary-400 ring-2 ring-primary-100' : ''}`}
                    >
                      <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-500 transition-colors">{label}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{countsByCategorie[key] || 0} fichier(s)</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="card !p-4">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[250px]">
                  <label className="label">Recherche</label>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="Nom du fichier, description..." />
                </div>
                {categorieFiltre && (
                  <div className="text-sm text-gray-500">Catégorie : <span className="font-medium text-primary-600">{CATEGORIE_LABELS[categorieFiltre]}</span> <button type="button" onClick={() => setCategorieFiltre('')} className="ml-1 text-primary-600 hover:underline">✕</button></div>
                )}
                {dossierFiltre && (
                  <div className="text-sm text-gray-500">Dossier : <span className="font-medium text-primary-600">{dossierSelectionne?.numero}</span> <button type="button" onClick={() => setDossierFiltre('')} className="ml-1 text-primary-600 hover:underline">✕</button></div>
                )}
                <button type="submit" className="btn-primary">Afficher</button>
              </form>
            </div>

            {!showCategories && (
              <div className="card !p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-surface-700">
                  <h3 className="text-lg font-semibold">
                    Documents
                    {categorieFiltre ? ` — ${CATEGORIE_LABELS[categorieFiltre]}` : ''}
                    {dossierFiltre ? ` — Dossier ${dossierSelectionne?.numero}` : !categorieFiltre ? ' récents' : ''}
                  </h3>
                </div>
                <div className="table-container !shadow-none !border-0">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Nom</th>
                        <th className="table-header">Catégorie</th>
                        <th className="table-header">Lié à</th>
                        <th className="table-header">Taille</th>
                        <th className="table-header">Date</th>
                        <th className="table-header"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
                      ) : documents.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun document archivé</td></tr>
                      ) : documents.map(d => (
                        <tr key={d.id} className="table-row">
                          <td className="table-cell" data-label="Nom">
                            <a href={getFileUrl(d.chemin)} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline font-medium">{d.nomOriginal}</a>
                            {d.description && <p className="text-xs text-gray-400">{d.description}</p>}
                          </td>
                          <td className="table-cell" data-label="Catégorie"><span className="badge badge-gray">{CATEGORIE_LABELS[d.categorie] || d.categorie}</span></td>
                          <td className="table-cell text-xs" data-label="Lié à">
                            {d.admissionTemporaire ? <span>AT {d.admissionTemporaire.numero}</span>
                              : d.dossier ? <Link href={`/dossiers/${d.dossier.id}`} className="text-primary-600 hover:underline">{d.dossier.numeroPhysique || d.dossier.numero}</Link>
                              : d.client ? <span>{d.client.raisonSociale}</span> : '-'}
                          </td>
                          <td className="table-cell text-xs" data-label="Taille">{fmtSize(d.taille)}</td>
                          <td className="table-cell text-xs" data-label="Date">{fmtDate(d.createdAt)}</td>
                          <td className="table-cell" data-label="Actions">
                            <a href={getFileUrl(d.chemin)} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700 inline-block" title="Télécharger">
                              <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 lg:order-first">
            <div className="card !p-0 overflow-hidden lg:sticky lg:top-4">
              <div className="p-4 border-b border-gray-200 dark:border-surface-700">
                <h3 className="text-sm font-semibold">Dossiers</h3>
                <p className="text-xs text-gray-400 mt-0.5">Cliquez sur un dossier pour voir ses documents</p>
                <input
                  type="text"
                  value={dossierSearch}
                  onChange={e => setDossierSearch(e.target.value)}
                  className="input-field !text-sm mt-2"
                  placeholder="N° dossier, client, BL..."
                />
              </div>
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100 dark:divide-surface-700">
                {dossiersFiltres.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">Aucun dossier</p>
                ) : dossiersFiltres.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDossierFiltre(dossierFiltre === d.id ? '' : d.id)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors ${dossierFiltre === d.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-500' : ''}`}
                  >
                    <p className={`text-sm font-medium truncate ${dossierFiltre === d.id ? 'text-primary-600' : 'text-gray-700 dark:text-gray-200'}`}>{d.numeroPhysique || d.numero}</p>
                    <p className="text-xs text-gray-400 truncate">{d.client?.raisonSociale || '-'}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">Importer un document</h2>
                <button onClick={() => { setShowUpload(false); resetUploadForm(); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleUpload} className="p-6 space-y-4">
                <div>
                  <label className="label">Fichier *</label>
                  <input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="input-field" required />
                </div>
                <div>
                  <label className="label">Catégorie *</label>
                  <select value={uploadForm.categorie} onChange={e => setUploadForm({ ...uploadForm, categorie: e.target.value })} className="input-field" required>
                    <option value="">-- Sélectionner --</option>
                    {Object.entries(CATEGORIE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Dossier</label>
                    <select value={uploadForm.dossierId} onChange={e => setUploadForm({ ...uploadForm, dossierId: e.target.value })} className="input-field">
                      <option value="">-- Aucun --</option>
                      {dossiers.map(d => <option key={d.id} value={d.id}>{d.numeroPhysique || d.numero}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Client</label>
                    <select value={uploadForm.clientId} onChange={e => setUploadForm({ ...uploadForm, clientId: e.target.value })} className="input-field">
                      <option value="">-- Aucun --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">Description</label><textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} className="input-field" rows={2} /></div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowUpload(false); resetUploadForm(); }} className="btn-secondary">Annuler</button>
                  <button type="submit" disabled={uploading} className="btn-primary disabled:opacity-50">{uploading ? 'Import...' : 'Importer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
