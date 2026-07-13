'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { dossiersApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  NOUVEAU: 'badge-info', EN_COURS: 'badge-warning', ATTENTE_CLIENT: 'badge-gray',
  ATTENTE_DOUANE: 'badge-gray', LIQUIDATION: 'badge-warning', PAIEMENT: 'badge-info',
  MAIN_LEVEE: 'badge-info', LIVRAISON: 'badge-success', CLOTURE: 'badge-success',
  ANNULE: 'badge-danger', ARCHIVE: 'badge-gray',
};

const statutLabels: Record<string, string> = {
  NOUVEAU: 'Nouveau', EN_COURS: 'En cours', ATTENTE_CLIENT: 'Attente Client',
  ATTENTE_DOUANE: 'Attente Douane', LIQUIDATION: 'Liquidation', PAIEMENT: 'Paiement',
  MAIN_LEVEE: 'Main levée', LIVRAISON: 'Livraison', CLOTURE: 'Clôturé',
  ANNULE: 'Annulé', ARCHIVE: 'Archivé',
};

const workflowSteps = ['NOUVEAU', 'EN_COURS', 'LIQUIDATION', 'PAIEMENT', 'MAIN_LEVEE', 'LIVRAISON', 'CLOTURE'];

const STATUTS_DOSSIER_FERME = ['CLOTURE', 'ANNULE', 'ARCHIVE'];

const fmt = (n: any) => {
  if (n === null || n === undefined || n === '') return '-';
  const num = Number(n);
  return isNaN(num) ? String(n) : new Intl.NumberFormat('fr-FR').format(num);
};

const textFields = [
  'numeroPhysique',
  'compagnieMaritime', 'navire', 'voyage', 'numeroBL', 'portOrigine', 'portDestination',
  'designation', 'emballage', 'incoterm', 'devise', 'regimeDouanier', 'bureauDouane',
  'observations', 'numeroDeclaration', 'lieuLivraison', 'bonLivraison',
];

const numFields = [
  'poidsBrut', 'poidsNet', 'volume', 'valeurFOB', 'fret', 'assurance', 'valeurCAF',
  'droitDouane', 'tva', 'autresTaxes', 'totalDroits', 'nombreColis',
];

