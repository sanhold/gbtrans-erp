'use client';

import { Fragment, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

const emptyLigne = () => ({ compteId: '', libelle: '', debit: '', credit: '' });
const emptyEcritureForm = () => ({ journalId: '', dateEcriture: new Date().toISOString().slice(0, 10), libelle: '', reference: '', piece: '', lignes: [emptyLigne(), emptyLigne()] });
const emptyExerciceForm = { code: '', libelle: '', dateDebut: '', dateFin: '' };

export default function ComptaReelPage() {
  const [tab, setTab] = useState<'ecritures' | 'grand-livre' | 'balance' | 'bilan'>('ecritures');
  const [exercices, setExercices] = useState<any[]>([]);
  const [exerciceId, setExerciceId] = useState('');
  const [comptes, setComptes] = useState<any[]>([]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showExerciceModal, setShowExerciceModal] = useState(false);
  const [exerciceForm, setExerciceForm] = useState(emptyExerciceForm);
  const [savingExercice, setSavingExercice] = useState(false);

  const loadExercices = () => {
    comptabiliteApi.exercices({ source: 'REEL' }).then(r => {
      const data = r.data.data || [];
      setExercices(data);
      if (data.length > 0 && !exerciceId) setExerciceId(data[0].id);
    }).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([comptabiliteApi.comptes(), comptabiliteApi.journaux()])
      .then(([cRes, jRes]) => { setComptes(cRes.data.data || []); setJournaux(jRes.data.data || []); })
      .finally(() => setLoading(false));
    loadExercices();
  }, []);

  const handleCreerExercice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExercice(true);
    try {
      const res = await comptabiliteApi.creerExercice({ ...exerciceForm, source: 'REEL' });
      toast.success('Exercice créé');
      setShowExerciceModal(false);
      setExerciceForm(emptyExerciceForm);
      loadExercices();
      setExerciceId(res.data.data.id);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingExercice(false); }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compta Réel</h1>
            <p className="text-sm text-gray-500">Comptabilité saisie manuellement, indépendante des écritures générées par les transactions</p>
          </div>
          <div className="flex gap-2 items-center">
            <select value={exerciceId} onChange={e => setExerciceId(e.target.value)} className="input-field !w-auto text-sm">
              {exercices.length === 0 && <option value="">Aucun exercice réel</option>}
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.libelle} ({ex.code})</option>)}
            </select>
            <button onClick={() => setShowExerciceModal(true)} className="btn-secondary text-sm">+ Nouvel exercice</button>
          </div>
        </div>

        {exercices.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="mb-3">Aucun exercice de comptabilité réelle. Créez-en un pour commencer à saisir vos écritures manuellement.</p>
            <button onClick={() => setShowExerciceModal(true)} className="btn-primary text-sm">+ Nouvel exercice</button>
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-fit">
              {[
                { id: 'ecritures', label: 'Écritures' },
                { id: 'grand-livre', label: 'Grand Livre' },
                { id: 'balance', label: 'Balance' },
                { id: 'bilan', label: 'Bilan' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === t.id ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'ecritures' && <EcrituresTab exerciceId={exerciceId} comptes={comptes} journaux={journaux} />}
            {tab === 'grand-livre' && <GrandLivreTab exerciceId={exerciceId} />}
            {tab === 'balance' && <BalanceTab exerciceId={exerciceId} />}
            {tab === 'bilan' && <BilanTab exerciceId={exerciceId} />}
          </>
        )}
      </div>

      {showExerciceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Nouvel exercice (Compta Réel)</h3>
              <button onClick={() => setShowExerciceModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleCreerExercice} className="p-4 space-y-3">
              <div><label className="label">Code *</label><input type="text" value={exerciceForm.code} onChange={e => setExerciceForm({ ...exerciceForm, code: e.target.value })} className="input-field" placeholder="2026-REEL" required /></div>
              <div><label className="label">Libellé *</label><input type="text" value={exerciceForm.libelle} onChange={e => setExerciceForm({ ...exerciceForm, libelle: e.target.value })} className="input-field" placeholder="Exercice réel 2026" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date de début *</label><input type="date" value={exerciceForm.dateDebut} onChange={e => setExerciceForm({ ...exerciceForm, dateDebut: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Date de fin *</label><input type="date" value={exerciceForm.dateFin} onChange={e => setExerciceForm({ ...exerciceForm, dateFin: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setShowExerciceModal(false)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" disabled={savingExercice} className="btn-primary text-sm disabled:opacity-50">{savingExercice ? 'Création...' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ---------- Écritures ----------

function EcrituresTab({ exerciceId, comptes, journaux }: { exerciceId: string; comptes: any[]; journaux: any[] }) {
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyEcritureForm());
  const [saving, setSaving] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    comptabiliteApi.ecritures({ exerciceId, limit: 100 })
      .then(r => setEcritures(r.data.data || []))
      .catch(() => setEcritures([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (exerciceId) load(); }, [exerciceId]);

  const openCreate = () => { setForm(emptyEcritureForm()); setShowModal(true); };

  const updateLigne = (i: number, field: string, value: string) => {
    setForm(prev => ({ ...prev, lignes: prev.lignes.map((l: any, idx: number) => idx === i ? { ...l, [field]: value } : l) }));
  };
  const addLigne = () => setForm(prev => ({ ...prev, lignes: [...prev.lignes, emptyLigne()] }));
  const removeLigne = (i: number) => setForm(prev => ({ ...prev, lignes: prev.lignes.filter((_: any, idx: number) => idx !== i) }));

  const totalDebit = form.lignes.reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lignes.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);
  const equilibre = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.journalId) { toast.error('Sélectionnez un journal'); return; }
    if (!equilibre) { toast.error('L\'écriture doit être équilibrée (débit = crédit)'); return; }
    const lignesValides = form.lignes.filter((l: any) => l.compteId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (lignesValides.length < 2) { toast.error('Au moins 2 lignes avec un compte et un montant sont requises'); return; }

    setSaving(true);
    try {
      await comptabiliteApi.creerEcriture({
        exerciceId, journalId: form.journalId, dateEcriture: form.dateEcriture,
        libelle: form.libelle, reference: form.reference || undefined, piece: form.piece || undefined,
        mouvements: lignesValides.map((l: any) => ({ compteId: l.compteId, libelle: l.libelle || undefined, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 })),
      });
      toast.success('Écriture créée');
      setShowModal(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleValider = async (id: string) => {
    try { await comptabiliteApi.validerEcriture(id); toast.success('Écriture validée'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };
  const handleSupprimer = async (id: string) => {
    if (!confirm('Supprimer cette écriture ?')) return;
    try { await comptabiliteApi.supprimerEcriture(id); toast.success('Écriture supprimée'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button onClick={openCreate} className="btn-primary text-sm">+ Nouvelle écriture</button></div>
      <div className="table-container">
        <table className="w-full">
          <thead><tr>
            <th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header">Journal</th>
            <th className="table-header">Libellé</th><th className="table-header text-right">Débit</th><th className="table-header text-right">Crédit</th>
            <th className="table-header">Statut</th><th className="table-header">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
            ) : ecritures.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucune écriture. Cliquez sur &quot;+ Nouvelle écriture&quot;.</td></tr>
            ) : ecritures.map(ec => {
              const total = ec.mouvements.reduce((s: number, m: any) => s + Number(m.debit), 0);
              return (
                <Fragment key={ec.id}>
                  <tr className="table-row cursor-pointer" onClick={() => setOuverte(ouverte === ec.id ? null : ec.id)}>
                    <td className="table-cell font-mono text-xs text-primary-600" data-label="N°">{ec.numero}</td>
                    <td className="table-cell text-xs" data-label="Date">{new Date(ec.dateEcriture).toLocaleDateString('fr-FR')}</td>
                    <td className="table-cell" data-label="Journal"><span className="badge badge-gray">{ec.journal.code}</span></td>
                    <td className="table-cell text-xs" data-label="Libellé">{ec.libelle}</td>
                    <td className="table-cell text-right font-mono" data-label="Débit">{fmt(total)}</td>
                    <td className="table-cell text-right font-mono" data-label="Crédit">{fmt(total)}</td>
                    <td className="table-cell" data-label="Statut"><span className={`badge ${ec.validee ? 'badge-success' : 'badge-gray'}`}>{ec.validee ? 'Validée' : 'Brouillon'}</span></td>
                    <td className="table-cell" data-label="Actions">
                      {!ec.validee && (
                        <div className="flex gap-2 text-xs" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleValider(ec.id)} className="text-primary-500 hover:underline">Valider</button>
                          <button onClick={() => handleSupprimer(ec.id)} className="text-red-500 hover:underline">Supprimer</button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {ouverte === ec.id && (
                    <tr>
                      <td colSpan={8} className="p-0 bg-gray-50 dark:bg-surface-700/40">
                        <table className="w-full text-xs">
                          <thead><tr><th className="table-header !py-1.5">Compte</th><th className="table-header !py-1.5">Libellé</th><th className="table-header !py-1.5 text-right">Débit</th><th className="table-header !py-1.5 text-right">Crédit</th></tr></thead>
                          <tbody>
                            {ec.mouvements.map((m: any) => (
                              <tr key={m.id} className="border-t border-gray-100 dark:border-surface-700">
                                <td className="px-3 py-1.5 font-mono">{m.compte.numero} — {m.compte.libelle}</td>
                                <td className="px-3 py-1.5">{m.libelle || '-'}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{Number(m.debit) > 0 ? fmt(m.debit) : ''}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{Number(m.credit) > 0 ? fmt(m.credit) : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Nouvelle écriture</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Journal *</label>
                  <select value={form.journalId} onChange={e => setForm({ ...form, journalId: e.target.value })} className="input-field" required>
                    <option value="">— Sélectionner —</option>
                    {journaux.map(j => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
                  </select>
                </div>
                <div><label className="label">Date *</label><input type="date" value={form.dateEcriture} onChange={e => setForm({ ...form, dateEcriture: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Pièce / Référence</label><input type="text" value={form.piece} onChange={e => setForm({ ...form, piece: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>

              <div className="border border-gray-200 dark:border-surface-700 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_110px_110px_28px] bg-gray-100 dark:bg-surface-700 text-[10px] font-bold uppercase text-gray-500">
                  <div className="px-2 py-2">Compte</div><div className="px-2 py-2">Libellé</div>
                  <div className="px-2 py-2 text-right">Débit</div><div className="px-2 py-2 text-right">Crédit</div><div></div>
                </div>
                {form.lignes.map((l: any, i: number) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_110px_110px_28px] border-t border-gray-100 dark:border-surface-700">
                    <select value={l.compteId} onChange={e => updateLigne(i, 'compteId', e.target.value)} className="text-xs bg-transparent border-0 px-2 py-1.5 outline-none">
                      <option value="">— Compte —</option>
                      {comptes.map((c: any) => <option key={c.id} value={c.id}>{c.numero} {c.libelle}</option>)}
                    </select>
                    <input type="text" value={l.libelle} onChange={e => updateLigne(i, 'libelle', e.target.value)} className="text-xs bg-transparent border-0 px-2 py-1.5 outline-none" placeholder="Libellé de la ligne" />
                    <input type="number" value={l.debit} onChange={e => updateLigne(i, 'debit', e.target.value)} className="text-xs bg-transparent border-0 px-2 py-1.5 outline-none text-right font-mono" placeholder="0" />
                    <input type="number" value={l.credit} onChange={e => updateLigne(i, 'credit', e.target.value)} className="text-xs bg-transparent border-0 px-2 py-1.5 outline-none text-right font-mono" placeholder="0" />
                    <button type="button" onClick={() => removeLigne(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))}
                <div className="p-2 border-t border-gray-100 dark:border-surface-700">
                  <button type="button" onClick={addLigne} className="text-xs text-primary-500 hover:underline">+ Ajouter une ligne</button>
                </div>
                <div className={`grid grid-cols-[1fr_1fr_110px_110px_28px] border-t-2 font-bold text-xs ${equilibre ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-red-300 bg-red-50 dark:bg-red-900/10'}`}>
                  <div className="px-2 py-2 col-span-2">{equilibre ? '✓ Équilibrée' : 'Non équilibrée'}</div>
                  <div className="px-2 py-2 text-right font-mono">{fmt(totalDebit)}</div>
                  <div className="px-2 py-2 text-right font-mono">{fmt(totalCredit)}</div>
                  <div></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" disabled={saving || !equilibre} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Enregistrement...' : 'Créer l\'écriture'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Grand Livre ----------

function GrandLivreTab({ exerciceId }: { exerciceId: string }) {
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.grandLivre({ exerciceId }).then(r => setComptes(r.data.data || [])).catch(() => setComptes([])).finally(() => setLoading(false));
  }, [exerciceId]);

  const toggle = (id: string) => setOuverts(o => ({ ...o, [id]: !o[id] }));

  if (loading) return <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
  if (comptes.length === 0) return <div className="card text-center py-12 text-gray-500">Aucun mouvement</div>;

  return (
    <div className="space-y-3">
      {comptes.map((c: any) => (
        <div key={c.compte.id} className="card !p-0 overflow-hidden">
          <button onClick={() => toggle(c.compte.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-surface-700">
            <div className="flex items-center gap-3">
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${ouverts[c.compte.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="font-mono font-semibold text-primary-600">{c.compte.numero}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{c.compte.libelle}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-500">Débit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalDebit)}</span></span>
              <span className="text-gray-500">Crédit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalCredit)}</span></span>
              <span className={`font-mono font-bold ${c.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(Math.abs(c.solde))} {c.solde >= 0 ? 'D' : 'C'}</span>
            </div>
          </button>
          {ouverts[c.compte.id] && (
            <div className="table-container !shadow-none !border-0 !rounded-none border-t border-gray-200 dark:border-surface-700">
              <table className="w-full">
                <thead><tr><th className="table-header">Date</th><th className="table-header">Journal</th><th className="table-header">N° Écriture</th><th className="table-header">Libellé</th><th className="table-header text-right">Débit</th><th className="table-header text-right">Crédit</th></tr></thead>
                <tbody>
                  {c.mouvements.map((m: any) => (
                    <tr key={m.id} className="table-row">
                      <td className="table-cell text-xs" data-label="Date">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                      <td className="table-cell" data-label="Journal">{m.journal}</td>
                      <td className="table-cell font-mono text-xs" data-label="N° Écriture">{m.numeroEcriture}</td>
                      <td className="table-cell" data-label="Libellé">{m.libelle}</td>
                      <td className="table-cell text-right font-mono" data-label="Débit">{Number(m.debit) > 0 ? fmt(m.debit) : ''}</td>
                      <td className="table-cell text-right font-mono" data-label="Crédit">{Number(m.credit) > 0 ? fmt(m.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Balance ----------

function BalanceTab({ exerciceId }: { exerciceId: string }) {
  const [lignes, setLignes] = useState<any[]>([]);
  const [totaux, setTotaux] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.balance({ exerciceId }).then(r => { setLignes(r.data.data.lignes || []); setTotaux(r.data.data.totaux); }).catch(() => { setLignes([]); setTotaux(null); }).finally(() => setLoading(false));
  }, [exerciceId]);

  return (
    <div className="table-container overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <th className="table-header">Compte</th><th className="table-header">Libellé</th>
          <th className="table-header text-right">Total Débit</th><th className="table-header text-right">Total Crédit</th>
          <th className="table-header text-right">Solde Débiteur</th><th className="table-header text-right">Solde Créditeur</th>
        </tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
          ) : lignes.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun mouvement</td></tr>
          ) : lignes.map((l: any) => (
            <tr key={l.compte} className="table-row">
              <td className="table-cell font-mono font-medium text-primary-600" data-label="Compte">{l.compte}</td>
              <td className="table-cell" data-label="Libellé">{l.libelle}</td>
              <td className="table-cell text-right font-mono" data-label="Total Débit">{fmt(l.debit)}</td>
              <td className="table-cell text-right font-mono" data-label="Total Crédit">{fmt(l.credit)}</td>
              <td className="table-cell text-right font-mono font-medium text-green-600" data-label="Solde Débiteur">{l.soldeDebiteur > 0 ? fmt(l.soldeDebiteur) : ''}</td>
              <td className="table-cell text-right font-mono font-medium text-red-600" data-label="Solde Créditeur">{l.soldeCrediteur > 0 ? fmt(l.soldeCrediteur) : ''}</td>
            </tr>
          ))}
        </tbody>
        {totaux && !loading && lignes.length > 0 && (
          <tfoot>
            <tr className="bg-gray-100 dark:bg-surface-700 font-bold">
              <td className="table-cell" colSpan={2}>TOTAUX</td>
              <td className="table-cell text-right font-mono">{fmt(totaux.debit)}</td>
              <td className="table-cell text-right font-mono">{fmt(totaux.credit)}</td>
              <td className="table-cell text-right font-mono text-green-600">{fmt(totaux.soldeDebiteur)}</td>
              <td className="table-cell text-right font-mono text-red-600">{fmt(totaux.soldeCrediteur)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ---------- Bilan ----------

function BilanTab({ exerciceId }: { exerciceId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.bilan({ exerciceId }).then(r => setData(r.data.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [exerciceId]);

  if (loading) return <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
  if (!data) return <div className="card text-center py-12 text-gray-500">Aucune donnée</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Actif</h3>
          <table className="w-full text-sm">
            <tbody>
              {data.bilan.actif.map((l: any) => (
                <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700">
                  <td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL ACTIF</td><td className="py-2 text-right font-mono">{fmt(data.bilan.totalActif)}</td></tr></tfoot>
          </table>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Passif</h3>
          <table className="w-full text-sm">
            <tbody>
              {data.bilan.passif.map((l: any) => (
                <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700">
                  <td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td>
                </tr>
              ))}
              <tr className="border-b border-gray-100 dark:border-surface-700">
                <td className="py-1.5 font-mono text-xs text-gray-500">—</td><td className="py-1.5 italic">Résultat net de l&apos;exercice</td>
                <td className={`py-1.5 text-right font-mono ${data.bilan.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.bilan.resultatNet)}</td>
              </tr>
            </tbody>
            <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL PASSIF</td><td className="py-2 text-right font-mono">{fmt(data.bilan.totalPassif)}</td></tr></tfoot>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Charges</h3>
          <table className="w-full text-sm">
            <tbody>
              {data.compteResultat.charges.map((l: any) => (
                <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700"><td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL CHARGES</td><td className="py-2 text-right font-mono">{fmt(data.compteResultat.totalCharges)}</td></tr></tfoot>
          </table>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Produits</h3>
          <table className="w-full text-sm">
            <tbody>
              {data.compteResultat.produits.map((l: any) => (
                <tr key={l.compte} className="border-b border-gray-100 dark:border-surface-700"><td className="py-1.5 font-mono text-xs text-gray-500">{l.compte}</td><td className="py-1.5">{l.libelle}</td><td className="py-1.5 text-right font-mono">{fmt(l.montant)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="font-bold border-t-2 border-gray-300 dark:border-surface-600"><td className="py-2" colSpan={2}>TOTAL PRODUITS</td><td className="py-2 text-right font-mono">{fmt(data.compteResultat.totalProduits)}</td></tr></tfoot>
          </table>
        </div>
      </div>
      <div className="card !p-4 flex items-center justify-between">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Résultat Net de l&apos;exercice</span>
        <span className={`text-xl font-bold font-mono ${data.compteResultat.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.compteResultat.resultatNet)} XOF</span>
      </div>
    </div>
  );
}
