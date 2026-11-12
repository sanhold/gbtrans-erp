'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { dossiersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { statutColors, statutLabels, WORKFLOW_STEPS_DOSSIER as workflowSteps, STATUTS_DOSSIER_FERME } from '@/lib/dossierStatut';
import { textFields, numFields, FieldContext } from './dossierShared';
import DossierResume from './DossierResume';
import DossierArticles from './DossierArticles';
import DossierDocuments from './DossierDocuments';
import DossierFacturation from './DossierFacturation';
import DossierHistorique from './DossierHistorique';

export default function DossierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirmer = useConfirm();
  const dossierId = params.id as string;

  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('resume');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const buildEditForm = (d: any): Record<string, string> => {
    const form: Record<string, string> = {};
    [...textFields, ...numFields].forEach(f => { form[f] = d[f] != null ? String(d[f]) : ''; });
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
      if (statut === 'ARCHIVE') {
        const ok = await confirmer({
          titre: 'Archiver ce dossier ?',
          message: 'Plus aucune information ne pourra être ajoutée ou modifiée.',
          confirmer: 'Archiver',
        });
        if (!ok) return;
        await dossiersApi.archiver(dossierId);
      } else {
        await dossiersApi.changeStatut(dossierId, statut);
      }
      toast.success(`Statut modifié : ${statutLabels[statut]}`);
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
        if (editForm[f] !== oldVal) data[f] = editForm[f] || null;
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
        toast('Aucune modification détectée');
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

  const updateField = (field: string, value: string) => setEditForm(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4" aria-busy="true" aria-label="Chargement du dossier">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (notFound || !dossier) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <svg aria-hidden="true" className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-gray-600 text-lg">Dossier non trouvé</p>
          <button onClick={() => router.push('/dossiers')} className="btn-primary">Retour aux dossiers</button>
        </div>
      </AppLayout>
    );
  }

  const currentStep = workflowSteps.indexOf(dossier.statut);
  const isFerme = STATUTS_DOSSIER_FERME.includes(dossier.statut);
  const peutArchiver = dossier.statut === 'TERMINE';
  const ctx: FieldContext = { editing, dossier, editForm, updateField };

  const tabs = [
    { id: 'resume', label: 'Résumé' },
    { id: 'articles', label: `Articles / Conteneurs (${dossier.articles?.length || 0})` },
    { id: 'documents', label: 'Documents' },
    { id: 'facturation', label: `Facturation (${(dossier.proformas?.length || 0) + (dossier.factures?.length || 0)})` },
    { id: 'historique', label: 'Historique' },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* En-tête */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={() => router.push('/dossiers')} aria-label="Retour aux dossiers" className="min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700 flex-shrink-0">
              <svg aria-hidden="true" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">{dossier.numeroPhysique || dossier.numero}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{dossier.client?.raisonSociale} — {dossier.nature} {dossier.type}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
            <span className={`badge ${statutColors[dossier.statut]} text-sm px-3 py-1`}>{statutLabels[dossier.statut]}</span>
            {isFerme ? (
              <span className="text-xs text-gray-600 flex items-center gap-1.5">
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Dossier {statutLabels[dossier.statut].toLowerCase()} — lecture seule
              </span>
            ) : !editing ? (
              <button type="button" onClick={() => { setTab('resume'); setEditing(true); }} className="btn-primary max-sm:flex-1">
                <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
            ) : (
              <>
                <button type="button" onClick={cancelEdit} className="btn-secondary max-sm:flex-1">Annuler</button>
                <button type="button" onClick={handleSave} disabled={saving} className="btn-success disabled:opacity-50 max-sm:flex-1">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Workflow */}
        <div className="card !p-4">
          <ol className="flex items-center justify-between">
            {workflowSteps.map((step, i) => {
              const clicable = !isFerme || (peutArchiver && step === 'ARCHIVE');
              return (
                <li key={step} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => clicable && handleChangeStatut(step)}
                    disabled={!clicable}
                    aria-label={`${statutLabels[step]}${i === currentStep ? ' (étape actuelle)' : ''}`}
                    aria-current={i === currentStep ? 'step' : undefined}
                    title={clicable ? `Passer au statut : ${statutLabels[step]}` : 'Dossier verrouillé'}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 after:content-[''] after:absolute after:-inset-2
                      ${i <= currentStep ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-surface-700 text-gray-600'}
                      ${i === currentStep ? 'ring-4 ring-primary-200' : ''}
                      ${!clicable ? 'cursor-not-allowed opacity-70' : 'hover:scale-110 cursor-pointer'}`}
                  >
                    {i < currentStep ? (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : i + 1}
                  </button>
                  {i < workflowSteps.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded ${i < currentStep ? 'bg-primary-500' : 'bg-gray-200 dark:bg-surface-700'}`} />
                  )}
                </li>
              );
            })}
          </ol>
          <div className="hidden sm:flex justify-between mt-2">
            {workflowSteps.map(s => (
              <span key={s} className="text-[11px] text-gray-600 dark:text-gray-300 text-center flex-1">{statutLabels[s]}</span>
            ))}
          </div>
          <p className="sm:hidden text-xs text-gray-600 dark:text-gray-300 text-center mt-2">Étape actuelle : <b>{statutLabels[dossier.statut]}</b></p>
        </div>

        {/* Onglets */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Sections du dossier" className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-max min-w-full sm:min-w-0">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 min-h-[44px] sm:min-h-0 sm:py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  tab === t.id ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'resume' && <DossierResume ctx={ctx} onObservations={v => updateField('observations', v)} />}
        {tab === 'articles' && <DossierArticles dossier={dossier} dossierId={dossierId} isFerme={isFerme} onReload={load} />}
        {tab === 'documents' && <DossierDocuments dossierId={dossierId} />}
        {tab === 'facturation' && <DossierFacturation dossier={dossier} />}
        {tab === 'historique' && <DossierHistorique dossier={dossier} />}
      </div>
    </AppLayout>
  );
}
