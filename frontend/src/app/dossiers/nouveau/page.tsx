'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import { dossiersApi, clientsApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function NouveauDossierPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [processusList, setProcessusList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [numeroPhysiqueEdited, setNumeroPhysiqueEdited] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticleIndex, setEditingArticleIndex] = useState<number | null>(null);
  const emptyArticleForm = { designation: '', type: '', marque: '', modele: '', quantite: '1', unite: '', positionTarifaire: '', poids: '', valeur: '', origine: '', bonLivraison: '', observations: '' };
  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [form, setForm] = useState({
    clientId: '',
    numeroPhysique: '',
    nature: 'IMPORT',
    type: 'MARITIME',
    processusId: '',
    compagnieMaritime: '',
    navire: '',
    voyage: '',
    numeroBL: '',
    portOrigine: '',
    portDestination: 'Abidjan',
    designation: '',
    poidsBrut: '',
    poidsNet: '',
    volume: '',
    nombreColis: '',
    emballage: '',
    valeurFOB: '',
    fret: '',
    assurance: '',
    incoterm: 'CIF',
    devise: 'XOF',
    regimeDouanier: '',
    bureauDouane: 'Abidjan Port',
    observations: '',
  });

  useEffect(() => {
    clientsApi.list({ limit: 500 }).then(res => setClients(res.data.data || [])).catch(() => {});
    api.get('/processus').then(res => setProcessusList(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (numeroPhysiqueEdited) return;
    dossiersApi.suggestionNumeroPhysique(form.nature)
      .then(res => setForm(prev => ({ ...prev, numeroPhysique: res.data.data.numeroPhysique })))
      .catch(() => {});
  }, [form.nature, numeroPhysiqueEdited]);

  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));

  const updateField = (field: string, value: string) => {
    if (field === 'numeroPhysique') setNumeroPhysiqueEdited(true);
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const openNewArticleModal = () => {
    setEditingArticleIndex(null);
    setArticleForm(emptyArticleForm);
    setShowArticleModal(true);
  };

  const openEditArticleModal = (index: number) => {
    setEditingArticleIndex(index);
    setArticleForm(articles[index]);
    setShowArticleModal(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.designation.trim()) { toast.error('La désignation est obligatoire'); return; }
    if (editingArticleIndex !== null) {
      setArticles(prev => prev.map((a, i) => (i === editingArticleIndex ? articleForm : a)));
    } else {
      setArticles(prev => [...prev, articleForm]);
    }
    setShowArticleModal(false);
    setEditingArticleIndex(null);
    setArticleForm(emptyArticleForm);
  };

  const handleRemoveArticle = (index: number) => {
    setArticles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Veuillez sélectionner un client'); return; }
    if (!form.numeroPhysique.trim()) { toast.error('Veuillez saisir le numéro physique du dossier'); return; }
    setSaving(true);
    try {
      const data: any = { ...form };
      if (data.poidsBrut) data.poidsBrut = parseFloat(data.poidsBrut);
      else delete data.poidsBrut;
      if (data.poidsNet) data.poidsNet = parseFloat(data.poidsNet);
      else delete data.poidsNet;
      if (data.volume) data.volume = parseFloat(data.volume);
      else delete data.volume;
      if (data.nombreColis) data.nombreColis = parseInt(data.nombreColis);
      else delete data.nombreColis;
      if (data.valeurFOB) data.valeurFOB = parseFloat(data.valeurFOB);
      else delete data.valeurFOB;
      if (data.fret) data.fret = parseFloat(data.fret);
      else delete data.fret;
      if (data.assurance) data.assurance = parseFloat(data.assurance);
      else delete data.assurance;
      Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });

      const res = await dossiersApi.create(data);
      const nouveauDossier = res.data.data;

      if (articles.length > 0) {
        let nbArticlesOk = 0;
        for (const a of articles) {
          try {
            await api.post(`/articles/dossier/${nouveauDossier.id}`, {
              ...a,
              quantite: a.quantite ? parseFloat(a.quantite) : 1,
              poids: a.poids ? parseFloat(a.poids) : null,
              valeur: a.valeur ? parseFloat(a.valeur) : null,
            });
            nbArticlesOk++;
          } catch {
            // on continue avec les articles suivants même si l'un échoue
          }
        }
        if (nbArticlesOk < articles.length) {
          toast.error(`${articles.length - nbArticlesOk} article(s) n'ont pas pu être ajoutés`);
        }
      }

      toast.success(`Dossier ${nouveauDossier.numero} créé avec succès${articles.length ? ` (${articles.length} article(s))` : ''}`);
      router.push(`/dossiers/${nouveauDossier.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nouveau Dossier</h1><p className="text-sm text-gray-500">Créer un nouveau dossier de transit</p></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Client *</label>
                <PickerField value={form.clientId} onChange={id => updateField('clientId', id)} options={clientOptions} placeholder="-- Sélectionner un client --" title="Sélectionner un client" searchPlaceholder="Raison sociale, code..." required />
              </div>
              <div>
                <label className="label">N° physique *</label>
                <div className="relative">
                  <input type="text" value={form.numeroPhysique} onChange={e => updateField('numeroPhysique', e.target.value)} className="input-field pr-9" placeholder="Ex: I-01/2026" required />
                  {numeroPhysiqueEdited && (
                    <button
                      type="button"
                      title="Revenir à la suggestion automatique"
                      onClick={() => setNumeroPhysiqueEdited(false)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Proposé automatiquement selon la nature — modifiable si besoin</p>
              </div>
              <div>
                <label className="label">Nature *</label>
                <select value={form.nature} onChange={e => updateField('nature', e.target.value)} className="input-field">
                  <option value="IMPORT">Import</option><option value="EXPORT">Export</option>
                  <option value="TRANSIT">Transit</option><option value="REEXPORT">Réexport</option>
                  <option value="CABOTAGE">Cabotage</option><option value="TRANSBORDEMENT">Transbordement</option>
                </select>
              </div>
              <div>
                <label className="label">Type *</label>
                <select value={form.type} onChange={e => updateField('type', e.target.value)} className="input-field">
                  <option value="MARITIME">Maritime</option><option value="AERIEN">Aérien</option>
                  <option value="TERRESTRE">Terrestre</option><option value="MULTIMODAL">Multimodal</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="label">Processus de suivi</label>
                <select value={form.processusId} onChange={e => updateField('processusId', e.target.value)} className="input-field">
                  <option value="">-- Processus par défaut --</option>
                  {processusList.filter(p => p.actif).map(p => (
                    <option key={p.id} value={p.id}>{p.nom} ({p.code}) {p.nature ? `— ${p.nature}` : ''} — {p.etapes?.length || 0} étapes</option>
                  ))}
                </select>
                {form.processusId && processusList.find(p => p.id === form.processusId)?.etapes && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {processusList.find(p => p.id === form.processusId).etapes.map((e: any, i: number) => (
                      <div key={e.id} className="flex items-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: e.couleur || '#6B7280' }}>{e.nom}</span>
                        {i < processusList.find(p => p.id === form.processusId).etapes.length - 1 && <span className="text-gray-300 mx-0.5">→</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10" /></svg>
              Transport
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="label">Compagnie Maritime</label><input type="text" value={form.compagnieMaritime} onChange={e => updateField('compagnieMaritime', e.target.value)} className="input-field" placeholder="CMA CGM, MAERSK..." /></div>
              <div><label className="label">Navire</label><input type="text" value={form.navire} onChange={e => updateField('navire', e.target.value)} className="input-field" /></div>
              <div><label className="label">Voyage</label><input type="text" value={form.voyage} onChange={e => updateField('voyage', e.target.value)} className="input-field" /></div>
              <div><label className="label">N° BL</label><input type="text" value={form.numeroBL} onChange={e => updateField('numeroBL', e.target.value)} className="input-field" /></div>
              <div><label className="label">Port Origine</label><input type="text" value={form.portOrigine} onChange={e => updateField('portOrigine', e.target.value)} className="input-field" /></div>
              <div><label className="label">Port Destination</label><input type="text" value={form.portDestination} onChange={e => updateField('portDestination', e.target.value)} className="input-field" /></div>
            </div>
          </div>

          {/* Marchandise */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Marchandise
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3"><label className="label">Désignation</label><textarea value={form.designation} onChange={e => updateField('designation', e.target.value)} className="input-field" rows={2} /></div>
              <div><label className="label">Poids Brut (kg)</label><input type="number" step="0.001" value={form.poidsBrut} onChange={e => updateField('poidsBrut', e.target.value)} className="input-field" /></div>
              <div><label className="label">Poids Net (kg)</label><input type="number" step="0.001" value={form.poidsNet} onChange={e => updateField('poidsNet', e.target.value)} className="input-field" /></div>
              <div><label className="label">Volume (m³)</label><input type="number" step="0.001" value={form.volume} onChange={e => updateField('volume', e.target.value)} className="input-field" /></div>
              <div><label className="label">Nombre de Colis</label><input type="number" value={form.nombreColis} onChange={e => updateField('nombreColis', e.target.value)} className="input-field" /></div>
              <div><label className="label">Emballage</label><input type="text" value={form.emballage} onChange={e => updateField('emballage', e.target.value)} className="input-field" placeholder="Cartons, palettes..." /></div>
            </div>
          </div>

          {/* Articles */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                Articles / Marchandises {articles.length > 0 && `(${articles.length})`}
              </h3>
              <button type="button" onClick={openNewArticleModal} className="btn-secondary">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Ajouter un article
              </button>
            </div>
            {articles.length > 0 ? (
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Désignation</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Quantité</th>
                      <th className="table-header">Unité</th>
                      <th className="table-header">Valeur</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((a, i) => (
                      <tr key={i} className="table-row">
                        <td className="table-cell font-medium" data-label="Désignation">{a.designation}</td>
                        <td className="table-cell" data-label="Type">{a.type || '-'}</td>
                        <td className="table-cell" data-label="Quantité">{a.quantite || 1}</td>
                        <td className="table-cell" data-label="Unité">{a.unite || '-'}</td>
                        <td className="table-cell text-right font-mono" data-label="Valeur">{a.valeur ? new Intl.NumberFormat('fr-FR').format(Number(a.valeur)) : '-'}</td>
                        <td className="table-cell" data-label="Actions">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openEditArticleModal(i)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button type="button" onClick={() => handleRemoveArticle(i)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Aucun article ajouté pour l&apos;instant</p>
            )}
          </div>

          {/* Valeur & Douane */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Valeur & Douane
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="label">Valeur FOB</label><input type="number" value={form.valeurFOB} onChange={e => updateField('valeurFOB', e.target.value)} className="input-field" /></div>
              <div><label className="label">Fret</label><input type="number" value={form.fret} onChange={e => updateField('fret', e.target.value)} className="input-field" /></div>
              <div><label className="label">Assurance</label><input type="number" value={form.assurance} onChange={e => updateField('assurance', e.target.value)} className="input-field" /></div>
              <div><label className="label">Incoterm</label><select value={form.incoterm} onChange={e => updateField('incoterm', e.target.value)} className="input-field"><option>CIF</option><option>FOB</option><option>CFR</option><option>EXW</option><option>FCA</option><option>DAP</option><option>DDP</option></select></div>
              <div><label className="label">Devise</label><select value={form.devise} onChange={e => updateField('devise', e.target.value)} className="input-field"><option>XOF</option><option>EUR</option><option>USD</option></select></div>
              <div><label className="label">Régime Douanier</label><input type="text" value={form.regimeDouanier} onChange={e => updateField('regimeDouanier', e.target.value)} className="input-field" placeholder="Mise à la consommation..." /></div>
              <div><label className="label">Bureau de Douane</label><input type="text" value={form.bureauDouane} onChange={e => updateField('bureauDouane', e.target.value)} className="input-field" /></div>
            </div>
          </div>

          {/* Observations */}
          <div className="card">
            <label className="label">Observations</label>
            <textarea value={form.observations} onChange={e => updateField('observations', e.target.value)} className="input-field" rows={3} placeholder="Notes, instructions particulières..." />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <><svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Création...</> : 'Créer le dossier'}
            </button>
          </div>
        </form>

        {/* Modal Article */}
        {showArticleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">{editingArticleIndex !== null ? 'Modifier l\'article' : 'Nouvel Article'}</h2>
                <button type="button" onClick={() => { setShowArticleModal(false); setEditingArticleIndex(null); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveArticle} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="label">Désignation *</label><input type="text" value={articleForm.designation} onChange={e => setArticleForm({ ...articleForm, designation: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Type</label><input type="text" value={articleForm.type} onChange={e => setArticleForm({ ...articleForm, type: e.target.value })} className="input-field" placeholder="Électronique, BTP..." /></div>
                  <div><label className="label">Marque</label><input type="text" value={articleForm.marque} onChange={e => setArticleForm({ ...articleForm, marque: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Modèle</label><input type="text" value={articleForm.modele} onChange={e => setArticleForm({ ...articleForm, modele: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Quantité</label><input type="number" step="0.001" value={articleForm.quantite} onChange={e => setArticleForm({ ...articleForm, quantite: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Unité</label><input type="text" value={articleForm.unite} onChange={e => setArticleForm({ ...articleForm, unite: e.target.value })} className="input-field" placeholder="Pcs, Kg, m³..." /></div>
                  <div><label className="label">Position Tarifaire</label><input type="text" value={articleForm.positionTarifaire} onChange={e => setArticleForm({ ...articleForm, positionTarifaire: e.target.value })} className="input-field" placeholder="8471.30.00" /></div>
                  <div><label className="label">Poids (kg)</label><input type="number" step="0.001" value={articleForm.poids} onChange={e => setArticleForm({ ...articleForm, poids: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Valeur (XOF)</label><input type="number" value={articleForm.valeur} onChange={e => setArticleForm({ ...articleForm, valeur: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Origine</label><input type="text" value={articleForm.origine} onChange={e => setArticleForm({ ...articleForm, origine: e.target.value })} className="input-field" placeholder="Chine, France..." /></div>
                  <div><label className="label">N° Bon Livraison</label><input type="text" value={articleForm.bonLivraison} onChange={e => setArticleForm({ ...articleForm, bonLivraison: e.target.value })} className="input-field" /></div>
                  <div className="col-span-2"><label className="label">Observations</label><textarea value={articleForm.observations} onChange={e => setArticleForm({ ...articleForm, observations: e.target.value })} className="input-field" rows={2} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowArticleModal(false); setEditingArticleIndex(null); }} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary">{editingArticleIndex !== null ? 'Modifier' : 'Ajouter'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
