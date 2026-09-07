'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import { dossiersApi, utilisateursApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { statutColors } from '@/lib/dossierStatut';

export default function SuiviDossiersPage() {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [etapes, setEtapes] = useState<any[]>([]);
  const [peutModifier, setPeutModifier] = useState(true);
  const [loadingEtapes, setLoadingEtapes] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);

  const [validating, setValidating] = useState<string | null>(null);
  const [validForm, setValidForm] = useState<{ dateRealisation: string; executantId: string; commentaire: string }>({ dateRealisation: new Date().toISOString().slice(0, 10), executantId: '', commentaire: '' });

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ nom: '', description: '', obligatoire: false });

  useEffect(() => {
    utilisateursApi.list().then(r => setUtilisateurs((r.data.data || []).filter((u: any) => u.actif))).catch(() => {});
  }, []);

  const utilisateurOptions = utilisateurs.map(u => ({ id: u.id, label: `${u.prenom} ${u.nom}` }));

  useEffect(() => {
    setLoadingDossiers(true);
    const timer = setTimeout(() => {
      dossiersApi.list({ limit: 50, search: search || undefined, sortBy: 'dateCreation', sortOrder: 'desc' })
        .then(r => setDossiers(r.data.data || []))
        .catch(() => toast.error('Erreur de chargement des dossiers'))
        .finally(() => setLoadingDossiers(false));
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const loadDossierEtapes = async (id: string) => {
    setSelectedId(id);
    setValidating(null);
    setAdding(false);
    setLoadingEtapes(true);
    try {
      const [dRes, eRes] = await Promise.all([dossiersApi.get(id), dossiersApi.etapes(id)]);
      setDossier(dRes.data.data);
      setEtapes(eRes.data.data?.etapes || []);
      setPeutModifier(eRes.data.data?.peutModifier ?? true);
    } catch { toast.error('Erreur de chargement des étapes'); }
    finally { setLoadingEtapes(false); }
  };

  const openValidation = (etape: any) => {
    setValidating(etape.id);
    setValidForm({
      dateRealisation: etape.dateRealisation ? etape.dateRealisation.slice(0, 10) : new Date().toISOString().slice(0, 10),
      executantId: etape.executant?.id || '',
      commentaire: etape.commentaire || '',
    });
  };

  const handleValider = async (etapeId: string) => {
    if (!validForm.executantId) { toast.error('Sélectionnez le personnel ayant exécuté cette étape'); return; }
    try {
      const res = await dossiersApi.validerEtape(selectedId!, etapeId, {
        statut: 'VALIDEE', executantId: validForm.executantId, dateRealisation: validForm.dateRealisation, commentaire: validForm.commentaire || undefined,
      });
      setEtapes(prev => prev.map(e => e.id === etapeId ? { ...e, statut: 'VALIDEE', dateRealisation: res.data.data.dateRealisation, executant: res.data.data.executant, commentaire: res.data.data.commentaire } : e));
      setValidating(null);
      toast.success('Étape validée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleReinitialiser = async (etapeId: string) => {
    if (!confirm('Réinitialiser cette étape (retour à "À faire") ?')) return;
    try {
      await dossiersApi.validerEtape(selectedId!, etapeId, { statut: 'A_FAIRE' });
      setEtapes(prev => prev.map(e => e.id === etapeId ? { ...e, statut: 'A_FAIRE', dateRealisation: null, executant: null } : e));
      toast.success('Étape réinitialisée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleAjouter = async () => {
    if (!addForm.nom.trim()) { toast.error("Le nom de l'étape est requis"); return; }
    try {
      const res = await dossiersApi.ajouterEtape(selectedId!, {
        nom: addForm.nom.trim(),
        description: addForm.description.trim() || undefined,
        obligatoire: addForm.obligatoire,
      });
      setEtapes(prev => [...prev, res.data.data]);
      setAdding(false);
      setAddForm({ nom: '', description: '', obligatoire: false });
      toast.success('Étape ajoutée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleDeplacer = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= etapes.length) return;
    const reordered = [...etapes];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setEtapes(reordered);
    try {
      await dossiersApi.reorderEtapes(selectedId!, reordered.map(e => e.id));
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur de réordonnancement');
      loadDossierEtapes(selectedId!);
    }
  };

  const handleSupprimer = async (etapeId: string) => {
    if (!confirm('Supprimer cette étape pour ce dossier ? Elle ne sera retirée que de ce dossier, pas du processus type.')) return;
    try {
      await dossiersApi.supprimerEtape(selectedId!, etapeId);
      setEtapes(prev => prev.filter(e => e.id !== etapeId));
      toast.success('Étape supprimée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const nbValidees = etapes.filter(e => e.statut === 'VALIDEE').length;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suivi d&apos;exécution des dossiers</h1>
          <p className="text-sm text-gray-500">Sélectionnez un dossier pour valider ses étapes au fur et à mesure de leur exécution physique.</p>
        </div>

        <div className="flex gap-4 items-start">
          {/* Panneau gauche : liste des dossiers */}
          <div className="w-80 flex-shrink-0 card !p-3 space-y-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="N° physique, client, BL, déclaration..." className="input-field pl-9 text-sm" />
            </div>
            <div className="max-h-[65vh] overflow-y-auto space-y-1">
              {loadingDossiers ? (
                <div className="text-center py-8"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
              ) : dossiers.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">Aucun dossier</p>
              ) : dossiers.map(d => (
                <button key={d.id} onClick={() => loadDossierEtapes(d.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${selectedId === d.id ? 'bg-primary-50 border-primary-300 dark:bg-primary-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-surface-700'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary-600">{d.numeroPhysique || d.numero}</span>
                    <span className={`badge ${statutColors[d.statut] || 'badge-gray'} !text-[10px]`}>{d.statut?.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">{d.client?.raisonSociale}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Panneau droit : étapes du dossier sélectionné */}
          <div className="flex-1 card !p-0 overflow-hidden">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" /></svg>
                <p className="text-sm">Sélectionnez un dossier à gauche pour afficher ses étapes.</p>
              </div>
            ) : loadingEtapes ? (
              <div className="flex items-center justify-center py-24"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
            ) : (
              <div>
                <div className="p-4 border-b border-gray-100 dark:border-surface-700 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">{dossier?.numeroPhysique || dossier?.numero} — {dossier?.client?.raisonSociale}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      N° dossier {dossier?.numero} · {dossier?.processus ? <>Processus : <span className="font-medium">{dossier.processus.nom}</span></> : 'Aucun processus de suivi assigné à ce dossier'}
                    </p>
                    {!peutModifier && (
                      <p className="text-[11px] text-amber-600 mt-1">Dossier {dossier?.statut?.toLowerCase()} : les étapes ne peuvent plus être ajoutées, déplacées ou supprimées.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {etapes.length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{nbValidees} / {etapes.length} étapes validées</p>
                        <div className="w-40 h-1.5 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${etapes.length ? (nbValidees / etapes.length) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                    {peutModifier && !adding && (
                      <button onClick={() => setAdding(true)} className="btn-secondary !py-1.5 !px-3 text-xs whitespace-nowrap">+ Ajouter une étape</button>
                    )}
                  </div>
                </div>

                {adding && (
                  <div className="p-4 border-b border-gray-100 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-700/30 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Nom de l&apos;étape *</label>
                      <input type="text" value={addForm.nom} onChange={ev => setAddForm({ ...addForm, nom: ev.target.value })} placeholder="Ex : Visite technique du véhicule" className="input-field !py-1.5 text-xs" autoFocus />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Description (optionnel)</label>
                      <input type="text" value={addForm.description} onChange={ev => setAddForm({ ...addForm, description: ev.target.value })} className="input-field !py-1.5 text-xs" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <input type="checkbox" checked={addForm.obligatoire} onChange={ev => setAddForm({ ...addForm, obligatoire: ev.target.checked })} />
                        Obligatoire
                      </label>
                      <div className="flex-1" />
                      <button onClick={() => { setAdding(false); setAddForm({ nom: '', description: '', obligatoire: false }); }} className="btn-secondary !py-1.5 !px-3 text-xs">Annuler</button>
                      <button onClick={handleAjouter} className="btn-primary !py-1.5 !px-3 text-xs">Ajouter</button>
                    </div>
                  </div>
                )}

                {etapes.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm px-4">
                    {dossier?.processus ? 'Ce processus ne comporte aucune étape définie.' : "Assignez un processus de suivi à ce dossier (fiche du dossier), ou ajoutez des étapes manuellement, pour les faire apparaître ici."}
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {etapes.map((e, idx) => {
                      const done = e.statut === 'VALIDEE';
                      return (
                        <div key={e.id} className={`border rounded-lg overflow-hidden ${done ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800' : 'border-gray-200 dark:border-surface-700'}`}>
                          <div className="p-3 flex items-start gap-3">
                            {peutModifier && (
                              <div className="flex flex-col flex-shrink-0 -my-1">
                                <button onClick={() => handleDeplacer(idx, -1)} disabled={idx === 0} title="Monter" className="text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:hover:text-gray-400 leading-none">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button onClick={() => handleDeplacer(idx, 1)} disabled={idx === etapes.length - 1} title="Descendre" className="text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:hover:text-gray-400 leading-none">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                </button>
                              </div>
                            )}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-surface-600 text-gray-600 dark:text-gray-300'}`}>
                              {done ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              ) : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{e.nom}</p>
                                {e.obligatoire && <span className="text-[10px] text-amber-600 font-medium">Obligatoire</span>}
                                {e.custom && <span className="text-[10px] text-primary-600 font-medium">Ajoutée manuellement</span>}
                              </div>
                              {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                              {done ? (
                                <p className="text-xs text-green-700 dark:text-green-400 mt-1.5">
                                  Exécutée le {new Date(e.dateRealisation).toLocaleDateString('fr-FR')} par <span className="font-medium">{e.executant ? `${e.executant.prenom} ${e.executant.nom}` : '—'}</span>
                                  {e.commentaire && <span className="text-gray-500"> — {e.commentaire}</span>}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                              {done ? (
                                peutModifier && <button onClick={() => handleReinitialiser(e.id)} className="text-xs text-gray-400 hover:text-red-500">Réinitialiser</button>
                              ) : validating === e.id ? null : (
                                <button onClick={() => openValidation(e)} className="btn-primary !py-1.5 !px-3 text-xs">Valider</button>
                              )}
                              {peutModifier && !done && (
                                <button onClick={() => handleSupprimer(e.id)} title="Supprimer cette étape" className="text-gray-300 hover:text-red-500">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {validating === e.id && (
                            <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-700/30 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Exécuté par *</label>
                                <PickerField value={validForm.executantId} onChange={id => setValidForm({ ...validForm, executantId: id })} options={utilisateurOptions} placeholder="— Sélectionner —" title="Sélectionner l'exécutant" searchPlaceholder="Nom, prénom..." className="!py-1.5 text-xs" required />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Date d&apos;exécution</label>
                                <input type="date" value={validForm.dateRealisation} onChange={ev => setValidForm({ ...validForm, dateRealisation: ev.target.value })} className="input-field !py-1.5 text-xs" />
                              </div>
                              <div className="flex gap-2">
                                <input type="text" value={validForm.commentaire} onChange={ev => setValidForm({ ...validForm, commentaire: ev.target.value })} placeholder="Commentaire (optionnel)" className="input-field !py-1.5 text-xs flex-1" />
                              </div>
                              <div className="sm:col-span-3 flex justify-end gap-2">
                                <button onClick={() => setValidating(null)} className="btn-secondary !py-1.5 !px-3 text-xs">Annuler</button>
                                <button onClick={() => handleValider(e.id)} className="btn-primary !py-1.5 !px-3 text-xs">Confirmer la validation</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
