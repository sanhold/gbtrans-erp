'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, StatutPastille } from '@/components/tables/cellules';
import BoutonIcone, { IconeTelecharger } from '@/components/tables/BoutonIcone';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import PickerField from '@/components/ui/PickerField';
import { documentsApi, clientsApi, dossiersApi } from '@/lib/api';
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
    clientsApi.listRef().then(r => setClients(r.data.data || [])).catch(() => {});
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
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

  const telechargerDocument = async (doc: any) => {
    try {
      const res = await documentsApi.fichier(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.download = doc.nomOriginal;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur lors du téléchargement'); }
  };

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { page, limit: pageSize };
    if (appliedSearch) params.search = appliedSearch;
    if (categorieFiltre) params.categorie = categorieFiltre;
    if (dossierFiltre) params.dossierId = dossierFiltre;
    documentsApi.list(params)
      .then(res => { setDocuments(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [appliedSearch, categorieFiltre, dossierFiltre, page, pageSize]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [appliedSearch, categorieFiltre, dossierFiltre]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setAppliedSearch(search); };

  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));
  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));

  const dossierSelectionne = dossiers.find(d => d.id === dossierFiltre);
  const dossiersFiltres = dossiers.filter(d => {
    if (!dossierSearch) return true;
    const q = dossierSearch.toLowerCase();
    return d.numeroPhysique?.toLowerCase().includes(q) || d.numero?.toLowerCase().includes(q) || d.client?.raisonSociale?.toLowerCase().includes(q) || d.numeroBL?.toLowerCase().includes(q);
  });

  const liePar = (d: any) => (d.admissionTemporaire ? `AT ${d.admissionTemporaire.numero}` : d.dossier ? (d.dossier.numeroPhysique || d.dossier.numero) : d.client ? d.client.raisonSociale : '—');

  const colonnes: Colonne<any>[] = [
    { cle: 'nom', libelle: 'Document', rendu: d => <DoubleLigne haut={<button type="button" onClick={(e) => { e.stopPropagation(); telechargerDocument(d); }} className="text-left text-primary-600 hover:underline" title={d.nomOriginal}>{d.nomOriginal}</button>} bas={d.description} />, texte: d => d.nomOriginal },
    { cle: 'categorie', libelle: 'Catégorie', rendu: d => <StatutPastille libelle={CATEGORIE_LABELS[d.categorie] || d.categorie} ton="gray" />, texte: d => CATEGORIE_LABELS[d.categorie] || d.categorie },
    { cle: 'lie', libelle: 'Lié à', rendu: d => (d.dossier && !d.admissionTemporaire ? <Link href={`/dossiers/${d.dossier.id}`} onClick={e => e.stopPropagation()} className="text-primary-600 hover:underline">{liePar(d)}</Link> : liePar(d)), texte: d => liePar(d) },
    { cle: 'taille', libelle: 'Taille', align: 'right', masquerSous: 'xl', rendu: d => <span className="tabular-nums">{fmtSize(d.taille)}</span>, texte: d => fmtSize(d.taille) },
    { cle: 'date', libelle: 'Date', rendu: d => fmtDate(d.createdAt), texte: d => fmtDate(d.createdAt) },
  ];

  const vide = <EmptyState titre="Aucun document archivé" description="Importez un document avec le bouton « Importer »." action={<button type="button" onClick={() => setShowUpload(true)} className="btn-primary">Importer un document</button>} />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          titre="Archives numériques"
          sousTitre="GED - Gestion électronique des documents"
          sousTitreMasqueMobile
          actions={
            <>
              <button type="button" onClick={() => setShowCategories(!showCategories)} className={`btn-secondary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm ${showCategories ? '!bg-primary-50 !text-primary-600 dark:!bg-primary-900/30' : ''}`}>
                {categorieFiltre ? CATEGORIE_LABELS[categorieFiltre] : 'Catégories'}
                <svg className={`w-3.5 h-3.5 ml-1.5 transition-transform ${showCategories ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button type="button" onClick={() => setShowUpload(true)} className="btn-primary !px-3 !py-1.5 sm:!px-4 sm:!py-2 text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span className="sm:hidden">Importer</span><span className="hidden sm:inline">Importer un document</span>
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6 min-w-0">
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
                  <div className="text-sm text-gray-500">Dossier : <span className="font-medium text-primary-600">{dossierSelectionne?.numeroPhysique || dossierSelectionne?.numero}</span> <button type="button" onClick={() => setDossierFiltre('')} className="ml-1 text-primary-600 hover:underline">✕</button></div>
                )}
                <button type="submit" className="btn-primary">Afficher</button>
              </form>
            </div>

            {!showCategories && (
              <div className="space-y-3">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  Documents
                  {categorieFiltre ? ` — ${CATEGORIE_LABELS[categorieFiltre]}` : ''}
                  {dossierFiltre ? ` — Dossier ${dossierSelectionne?.numeroPhysique || dossierSelectionne?.numero}` : !categorieFiltre ? ' récents' : ''}
                </h3>

                <div className="hidden lg:block">
                  <DataTable
                    colonnes={colonnes}
                    lignes={documents}
                    cleLigne={(d) => d.id}
                    chargement={loading}
                    nomExport="archives"
                    actionsToujoursVisibles
                    actions={(d) => <BoutonIcone titre="Télécharger" ton="primaire" onClick={() => telechargerDocument(d)}><IconeTelecharger /></BoutonIcone>}
                    pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
                    vide={vide}
                  />
                </div>

                <div className="lg:hidden space-y-2">
                  {loading ? (
                    [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-16" />)
                  ) : documents.length === 0 ? (
                    <div className="card">{vide}</div>
                  ) : documents.map(d => (
                    <div key={d.id} className="card !p-3 flex items-center gap-3">
                      <span aria-hidden="true" className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-gray-900 dark:text-white" title={d.nomOriginal}>{d.nomOriginal}</span>
                        <span className="block truncate text-xs text-gray-500">{CATEGORIE_LABELS[d.categorie] || d.categorie} · {liePar(d)}</span>
                        <span className="block text-[11px] text-gray-400">{fmtDate(d.createdAt)} · {fmtSize(d.taille)}</span>
                      </span>
                      <BoutonIcone titre="Télécharger" ton="primaire" onClick={() => telechargerDocument(d)}><IconeTelecharger /></BoutonIcone>
                    </div>
                  ))}
                  <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} /></div>
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

        <Modal
          open={showUpload}
          onClose={() => { setShowUpload(false); resetUploadForm(); }}
          title="Importer un document"
          footer={
            <>
              <button type="button" onClick={() => { setShowUpload(false); resetUploadForm(); }} className="btn-secondary">Annuler</button>
              <button type="submit" form="form-upload" disabled={uploading} className="btn-primary disabled:opacity-50">{uploading ? 'Import...' : 'Importer'}</button>
            </>
          }
        >
          <form id="form-upload" onSubmit={handleUpload} className="space-y-4">
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
                <PickerField value={uploadForm.dossierId} onChange={id => setUploadForm({ ...uploadForm, dossierId: id })} options={dossierOptions} placeholder="-- Aucun --" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." />
              </div>
              <div>
                <label className="label">Client</label>
                <PickerField value={uploadForm.clientId} onChange={id => setUploadForm({ ...uploadForm, clientId: id })} options={clientOptions} placeholder="-- Aucun --" title="Sélectionner un client" searchPlaceholder="Raison sociale..." />
              </div>
            </div>
            <div><label className="label">Description</label><textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} className="input-field" rows={2} /></div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
