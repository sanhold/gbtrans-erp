'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import { dossiersApi, clientsApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import ArticleFormSheet, { EMPTY_ARTICLE_FORM } from '@/components/dossiers/ArticleFormSheet';
import FormSection from './FormSection';

export default function NouveauDossierPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [processusList, setProcessusList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [numeroPhysiqueEdited, setNumeroPhysiqueEdited] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticleIndex, setEditingArticleIndex] = useState<number | null>(null);
  const emptyArticleForm = EMPTY_ARTICLE_FORM;
  const confirmer = useConfirm();
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
    clientsApi.listRef().then(res => setClients(res.data.data || [])).catch(() => {});
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

  const handleRemoveArticle = async (index: number) => {
    if (!(await confirmer({ titre: 'Retirer cet article ?', message: articles[index]?.designation, danger: true, confirmer: 'Retirer' }))) return;
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

      toast.success(`Dossier ${nouveauDossier.numeroPhysique || nouveauDossier.numero} créé avec succès${articles.length ? ` (${articles.length} article(s))` : ''}`);
      router.push(`/dossiers/${nouveauDossier.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} aria-label="Retour" className="min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
            <svg aria-hidden="true" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div><h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Nouveau dossier</h1><p className="text-sm text-gray-600">Créer un nouveau dossier de transit</p></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informations générales */}
          <FormSection title="Informations générales" defaultOpen={true} icon={<svg aria-hidden="true" className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Client *</label>
                <PickerField value={form.clientId} onChange={id => updateField('clientId', id)} options={clientOptions} placeholder="-- Sélectionner un client --" title="Sélectionner un client" searchPlaceholder="Raison sociale, code..." required />
              </div>
              <div>
                <label className="label">N° physique *</label>
                <div className="relative">
                  <input type="text" value={form.numeroPhysique} onChange={e => updateField('numeroPhysique', e.target.value)} className="input-field pr-11" placeholder="Ex: I-01/2026" required />
                  {numeroPhysiqueEdited && (
                    <button
                      type="button"
                      title="Revenir à la suggestion automatique"
                      onClick={() => setNumeroPhysiqueEdited(false)}
                      aria-label="Revenir à la suggestion automatique" className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-gray-500 hover:text-primary-600"
                    >
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">Proposé automatiquement selon la nature — modifiable si besoin</p>
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
          </FormSection>

          {/* Transport */}
          <FormSection title="Transport" defaultOpen={false} icon={<svg aria-hidden="true" className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10" /></svg>}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="label">Compagnie Maritime</label><input type="text" value={form.compagnieMaritime} onChange={e => updateField('compagnieMaritime', e.target.value)} className="input-field" placeholder="CMA CGM, MAERSK..." /></div>
              <div><label className="label">Navire</label><input type="text" value={form.navire} onChange={e => updateField('navire', e.target.value)} className="input-field" /></div>
              <div><label className="label">Voyage</label><input type="text" value={form.voyage} onChange={e => updateField('voyage', e.target.value)} className="input-field" /></div>
              <div><label className="label">N° BL</label><input type="text" value={form.numeroBL} onChange={e => updateField('numeroBL', e.target.value)} className="input-field" /></div>
              <div><label className="label">Port Origine</label><input type="text" value={form.portOrigine} onChange={e => updateField('portOrigine', e.target.value)} className="input-field" /></div>
              <div><label className="label">Port Destination</label><input type="text" value={form.portDestination} onChange={e => updateField('portDestination', e.target.value)} className="input-field" /></div>
            </div>
          </FormSection>

          {/* Marchandise */}
          <FormSection title="Marchandise" defaultOpen={false} icon={<svg aria-hidden="true" className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3"><label className="label">Désignation</label><textarea value={form.designation} onChange={e => updateField('designation', e.target.value)} className="input-field" rows={2} /></div>
              <div><label className="label">Poids Brut (kg)</label><input type="number" inputMode="decimal" step="0.001" value={form.poidsBrut} onChange={e => updateField('poidsBrut', e.target.value)} className="input-field" /></div>
              <div><label className="label">Poids Net (kg)</label><input type="number" inputMode="decimal" step="0.001" value={form.poidsNet} onChange={e => updateField('poidsNet', e.target.value)} className="input-field" /></div>
              <div><label className="label">Volume (m³)</label><input type="number" inputMode="decimal" step="0.001" value={form.volume} onChange={e => updateField('volume', e.target.value)} className="input-field" /></div>
              <div><label className="label">Nombre de Colis</label><input type="number" inputMode="decimal" value={form.nombreColis} onChange={e => updateField('nombreColis', e.target.value)} className="input-field" /></div>
              <div><label className="label">Emballage</label><input type="text" value={form.emballage} onChange={e => updateField('emballage', e.target.value)} className="input-field" placeholder="Cartons, palettes..." /></div>
            </div>
          </FormSection>

          {/* Articles */}
          <FormSection title="Articles / Marchandises" defaultOpen={false} icon={<svg aria-hidden="true" className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} badge={articles.length > 0 ? <span className="badge badge-gray">{articles.length}</span> : undefined}>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={openNewArticleModal} className="btn-secondary max-md:w-full">
                <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Ajouter un article
              </button>
            </div>
            {articles.length > 0 ? (
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Actions</th>
                      <th className="table-header">Désignation</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Quantité</th>
                      <th className="table-header">Unité</th>
                      <th className="table-header">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((a, i) => (
                      <tr key={i} className="table-row">
                        <td className="table-cell" data-label="Actions">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openEditArticleModal(i)} className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier" aria-label="Modifier l'article">
                              <svg aria-hidden="true" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button type="button" onClick={() => handleRemoveArticle(i)} className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer" aria-label="Retirer l'article">
                              <svg aria-hidden="true" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                        <td className="table-cell font-medium" data-label="Désignation">{a.designation}</td>
                        <td className="table-cell col-opt" data-label="Type">{a.type || '-'}</td>
                        <td className="table-cell" data-label="Quantité">{a.quantite || 1}</td>
                        <td className="table-cell col-opt" data-label="Unité">{a.unite || '-'}</td>
                        <td className="table-cell text-right font-mono" data-label="Valeur">{a.valeur ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(a.valeur)) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-6">Aucun article ajouté pour l&apos;instant.</p>
            )}
          </FormSection>

          {/* Valeur & Douane */}
          <FormSection title="Valeur et douane" defaultOpen={false} icon={<svg aria-hidden="true" className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="label">Valeur FOB</label><input type="number" inputMode="decimal" value={form.valeurFOB} onChange={e => updateField('valeurFOB', e.target.value)} className="input-field" /></div>
              <div><label className="label">Fret</label><input type="number" inputMode="decimal" value={form.fret} onChange={e => updateField('fret', e.target.value)} className="input-field" /></div>
              <div><label className="label">Assurance</label><input type="number" inputMode="decimal" value={form.assurance} onChange={e => updateField('assurance', e.target.value)} className="input-field" /></div>
              <div><label className="label">Incoterm</label><select value={form.incoterm} onChange={e => updateField('incoterm', e.target.value)} className="input-field"><option>CIF</option><option>FOB</option><option>CFR</option><option>EXW</option><option>FCA</option><option>DAP</option><option>DDP</option></select></div>
              <div><label className="label">Devise</label><select value={form.devise} onChange={e => updateField('devise', e.target.value)} className="input-field"><option>XOF</option><option>EUR</option><option>USD</option></select></div>
              <div><label className="label">Régime Douanier</label><input type="text" value={form.regimeDouanier} onChange={e => updateField('regimeDouanier', e.target.value)} className="input-field" placeholder="Mise à la consommation..." /></div>
              <div><label className="label">Bureau de Douane</label><input type="text" value={form.bureauDouane} onChange={e => updateField('bureauDouane', e.target.value)} className="input-field" /></div>
            </div>
          </FormSection>

          {/* Observations */}
          <FormSection title="Observations" defaultOpen={false}>
            <label className="label sr-only">Observations</label>
            <textarea value={form.observations} onChange={e => updateField('observations', e.target.value)} className="input-field" rows={3} placeholder="Notes, instructions particulières..." />
          </FormSection>

          {/* Actions */}
          <div className="sticky bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] lg:bottom-0 z-20 -mx-4 px-4 py-3 bg-white/95 dark:bg-surface-800/95 backdrop-blur border-t border-gray-200 dark:border-surface-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto disabled:opacity-50">
              {saving ? <><svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Création...</> : 'Créer le dossier'}
            </button>
          </div>
        </form>

        <ArticleFormSheet
          open={showArticleModal}
          editing={editingArticleIndex !== null}
          form={articleForm}
          onChange={setArticleForm}
          onClose={() => { setShowArticleModal(false); setEditingArticleIndex(null); }}
          onSubmit={handleSaveArticle}
        />
      </div>
    </AppLayout>
  );
}