export default function DossierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dossierId = params.id as string;

  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('infos');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articleForm, setArticleForm] = useState({ designation: '', type: '', marque: '', modele: '', quantite: '1', unite: '', positionTarifaire: '', poids: '', valeur: '', origine: '', bonLivraison: '', observations: '' });
  const [importingExcel, setImportingExcel] = useState(false);

  const buildEditForm = (d: any): Record<string, string> => {
    const form: Record<string, string> = {};
    [...textFields, ...numFields].forEach(f => {
      form[f] = d[f] != null ? String(d[f]) : '';
    });
    return form;
  };

  const load = useCallback(async () => {
    try {
      const res = await dossiersApi.get(dossierId);
      if (!res.data.data) { setNotFound(true); return; }
      setDossier(res.data.data);
      setEditForm(buildEditForm(res.data.data));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => { load(); }, [load]);

  const handleChangeStatut = async (statut: string) => {
    if (statut === dossier.statut) return;
    try {
      await dossiersApi.changeStatut(dossierId, statut);
      toast.success(`Statut modifié: ${statutLabels[statut]}`);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur changement statut');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, any> = {};

      textFields.forEach(f => {
        const oldVal = dossier[f] != null ? String(dossier[f]) : '';
        if (editForm[f] !== oldVal) {
          data[f] = editForm[f] || null;
        }
      });

      numFields.forEach(f => {
        const oldVal = dossier[f] != null ? String(dossier[f]) : '';
        if (editForm[f] !== oldVal) {
          if (editForm[f] && editForm[f] !== '') {
            data[f] = f === 'nombreColis' ? parseInt(editForm[f]) : parseFloat(editForm[f]);
          } else {
            data[f] = null;
          }
        }
      });

      if (Object.keys(data).length === 0) {
        toast('Aucune modification détectée', { icon: 'ℹ️' });
        setSaving(false);
        return;
      }

      await dossiersApi.update(dossierId, data);
      toast.success('Dossier modifié avec succès');
      setEditing(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    if (dossier) setEditForm(buildEditForm(dossier));
  };

  const updateField = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const resetArticleForm = () => setArticleForm({ designation: '', type: '', marque: '', modele: '', quantite: '1', unite: '', positionTarifaire: '', poids: '', valeur: '', origine: '', bonLivraison: '', observations: '' });

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = { ...articleForm };
      if (data.quantite) data.quantite = parseFloat(data.quantite);
      if (data.poids) data.poids = parseFloat(data.poids); else delete data.poids;
      if (data.valeur) data.valeur = parseFloat(data.valeur); else delete data.valeur;
      Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });

      if (editingArticle) {
        await api.put(`/articles/${editingArticle.id}`, data);
        toast.success('Article modifié');
      } else {
        await api.post(`/articles/dossier/${dossierId}`, data);
        toast.success('Article ajouté');
      }
      setShowArticleModal(false);
      setEditingArticle(null);
      resetArticleForm();
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    try {
      await api.delete(`/articles/${articleId}`);
      toast.success('Article supprimé');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setArticleForm({
      designation: article.designation || '', type: article.type || '', marque: article.marque || '',
      modele: article.modele || '', quantite: String(article.quantite || 1), unite: article.unite || '',
      positionTarifaire: article.positionTarifaire || '', poids: article.poids ? String(article.poids) : '',
      valeur: article.valeur ? String(article.valeur) : '', origine: article.origine || '',
      bonLivraison: article.bonLivraison || '', observations: article.observations || '',
    });
    setShowArticleModal(true);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/articles/dossier/${dossierId}/import-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message || 'Articles importés');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur import'); }
    finally { setImportingExcel(false); e.target.value = ''; }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (notFound || !dossier) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-gray-500 text-lg">Dossier non trouvé</p>
          <button onClick={() => router.push('/dossiers')} className="btn-primary">Retour aux dossiers</button>
        </div>
      </AppLayout>
    );
  }

  const currentStep = workflowSteps.indexOf(dossier.statut);
  const isFerme = STATUTS_DOSSIER_FERME.includes(dossier.statut);

  const EditableField = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => (
    <div>
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      {editing ? (
        <input
          type={type}
          value={editForm[field] || ''}
          onChange={e => updateField(field, e.target.value)}
          className="input-field !py-1.5 text-sm"
        />
      ) : (
        <p className="font-medium">{numFields.includes(field) ? fmt(dossier[field]) : (dossier[field] || '-')}</p>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dossiers')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dossier.numero}</h1>
                {dossier.numeroPhysique && (
                  <span className="badge badge-gray font-mono">N° physique: {dossier.numeroPhysique}</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{dossier.client?.raisonSociale} — {dossier.nature} {dossier.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${statutColors[dossier.statut]} text-sm px-3 py-1`}>
              {statutLabels[dossier.statut]}
            </span>
            {isFerme ? (
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Dossier {statutLabels[dossier.statut].toLowerCase()} — lecture seule
              </span>
            ) : !editing ? (
              <button onClick={() => setEditing(true)} className="btn-primary">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
            ) : (
              <>
                <button onClick={cancelEdit} className="btn-secondary">Annuler</button>
                <button onClick={handleSave} disabled={saving} className="btn-success disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Workflow */}
        <div className="card !p-4">
          <div className="flex items-center justify-between">
            {workflowSteps.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <button
                  onClick={() => !isFerme && handleChangeStatut(step)}
                  disabled={isFerme}
                  title={isFerme ? 'Dossier verrouillé' : `Passer au statut: ${statutLabels[step]}`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i <= currentStep ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-surface-700 text-gray-500'}
                    ${i === currentStep ? 'ring-4 ring-primary-200' : ''}
                    ${isFerme ? 'cursor-not-allowed opacity-70' : 'hover:scale-110 cursor-pointer'}`}
                >
                  {i < currentStep ? '✓' : i + 1}
                </button>
                {i < workflowSteps.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 rounded ${i < currentStep ? 'bg-primary-500' : 'bg-gray-200 dark:bg-surface-700'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {workflowSteps.map(s => (
              <span key={s} className="text-[9px] text-gray-400 text-center flex-1">{statutLabels[s]}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-fit">
          {[
            { id: 'infos', label: 'Informations' },
            { id: 'articles', label: `Articles (${dossier.articles?.length || 0})` },
            { id: 'transport', label: 'Transport' },
            { id: 'douane', label: 'Douane & Valeur' },
            { id: 'proformas', label: `Proformas (${dossier.proformas?.length || 0})` },
            { id: 'factures', label: `Factures (${dossier.factures?.length || 0})` },
            { id: 'historique', label: 'Historique' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                tab === t.id ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Informations */}
        {tab === 'infos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-4">Client</h3>
              <div className="mb-3">
                <EditableField label="N° physique" field="numeroPhysique" />
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Raison Sociale</span><span className="font-medium">{dossier.client?.raisonSociale}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Code</span><span className="font-mono">{dossier.client?.code}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">NCC</span><span>{dossier.client?.ncc || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Téléphone</span><span>{dossier.client?.telephone || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{dossier.client?.email || '-'}</span></div>
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-4">Marchandise</h3>
              <div className="grid grid-cols-1 gap-3">
                <EditableField label="Désignation" field="designation" />
                <div className="grid grid-cols-2 gap-3">
                  <EditableField label="Poids Brut (kg)" field="poidsBrut" type="number" />
                  <EditableField label="Poids Net (kg)" field="poidsNet" type="number" />
                  <EditableField label="Volume (m³)" field="volume" type="number" />
                  <EditableField label="Nombre de colis" field="nombreColis" type="number" />
                  <EditableField label="Emballage" field="emballage" />
                </div>
              </div>
            </div>
            <div className="card lg:col-span-2">
              <h3 className="font-semibold mb-4">Observations</h3>
              {editing ? (
                <textarea value={editForm.observations || ''} onChange={e => updateField('observations', e.target.value)} className="input-field text-sm" rows={3} />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300">{dossier.observations || 'Aucune observation'}</p>
              )}
            </div>
          </div>
        )}

        {/* Tab: Articles */}
        {tab === 'articles' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Articles / Marchandises</h3>
              {!isFerme && (
                <div className="flex gap-2">
                  <label className={`btn-secondary cursor-pointer ${importingExcel ? 'opacity-50' : ''}`}>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    {importingExcel ? 'Import...' : 'Import Excel'}
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" disabled={importingExcel} />
                  </label>
                  <button onClick={() => { resetArticleForm(); setEditingArticle(null); setShowArticleModal(true); }} className="btn-primary">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nouveau
                  </button>
                </div>
              )}
            </div>

            {dossier.articles?.length > 0 ? (
              <div className="table-container !shadow-none !border-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">N°</th>
                      <th className="table-header">Désignation</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Marque</th>
                      <th className="table-header">Qté</th>
                      <th className="table-header">Position Tarifaire</th>
                      <th className="table-header">Poids</th>
                      <th className="table-header">Valeur</th>
                      <th className="table-header">Bon Livraison</th>
                      {!isFerme && <th className="table-header">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.articles.map((a: any) => (
                      <tr key={a.id} className="table-row">
                        <td className="table-cell font-medium" data-label="N°">{a.numero}</td>
                        <td className="table-cell" data-label="Désignation">{a.designation}</td>
                        <td className="table-cell" data-label="Type">{a.type || '-'}</td>
                        <td className="table-cell" data-label="Marque">{a.marque || '-'}</td>
                        <td className="table-cell text-center" data-label="Qté">{fmt(a.quantite)}</td>
                        <td className="table-cell font-mono text-xs" data-label="Position Tarifaire">{a.positionTarifaire || '-'}</td>
                        <td className="table-cell text-right" data-label="Poids">{a.poids ? `${fmt(a.poids)} kg` : '-'}</td>
                        <td className="table-cell text-right font-mono" data-label="Valeur">{a.valeur ? `${fmt(a.valeur)} F` : '-'}</td>
                        <td className="table-cell" data-label="Bon Livraison">{a.bonLivraison || '-'}</td>
                        {!isFerme && (
                          <td className="table-cell" data-label="Actions">
                            <div className="flex gap-1">
                              <button onClick={() => handleEditArticle(a)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteArticle(a.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <p>Aucun article. Ajoutez manuellement ou importez depuis un fichier Excel.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Article */}
        {showArticleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">{editingArticle ? 'Modifier l\'article' : 'Nouvel Article'}</h2>
                <button onClick={() => { setShowArticleModal(false); setEditingArticle(null); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveArticle} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="label">Désignation *</label><input type="text" value={articleForm.designation} onChange={e => setArticleForm({...articleForm, designation: e.target.value})} className="input-field" required /></div>
                  <div><label className="label">Type</label><input type="text" value={articleForm.type} onChange={e => setArticleForm({...articleForm, type: e.target.value})} className="input-field" placeholder="Électronique, BTP..." /></div>
                  <div><label className="label">Marque</label><input type="text" value={articleForm.marque} onChange={e => setArticleForm({...articleForm, marque: e.target.value})} className="input-field" /></div>
                  <div><label className="label">Modèle</label><input type="text" value={articleForm.modele} onChange={e => setArticleForm({...articleForm, modele: e.target.value})} className="input-field" /></div>
                  <div><label className="label">Quantité</label><input type="number" step="0.001" value={articleForm.quantite} onChange={e => setArticleForm({...articleForm, quantite: e.target.value})} className="input-field" /></div>
                  <div><label className="label">Unité</label><input type="text" value={articleForm.unite} onChange={e => setArticleForm({...articleForm, unite: e.target.value})} className="input-field" placeholder="Pcs, Kg, m³..." /></div>
                  <div><label className="label">Position Tarifaire</label><input type="text" value={articleForm.positionTarifaire} onChange={e => setArticleForm({...articleForm, positionTarifaire: e.target.value})} className="input-field" placeholder="8471.30.00" /></div>
                  <div><label className="label">Poids (kg)</label><input type="number" step="0.001" value={articleForm.poids} onChange={e => setArticleForm({...articleForm, poids: e.target.value})} className="input-field" /></div>
                  <div><label className="label">Valeur (XOF)</label><input type="number" value={articleForm.valeur} onChange={e => setArticleForm({...articleForm, valeur: e.target.value})} className="input-field" /></div>
                  <div><label className="label">Origine</label><input type="text" value={articleForm.origine} onChange={e => setArticleForm({...articleForm, origine: e.target.value})} className="input-field" placeholder="Chine, France..." /></div>
                  <div><label className="label">N° Bon Livraison</label><input type="text" value={articleForm.bonLivraison} onChange={e => setArticleForm({...articleForm, bonLivraison: e.target.value})} className="input-field" /></div>
                  <div className="col-span-2"><label className="label">Observations</label><textarea value={articleForm.observations} onChange={e => setArticleForm({...articleForm, observations: e.target.value})} className="input-field" rows={2} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowArticleModal(false); setEditingArticle(null); }} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary">{editingArticle ? 'Modifier' : 'Ajouter'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Transport */}
        {tab === 'transport' && (
          <div className="card">
            <h3 className="font-semibold mb-4">Détails Transport</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <EditableField label="Compagnie Maritime" field="compagnieMaritime" />
              <EditableField label="Navire" field="navire" />
              <EditableField label="Voyage" field="voyage" />
              <EditableField label="N° BL / Connaissement" field="numeroBL" />
              <EditableField label="Port d'Origine" field="portOrigine" />
              <EditableField label="Port de Destination" field="portDestination" />
            </div>
            {dossier.conteneurs?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-sm mb-3">Conteneurs ({dossier.conteneurs.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dossier.conteneurs.map((c: any) => (
                    <div key={c.id} className="p-3 bg-gray-50 dark:bg-surface-700 rounded-lg text-sm">
                      <p className="font-mono font-medium text-primary-600">{c.numero}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>Type: {c.type || '-'}</span>
                        <span>Poids: {fmt(c.poids)} kg</span>
                        <span>Scellé: {c.scelle || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Douane & Valeur */}
        {tab === 'douane' && (
          <div className="card">
            <h3 className="font-semibold mb-4">Douane & Valeur</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <EditableField label="Valeur FOB" field="valeurFOB" type="number" />
              <EditableField label="Fret" field="fret" type="number" />
              <EditableField label="Assurance" field="assurance" type="number" />
              <EditableField label="Valeur CAF" field="valeurCAF" type="number" />
              <EditableField label="Incoterm" field="incoterm" />
              <EditableField label="Devise" field="devise" />
              <EditableField label="N° Déclaration" field="numeroDeclaration" />
              <EditableField label="Régime Douanier" field="regimeDouanier" />
              <EditableField label="Bureau de Douane" field="bureauDouane" />
              <EditableField label="Droits de Douane" field="droitDouane" type="number" />
              <EditableField label="TVA" field="tva" type="number" />
              <EditableField label="Total Droits & Taxes" field="totalDroits" type="number" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-surface-700">
              <EditableField label="Lieu de Livraison" field="lieuLivraison" />
              <EditableField label="N° Bon de Livraison" field="bonLivraison" />
            </div>
          </div>
        )}

        {/* Tab: Proformas */}
        {tab === 'proformas' && (
          <div className="card">
            <h3 className="font-semibold mb-4">Proformas liées</h3>
            {dossier.proformas?.length > 0 ? (
              <div className="table-container !shadow-none !border-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">N° Proforma</th>
                      <th className="table-header">Titre</th>
                      <th className="table-header text-right">Montant TTC</th>
                      <th className="table-header">Statut</th>
                      <th className="table-header">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.proformas.map((p: any) => (
                      <tr key={p.id} className="table-row cursor-pointer" onClick={() => router.push(`/proformas/${p.id}`)}>
                        <td className="table-cell font-medium text-primary-600" data-label="N° Proforma">{p.numero}</td>
                        <td className="table-cell text-xs" data-label="Titre">{p.titre || '-'}</td>
                        <td className="table-cell text-right font-mono" data-label="Montant TTC">{fmt(p.montantTTC)} F</td>
                        <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[p.statut] || 'badge-gray'}`}>{p.statut?.replace(/_/g, ' ')}</span></td>
                        <td className="table-cell text-xs" data-label="Date">{p.dateProforma ? new Date(p.dateProforma).toLocaleDateString('fr-FR') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucune proforma liée à ce dossier</p>
            )}
          </div>
        )}

        {/* Tab: Factures */}
        {tab === 'factures' && (
          <div className="card">
            <h3 className="font-semibold mb-4">Factures liées</h3>
            {dossier.factures?.length > 0 ? (
              <div className="table-container !shadow-none !border-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">N° Facture</th>
                      <th className="table-header">Objet</th>
                      <th className="table-header text-right">Montant TTC</th>
                      <th className="table-header text-right">Payé</th>
                      <th className="table-header text-right">Reste</th>
                      <th className="table-header">Statut</th>
                      <th className="table-header">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.factures.map((f: any) => (
                      <tr key={f.id} className="table-row">
                        <td className="table-cell font-medium text-primary-600" data-label="N° Facture">{f.numero}</td>
                        <td className="table-cell text-xs" data-label="Objet">{f.objet || '-'}</td>
                        <td className="table-cell text-right font-mono" data-label="Montant TTC">{fmt(f.montantTTC)} F</td>
                        <td className="table-cell text-right font-mono text-green-600" data-label="Payé">{fmt(f.montantPaye)} F</td>
                        <td className="table-cell text-right font-mono text-red-600" data-label="Reste">{fmt(f.resteAPayer)} F</td>
                        <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[f.statut] || 'badge-gray'}`}>{f.statut?.replace(/_/g, ' ')}</span></td>
                        <td className="table-cell text-xs" data-label="Date">{f.dateFacture ? new Date(f.dateFacture).toLocaleDateString('fr-FR') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucune facture liée à ce dossier</p>
            )}
          </div>
        )}

        {/* Tab: Historique */}
        {tab === 'historique' && (
          <div className="card">
            <h3 className="font-semibold mb-4">Historique du dossier</h3>
            {dossier.historiqueDossier?.length > 0 ? (
              <div className="space-y-3">
                {dossier.historiqueDossier.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {h.action}
                        {h.statutAvant && h.statutApres && (
                          <span className="text-gray-500"> : {statutLabels[h.statutAvant] || h.statutAvant} → <span className="text-primary-600">{statutLabels[h.statutApres] || h.statutApres}</span></span>
                        )}
                        {!h.statutAvant && h.statutApres && (
                          <span className="text-gray-500"> → <span className="text-primary-600">{statutLabels[h.statutApres] || h.statutApres}</span></span>
                        )}
                      </p>
                      {h.commentaire && <p className="text-xs text-gray-500 mt-0.5">{h.commentaire}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(h.createdAt).toLocaleString('fr-FR')} — {h.utilisateur || 'Système'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucun historique</p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
