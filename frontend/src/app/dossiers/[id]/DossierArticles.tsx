'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import ArticleFormSheet, { ArticleFormValues, EMPTY_ARTICLE_FORM } from '@/components/dossiers/ArticleFormSheet';
import { fmt, ICON_BTN, EmptyState } from './dossierShared';

interface Props {
  dossier: any;
  dossierId: string;
  isFerme: boolean;
  onReload: () => void;
}

/** Onglet « Articles / Conteneurs » : articles (CRUD + import Excel) et conteneurs du dossier. */
export default function DossierArticles({ dossier, dossierId, isFerme, onReload }: Props) {
  const confirmer = useConfirm();
  const [showSheet, setShowSheet] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articleForm, setArticleForm] = useState<ArticleFormValues>(EMPTY_ARTICLE_FORM);
  const [importingExcel, setImportingExcel] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const openNew = () => { setEditingArticle(null); setArticleForm(EMPTY_ARTICLE_FORM); setShowSheet(true); };
  const close = () => { setShowSheet(false); setEditingArticle(null); };

  const openEdit = (article: any) => {
    setEditingArticle(article);
    setArticleForm({
      designation: article.designation || '', type: article.type || '', marque: article.marque || '',
      modele: article.modele || '', quantite: String(article.quantite || 1), unite: article.unite || '',
      positionTarifaire: article.positionTarifaire || '', poids: article.poids ? String(article.poids) : '',
      valeur: article.valeur ? String(article.valeur) : '', origine: article.origine || '',
      bonLivraison: article.bonLivraison || '', observations: article.observations || '',
    });
    setShowSheet(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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
      close();
      setArticleForm(EMPTY_ARTICLE_FORM);
      onReload();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleDelete = async (a: any) => {
    if (!(await confirmer({ titre: 'Supprimer cet article ?', message: a.designation, danger: true, confirmer: 'Supprimer' }))) return;
    try {
      await api.delete(`/articles/${a.id}`);
      toast.success('Article supprimé');
      onReload();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const telechargerModele = () => {
    const entetes = ['N°', 'Désignation', 'Type', 'Marque', 'Modèle', 'Quantité', 'Unité', 'Position tarifaire', 'Poids (kg)', 'Valeur', 'Origine', 'Bon livraison', 'Observations'];
    const exemple = ['1', 'Groupe électrogène 20 kVA', 'Matériel électrique', 'Perkins', 'P20-3', '2', 'U', '8502.12.00', '850', '4500000', 'Royaume-Uni', 'BL-2026-014', 'Neuf'];
    const csv = '﻿' + [entetes, exemple].map(l => l.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'modele-import-articles.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      onReload();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur import'); }
    finally { setImportingExcel(false); e.target.value = ''; }
  };

  const articles: any[] = dossier.articles || [];
  const conteneurs: any[] = dossier.conteneurs || [];

  return (
    <div className="space-y-4">
      <section className="card" aria-labelledby="sec-articles">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 id="sec-articles" className="font-semibold">Articles / Marchandises ({articles.length})</h3>
          {!isFerme && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowImport(v => !v)} aria-expanded={showImport} className="btn-secondary">Importer</button>
              <button type="button" onClick={openNew} className="btn-primary hidden lg:inline-flex">
                <svg aria-hidden="true" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nouvel article
              </button>
            </div>
          )}
        </div>

        {showImport && !isFerme && (
          <div className="mb-4 p-3 text-xs border border-primary-200 bg-primary-50 text-primary-700 dark:bg-surface-700 dark:text-gray-200 dark:border-surface-600 rounded-lg space-y-2">
            <p className="font-semibold">Importer des articles depuis Excel ou CSV</p>
            <ol className="list-decimal ml-4 space-y-0.5">
              <li>Téléchargez le modèle : il contient les colonnes attendues et une ligne d&apos;exemple.</li>
              <li>Remplacez l&apos;exemple par vos articles, une ligne par article, sans changer les titres de colonnes.</li>
              <li>Enregistrez en .xlsx, .xls ou .csv, puis choisissez le fichier ci-dessous.</li>
            </ol>
            <p><b>Colonne obligatoire :</b> Désignation (ou Type). Les autres sont facultatives : Marque, Modèle, Quantité (1 par défaut), Unité, Position tarifaire, Poids (kg), Valeur, Origine, Bon livraison, Observations.</p>
            <p>La première feuille du classeur est lue. Les articles importés s&apos;ajoutent à ceux qui existent déjà. Les montants et poids s&apos;écrivent sans espace (ex. 4500000).</p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button type="button" onClick={telechargerModele} className="btn-secondary">Télécharger le modèle</button>
              <label className={`btn-secondary cursor-pointer ${importingExcel ? 'opacity-50' : ''}`}>
                <svg aria-hidden="true" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {importingExcel ? 'Import...' : 'Choisir un fichier Excel / CSV'}
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" disabled={importingExcel} />
              </label>
            </div>
          </div>
        )}

        {articles.length > 0 ? (
          <div className="table-container !shadow-none !border-0">
            <table className="w-full">
              <thead>
                <tr>
                  {!isFerme && <th className="table-header">Actions</th>}
                  <th className="table-header">N°</th>
                  <th className="table-header">Désignation</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Marque</th>
                  <th className="table-header">Qté</th>
                  <th className="table-header">Position tarifaire</th>
                  <th className="table-header">Poids</th>
                  <th className="table-header">Valeur</th>
                  <th className="table-header">Bon livraison</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a: any) => (
                  <tr key={a.id} className="table-row">
                    {!isFerme && (
                      <td className="table-cell" data-label="Actions">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEdit(a)} className={ICON_BTN} title="Modifier" aria-label={`Modifier l'article ${a.designation}`}>
                            <svg aria-hidden="true" className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button type="button" onClick={() => handleDelete(a)} className={ICON_BTN} title="Supprimer" aria-label={`Supprimer l'article ${a.designation}`}>
                            <svg aria-hidden="true" className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="table-cell font-medium col-opt" data-label="N°">{a.numero}</td>
                    <td className="table-cell" data-label="Désignation">{a.designation}</td>
                    <td className="table-cell col-opt" data-label="Type">{a.type || '-'}</td>
                    <td className="table-cell col-opt" data-label="Marque">{a.marque || '-'}</td>
                    <td className="table-cell text-center" data-label="Qté">{fmt(a.quantite)}</td>
                    <td className="table-cell font-mono text-xs col-opt" data-label="Position tarifaire">{a.positionTarifaire || '-'}</td>
                    <td className="table-cell text-right col-opt" data-label="Poids">{a.poids ? `${fmt(a.poids)} kg` : '-'}</td>
                    <td className="table-cell text-right font-mono" data-label="Valeur">{a.valeur ? `${fmt(a.valeur)} F` : '-'}</td>
                    <td className="table-cell col-opt" data-label="Bon livraison">{a.bonLivraison || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            message="Aucun article. Ajoutez-en un manuellement ou importez un fichier Excel."
            action={!isFerme ? <button type="button" onClick={openNew} className="btn-primary">Ajouter un article</button> : undefined}
          />
        )}
      </section>

      <section className="card" aria-labelledby="sec-conteneurs">
        <h3 id="sec-conteneurs" className="font-semibold mb-4">Conteneurs ({conteneurs.length})</h3>
        {conteneurs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {conteneurs.map((c: any) => (
              <div key={c.id} className="p-3 bg-gray-50 dark:bg-surface-700 rounded-lg text-sm">
                <p className="font-mono font-medium text-primary-600">{c.numero}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600 dark:text-gray-300">
                  <span>Type : {c.type || '-'}</span>
                  <span>Poids : {fmt(c.poids)} kg</span>
                  <span>Scellé : {c.scelle || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Aucun conteneur enregistré pour ce dossier.</p>
        )}
      </section>

      <ArticleFormSheet open={showSheet} editing={!!editingArticle} form={articleForm} onChange={setArticleForm} onClose={close} onSubmit={handleSave} />
      {!isFerme && <FAB label="Nouvel article" onClick={openNew} />}
    </div>
  );
}
