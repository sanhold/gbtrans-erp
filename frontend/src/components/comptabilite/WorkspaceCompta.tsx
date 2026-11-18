'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeValider, IconeSupprimer } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant, StatutPastille } from '@/components/tables/cellules';
import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BASE_AUTO, BASE_REEL, ONGLETS_AUTO, ONGLETS_REEL, type OngletCompta } from '@/lib/comptaOnglets';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import { comptabiliteApi } from '@/lib/api';
import GenerationAutoTab from './GenerationAutoTab';
import PlanComptablePanel from './PlanComptablePanel';
import InfoBulle from '@/components/ui/InfoBulle';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

const emptyLigne = () => ({ compteId: '', libelle: '', debit: '', credit: '' });
const emptyEcritureForm = () => ({ journalId: '', dateEcriture: new Date().toISOString().slice(0, 10), libelle: '', reference: '', piece: '', lignes: [emptyLigne(), emptyLigne()] });
const emptyExerciceForm = { code: '', libelle: '', dateDebut: '', dateFin: '' };

export default function WorkspaceCompta({ source, onglet }: { source: 'REEL' | 'AUTO'; onglet: OngletCompta }) {
  const router = useRouter();
  const estReel = source === 'REEL';
  const origine: 'AUTO' | 'MANUEL' = estReel ? 'MANUEL' : 'AUTO';
  const tab = onglet;
  const defs = estReel ? ONGLETS_REEL : ONGLETS_AUTO;
  const titrePage = defs.find(d => d.onglet === onglet)?.libelle || (estReel ? 'Compta Manuelle' : 'Compta Auto');
  const [exercices, setExercices] = useState<any[]>([]);
  const [exerciceId, setExerciceId] = useState('');
  const [comptes, setComptes] = useState<any[]>([]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);

  const [showExerciceModal, setShowExerciceModal] = useState(false);
  const [exerciceForm, setExerciceForm] = useState(emptyExerciceForm);
  const [savingExercice, setSavingExercice] = useState(false);

  const loadExercices = () => {
    comptabiliteApi.exercices().then(r => {
      const data = r.data.data || [];
      setExercices(data);
      if (data.length > 0 && !exerciceId) {
        const voulu = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('exercice') : null;
        const maintenant = Date.now();
        const enCours = data.find((e: any) => !e.cloture && new Date(e.dateDebut).getTime() <= maintenant && new Date(e.dateFin).getTime() >= maintenant);
        setExerciceId((data.find((e: any) => e.id === voulu) || enCours || data.find((e: any) => !e.cloture) || data[0]).id);
      }
    }).catch(() => {});
  };

  const chargerReferentiels = () => {
    setLoading(true);
    setErreurChargement(false);
    Promise.all([comptabiliteApi.comptes(), comptabiliteApi.journaux()])
      .then(([cRes, jRes]) => { setComptes(cRes.data.data || []); setJournaux(jRes.data.data || []); })
      .catch(() => setErreurChargement(true))
      .finally(() => setLoading(false));
    loadExercices();
  };

  // Volontaire : chargement des referentiels une seule fois au montage (le bouton « Reessayer » relance a la demande).
  useEffect(() => {
    chargerReferentiels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreerExercice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExercice(true);
    try {
      const res = await comptabiliteApi.creerExercice(exerciceForm);
      toast.success('Exercice créé');
      setShowExerciceModal(false);
      setExerciceForm(emptyExerciceForm);
      loadExercices();
      setExerciceId(res.data.data.id);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingExercice(false); }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div></AppLayout>;

  if (erreurChargement) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-center px-4">
        <p className="text-base font-medium text-gray-900 dark:text-white">Impossible de charger la comptabilité</p>
        <p className="text-sm text-gray-500">Le serveur ne répond pas pour le moment. Vérifiez votre connexion puis réessayez.</p>
        <button onClick={chargerReferentiels} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">Réessayer</button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <Link href={estReel ? BASE_REEL : BASE_AUTO} className="lg:hidden -mb-1 inline-flex items-center gap-1 text-[13px] font-medium text-azure">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {estReel ? 'Compta Manuelle' : 'Compta Auto'}
        </Link>
        <PageHeader
          titre={titrePage}
          sousTitre={estReel ? 'Compta Manuelle' : 'Compta Auto'}
          sousTitreMasqueMobile
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select value={exerciceId} onChange={e => setExerciceId(e.target.value)} className="input-field min-w-0 !w-full sm:!w-auto !py-1.5 text-sm max-w-full">
              {exercices.length === 0 && <option value="">Aucun exercice</option>}
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.libelle} ({ex.code}){ex.cloture ? ' — clôturé' : ''}</option>)}
            </select>
            <button onClick={() => setShowExerciceModal(true)} className="btn-secondary">+ Nouvel exercice</button>
            <Link href="/comptabilite/plan-comptable" className="btn-secondary">Paramètres</Link>
              <InfoBulle titre={estReel ? 'Compta Manuelle' : 'Compta Auto'} cote="gauche" alerte={!estReel}>
              <p>{estReel
                ? 'Comptabilisez les pièces en attente ou passez des écritures diverses — même plan comptable que Compta Auto.'
                : 'Écritures générées et validées automatiquement depuis les factures, paiements et dépenses — même plan comptable que Compta Manuelle.'}</p>
              {!estReel && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-300">
                  Compta Auto génère et <strong>valide directement</strong> les écritures dans le grand livre partagé (même plan comptable et mêmes journaux que Compta Manuelle). Une même facture, un même paiement ou une même dépense n&apos;est jamais comptabilisé deux fois, qu&apos;il ait été saisi automatiquement ou à la main. Les règles de l&apos;onglet Génération sont un standard SYSCOHADA à faire valider par votre expert-comptable ; les comptes utilisés se règlent dans <Link href="/comptabilite/plan-comptable" className="underline font-medium">Plan comptable</Link>.
                </p>
              )}
            </InfoBulle>
            </div>
          }
        />

        {/* Les pièces à comptabiliser ne dépendent pas d'un exercice : Compta Auto peut en
            déposer avant même qu'un exercice ne soit ouvert. */}
        {estReel && tab === 'attente' && <EnAttenteTab exerciceId={exerciceId} comptes={comptes} journaux={journaux} statutFiltre="EN_ATTENTE" />}
        {estReel && tab === 'rejetees' && <EnAttenteTab exerciceId={exerciceId} comptes={comptes} journaux={journaux} statutFiltre="REJETEE" />}


        {tab === 'generation' && !estReel && (exercices.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="mb-3">Aucun exercice. Créez-en un pour générer vos écritures.</p>
            <button onClick={() => setShowExerciceModal(true)} className="btn-primary text-sm">+ Nouvel exercice</button>
          </div>
        ) : (
          <GenerationAutoTab exercice={exercices.find(e => e.id === exerciceId)} onGenerated={() => router.push(`${BASE_AUTO}/journal`)} />
        ))}

        {['ecritures', 'grand-livre', 'balance', 'bilan'].includes(tab) && exercices.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="mb-3">{estReel ? 'Aucun exercice. Créez-en un pour commencer à saisir vos écritures manuellement.' : 'Aucun exercice.'}</p>
            <button onClick={() => setShowExerciceModal(true)} className="btn-primary text-sm">+ Nouvel exercice</button>
          </div>
        ) : (
          <>
            {tab === 'ecritures' && <EcrituresTab exerciceId={exerciceId} comptes={comptes} journaux={journaux} origine={origine} lectureSeule={!estReel} />}
            {tab === 'grand-livre' && <GrandLivreTab exerciceId={exerciceId} origine={origine} />}
            {tab === 'balance' && <BalanceTab exerciceId={exerciceId} origine={origine} />}
            {tab === 'bilan' && <BilanTab exerciceId={exerciceId} />}
          </>
        )}
      </div>

      {showExerciceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-sm sm:mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Nouvel exercice</h3>
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

function EcrituresTab({ exerciceId, comptes, journaux, origine, lectureSeule = false }: { exerciceId: string; comptes: any[]; journaux: any[]; origine: 'AUTO' | 'MANUEL'; lectureSeule?: boolean }) {
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalFiltre, setJournalFiltre] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyEcritureForm());
  const [saving, setSaving] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const totalEc = (ec: any, k: 'debit' | 'credit') => ec.mouvements.reduce((s: number, m: any) => s + Number(m[k]), 0);

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { exerciceId, origine, limit: 100 };
    if (journalFiltre) params.journalId = journalFiltre;
    comptabiliteApi.ecritures(params)
      .then(r => setEcritures(r.data.data || []))
      .catch(() => setEcritures([]))
      .finally(() => setLoading(false));
  }, [exerciceId, origine, journalFiltre]);
  useEffect(() => { if (exerciceId) load(); }, [exerciceId, load]);

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
      <div className="flex items-center justify-between gap-2">
        <select value={journalFiltre} onChange={e => setJournalFiltre(e.target.value)} className="input-field !w-auto text-sm">
          <option value="">Tous les journaux</option>
          {journaux.map((j: any) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
        </select>
        {!lectureSeule && <button onClick={openCreate} className="btn-primary text-sm">+ Nouvelle écriture</button>}
      </div>
      <ListeResponsive
        colonnes={[
          { cle: 'n', libelle: 'N°', texte: (ec: any) => ec.numero, rendu: (ec: any) => <Numero>{ec.numero}</Numero> },
          { cle: 'd', libelle: 'Date', texte: (ec: any) => new Date(ec.dateEcriture).toLocaleDateString('fr-FR'), rendu: (ec: any) => <Discret>{new Date(ec.dateEcriture).toLocaleDateString('fr-FR')}</Discret> },
          { cle: 'j', libelle: 'Journal', texte: (ec: any) => ec.journal.code, rendu: (ec: any) => <Discret>{ec.journal.code}</Discret> },
          { cle: 'l', libelle: 'Libellé', texte: (ec: any) => ec.libelle, rendu: (ec: any) => <Tronque texte={ec.libelle} largeur="24rem" /> },
          { cle: 'db', libelle: 'Débit', align: 'right' as const, texte: (ec: any) => String(totalEc(ec, 'debit')), rendu: (ec: any) => <Montant valeur={totalEc(ec, 'debit')} unite="" /> },
          { cle: 'cr', libelle: 'Crédit', align: 'right' as const, texte: (ec: any) => String(totalEc(ec, 'credit')), rendu: (ec: any) => <Montant valeur={totalEc(ec, 'credit')} unite="" /> },
          { cle: 's', libelle: 'Statut', texte: (ec: any) => (ec.validee ? 'Validée' : 'Brouillon'), rendu: (ec: any) => <StatutPastille libelle={ec.validee ? 'Validée' : 'Brouillon'} ton={ec.validee ? 'success' : 'gray'} /> },
        ]}
        lignes={ecritures}
        cleLigne={(ec: any) => ec.id}
        chargement={loading}
        nomExport="ecritures"
        onClic={(ec: any) => setOuverte(ec.id)}
        actions={(ec: any) => !ec.validee ? (
          <>
            <BoutonIcone titre="Valider" ton="primaire" onClick={() => handleValider(ec.id)}><IconeValider /></BoutonIcone>
            <BoutonIcone titre="Supprimer" ton="danger" onClick={() => handleSupprimer(ec.id)}><IconeSupprimer /></BoutonIcone>
          </>
        ) : null}
        carte={(ec: any) => ({ titre: ec.libelle, sousTitre: `${ec.numero} — ${ec.journal.code} — ${new Date(ec.dateEcriture).toLocaleDateString('fr-FR')}`, statut: <StatutPastille libelle={ec.validee ? 'Validée' : 'Brouillon'} ton={ec.validee ? 'success' : 'gray'} />, details: `Débit ${fmt(totalEc(ec, 'debit'))} — Crédit ${fmt(totalEc(ec, 'credit'))}` })}
        vide={<EmptyState titre="Aucune écriture" description={lectureSeule ? "Lancez la génération depuis l'onglet Génération." : 'Utilisez « + Nouvelle écriture ».'} />}
      />

      {ouverte && (() => {
        const ec = ecritures.find(x => x.id === ouverte);
        if (!ec) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in" onClick={() => setOuverte(null)}>
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-elevated dark:bg-surface-800 sm:mx-4 sm:rounded-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-surface-700">
                <div className="min-w-0"><h3 className="truncate font-display text-base font-bold text-primary-600 dark:text-white">{ec.numero}</h3><p className="truncate text-xs text-gray-500">{ec.libelle} — {ec.journal.code}</p></div>
                <button onClick={() => setOuverte(null)} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="overflow-y-auto p-4">
                <ListeResponsive
                  colonnes={[
                    { cle: 'c', libelle: 'Compte', texte: (m: any) => `${m.compte.numero} ${m.compte.libelle}`, rendu: (m: any) => <Tronque texte={`${m.compte.numero} — ${m.compte.libelle}`} largeur="20rem" /> },
                    { cle: 'l', libelle: 'Libellé', texte: (m: any) => m.libelle || '', rendu: (m: any) => <Discret>{m.libelle || '—'}</Discret> },
                    { cle: 'd', libelle: 'Débit', align: 'right' as const, texte: (m: any) => String(m.debit), rendu: (m: any) => Number(m.debit) > 0 ? <Montant valeur={m.debit} unite="" /> : <Discret>—</Discret> },
                    { cle: 'k', libelle: 'Crédit', align: 'right' as const, texte: (m: any) => String(m.credit), rendu: (m: any) => Number(m.credit) > 0 ? <Montant valeur={m.credit} unite="" /> : <Discret>—</Discret> },
                  ]}
                  lignes={ec.mouvements}
                  cleLigne={(m: any) => m.id}
                  carte={(m: any) => ({ titre: `${m.compte.numero} — ${m.compte.libelle}`, sousTitre: m.libelle || undefined, droite: Number(m.debit) > 0 ? <span>D {fmt(m.debit)}</span> : <span>C {fmt(m.credit)}</span> })}
                  vide={<p className="py-3 text-center text-sm text-gray-500">Aucun mouvement</p>}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in sm:p-4">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Nouvelle écriture</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <PickerField
                      value={l.compteId}
                      onChange={id => updateLigne(i, 'compteId', id)}
                      options={comptes.map((c: any) => ({ id: c.id, label: `${c.numero} ${c.libelle}` }))}
                      placeholder="— Compte —"
                      title="Sélectionner un compte"
                      searchPlaceholder="N° ou libellé du compte..."
                      className="!bg-transparent !border-0 !shadow-none !px-2 !py-1.5 !text-xs !rounded-none"
                    />
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

function GrandLivreTab({ exerciceId, origine }: { exerciceId: string; origine: 'AUTO' | 'MANUEL' }) {
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.grandLivre({ exerciceId, origine }).then(r => setComptes(r.data.data || [])).catch(() => setComptes([])).finally(() => setLoading(false));
  }, [exerciceId, origine]);

  const toggle = (id: string) => setOuverts(o => ({ ...o, [id]: !o[id] }));

  if (loading) return <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
  if (comptes.length === 0) return <div className="card text-center py-12 text-gray-500">Aucun mouvement</div>;

  return (
    <div className="space-y-3">
      {comptes.map((c: any) => (
        <div key={c.compte.id} className="card !p-0 overflow-hidden">
          <button onClick={() => toggle(c.compte.id)} className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3 sm:p-4 text-left hover:bg-gray-50 dark:hover:bg-surface-700">
            <div className="flex items-center gap-3">
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${ouverts[c.compte.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="font-mono font-semibold text-primary-600">{c.compte.numero}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{c.compte.libelle}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 pl-7 sm:pl-0 text-xs sm:text-sm">
              <span className="text-gray-500">Débit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalDebit)}</span></span>
              <span className="text-gray-500">Crédit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalCredit)}</span></span>
              <span className={`font-mono font-bold ${c.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(Math.abs(c.solde))} {c.solde >= 0 ? 'D' : 'C'}</span>
            </div>
          </button>
          {ouverts[c.compte.id] && (
            <div className="border-t border-gray-200 p-3 dark:border-surface-700">
              <ListeResponsive
                colonnes={[
                  { cle: 'd', libelle: 'Date', texte: (m: any) => new Date(m.date).toLocaleDateString('fr-FR'), rendu: (m: any) => <Discret>{new Date(m.date).toLocaleDateString('fr-FR')}</Discret> },
                  { cle: 'j', libelle: 'Journal', texte: (m: any) => m.journal, rendu: (m: any) => <Discret>{m.journal}</Discret> },
                  { cle: 'n', libelle: 'N° écriture', texte: (m: any) => m.numeroEcriture, rendu: (m: any) => <Numero>{m.numeroEcriture}</Numero> },
                  { cle: 'l', libelle: 'Libellé', texte: (m: any) => m.libelle || '', rendu: (m: any) => <Tronque texte={m.libelle} largeur="24rem" /> },
                  { cle: 'db', libelle: 'Débit', align: 'right' as const, texte: (m: any) => String(m.debit), rendu: (m: any) => Number(m.debit) > 0 ? <Montant valeur={m.debit} unite="" /> : <Discret>—</Discret> },
                  { cle: 'cr', libelle: 'Crédit', align: 'right' as const, texte: (m: any) => String(m.credit), rendu: (m: any) => Number(m.credit) > 0 ? <Montant valeur={m.credit} unite="" /> : <Discret>—</Discret> },
                ]}
                lignes={c.mouvements}
                cleLigne={(m: any) => m.id}
                carte={(m: any) => ({ titre: m.libelle || m.numeroEcriture, sousTitre: `${m.numeroEcriture} — ${m.journal} — ${new Date(m.date).toLocaleDateString('fr-FR')}`, droite: Number(m.debit) > 0 ? <span>D {fmt(m.debit)}</span> : <span>C {fmt(m.credit)}</span> })}
                vide={<p className="py-3 text-center text-sm text-gray-500">Aucun mouvement</p>}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Balance ----------

function BalanceTab({ exerciceId, origine }: { exerciceId: string; origine: 'AUTO' | 'MANUEL' }) {
  const [lignes, setLignes] = useState<any[]>([]);
  const [totaux, setTotaux] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    comptabiliteApi.balance({ exerciceId, origine }).then(r => { setLignes(r.data.data.lignes || []); setTotaux(r.data.data.totaux); }).catch(() => { setLignes([]); setTotaux(null); }).finally(() => setLoading(false));
  }, [exerciceId, origine]);

  return (
    <div className="space-y-3">
      {totaux && !loading && lignes.length > 0 && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[['Total débit', totaux.debit, ''], ['Total crédit', totaux.credit, ''], ['Solde débiteur', totaux.soldeDebiteur, 'text-green-600'], ['Solde créditeur', totaux.soldeCrediteur, 'text-red-600']].map(([l, v, c]: any) => (
            <div key={l} className="card !p-3"><p className="text-[11px] uppercase text-gray-500">{l}</p><p className={`font-mono text-base font-bold tabular-nums sm:text-lg ${c}`}>{fmt(v)}</p></div>
          ))}
        </div>
      )}
      <ListeResponsive
        colonnes={[
          { cle: 'c', libelle: 'Compte', texte: (l: any) => String(l.compte), rendu: (l: any) => <Numero>{l.compte}</Numero> },
          { cle: 'l', libelle: 'Libellé', texte: (l: any) => l.libelle, rendu: (l: any) => <Tronque texte={l.libelle} largeur="26rem" /> },
          { cle: 'd', libelle: 'Total débit', align: 'right' as const, texte: (l: any) => String(l.debit), rendu: (l: any) => <Montant valeur={l.debit} unite="" /> },
          { cle: 'k', libelle: 'Total crédit', align: 'right' as const, texte: (l: any) => String(l.credit), rendu: (l: any) => <Montant valeur={l.credit} unite="" /> },
          { cle: 'sd', libelle: 'Solde débiteur', align: 'right' as const, texte: (l: any) => String(l.soldeDebiteur), rendu: (l: any) => l.soldeDebiteur > 0 ? <Montant valeur={l.soldeDebiteur} ton="positif" unite="" /> : <Discret>—</Discret> },
          { cle: 'sc', libelle: 'Solde créditeur', align: 'right' as const, texte: (l: any) => String(l.soldeCrediteur), rendu: (l: any) => l.soldeCrediteur > 0 ? <Montant valeur={l.soldeCrediteur} ton="negatif" unite="" /> : <Discret>—</Discret> },
        ]}
        lignes={lignes}
        cleLigne={(l: any) => String(l.compte)}
        chargement={loading}
        nomExport="balance"
        carte={(l: any) => ({ titre: l.libelle, sousTitre: String(l.compte), droite: l.soldeDebiteur > 0 ? <Montant valeur={l.soldeDebiteur} ton="positif" /> : <Montant valeur={l.soldeCrediteur} ton="negatif" />, details: `Débit ${fmt(l.debit)} — Crédit ${fmt(l.credit)} — ${l.soldeDebiteur > 0 ? 'solde débiteur' : 'solde créditeur'}` })}
        vide={<EmptyState titre="Aucun mouvement" description="La balance apparaîtra dès les premières écritures." />}
      />
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

// ---------- En attente de comptabilisation / Historique des non comptabilisés ----------

const SOURCE_LABELS: Record<string, string> = {
  FACTURE: 'Facture', FACTURE_FOURNISSEUR: 'Facture fournisseur', PAIEMENT: 'Paiement',
  PAIEMENT_FOURNISSEUR: 'Paiement fournisseur', DEPENSE: 'Dépense', MANUEL: 'Manuel',
};

function sourceDetail(e: any): string {
  if (e.facture) return `${e.facture.numero} — ${e.facture.client?.raisonSociale || ''}`;
  if (e.factureFournisseur) return `${e.factureFournisseur.numero} — ${e.factureFournisseur.fournisseur?.raisonSociale || ''}`;
  if (e.paiement) return e.paiement.numero;
  if (e.paiementFournisseur) return e.paiementFournisseur.numero;
  if (e.depense) return `${e.depense.numero} — ${e.depense.categorie}`;
  return '-';
}

function EnAttenteTab({ exerciceId, comptes, journaux, statutFiltre }: { exerciceId: string; comptes: any[]; journaux: any[]; statutFiltre: 'EN_ATTENTE' | 'REJETEE' }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ libelle: '', montant: '', dateOperation: new Date().toISOString().slice(0, 10) });
  const [savingAdd, setSavingAdd] = useState(false);
  const [comptabilisant, setComptabilisant] = useState<any>(null);
  const [form, setForm] = useState(emptyEcritureForm());
  const [saving, setSaving] = useState(false);
  const [chargementProposition, setChargementProposition] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    comptabiliteApi.ecrituresAttente({ statut: statutFiltre })
      .then(r => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [statutFiltre]);
  useEffect(() => { load(); }, [load]);

  const handleAjouter = async () => {
    if (!addForm.libelle.trim() || !addForm.montant || !addForm.dateOperation) { toast.error('Libellé, montant et date sont requis'); return; }
    setSavingAdd(true);
    try {
      await comptabiliteApi.ajouterEnAttente({ libelle: addForm.libelle.trim(), montant: addForm.montant, dateOperation: addForm.dateOperation });
      toast.success('Ajouté à la file d\'attente');
      setShowAdd(false);
      setAddForm({ libelle: '', montant: '', dateOperation: new Date().toISOString().slice(0, 10) });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingAdd(false); }
  };

  const handleRejeter = async (item: any) => {
    const motif = prompt('Motif du rejet (optionnel) :') || undefined;
    try {
      await comptabiliteApi.rejeterEnAttente(item.id, motif);
      toast.success('Entrée rejetée');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const openComptabiliser = async (item: any) => {
    setComptabilisant(item);
    setForm({ ...emptyEcritureForm(), dateEcriture: item.dateOperation.slice(0, 10), libelle: item.libelle });
    setChargementProposition(true);
    try {
      const res = await comptabiliteApi.propositionEnAttente(item.id);
      const prop = res.data.data;
      if (prop.avertissement) toast(prop.avertissement, { icon: 'ℹ️' });
      setForm((prev: any) => ({
        ...prev,
        journalId: prop.journalId || '',
        lignes: prop.lignes?.length >= 2
          ? prop.lignes.map((l: any) => ({ compteId: l.compteId, libelle: l.libelle || '', debit: l.debit > 0 ? String(l.debit) : '', credit: l.credit > 0 ? String(l.credit) : '' }))
          : [{ ...emptyLigne(), debit: String(item.montant) }, emptyLigne()],
      }));
    } catch {
      // Pas de proposition disponible : l'utilisateur saisit les comptes lui-même.
      setForm((prev: any) => ({ ...prev, lignes: [{ ...emptyLigne(), debit: String(item.montant) }, emptyLigne()] }));
    } finally {
      setChargementProposition(false);
    }
  };

  const updateLigne = (i: number, field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, lignes: prev.lignes.map((l: any, idx: number) => idx === i ? { ...l, [field]: value } : l) }));
  };
  const addLigne = () => setForm((prev: any) => ({ ...prev, lignes: [...prev.lignes, emptyLigne()] }));
  const removeLigne = (i: number) => setForm((prev: any) => ({ ...prev, lignes: prev.lignes.filter((_: any, idx: number) => idx !== i) }));

  const totalDebit = form.lignes.reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lignes.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);
  const equilibre = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleComptabiliser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciceId) { toast.error('Sélectionnez un exercice'); return; }
    if (!form.journalId) { toast.error('Sélectionnez un journal'); return; }
    if (!equilibre) { toast.error('L\'écriture doit être équilibrée (débit = crédit)'); return; }
    const lignesValides = form.lignes.filter((l: any) => l.compteId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (lignesValides.length < 2) { toast.error('Au moins 2 lignes avec un compte et un montant sont requises'); return; }

    setSaving(true);
    try {
      await comptabiliteApi.comptabiliserEnAttente(comptabilisant.id, {
        exerciceId, journalId: form.journalId, dateEcriture: form.dateEcriture,
        libelle: form.libelle, reference: form.reference || undefined, piece: form.piece || undefined,
        mouvements: lignesValides.map((l: any) => ({ compteId: l.compteId, libelle: l.libelle || undefined, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 })),
      });
      toast.success('Écriture comptabilisée');
      setComptabilisant(null);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      {statutFiltre === 'EN_ATTENTE' && (
        <div className="flex justify-end">
          {!showAdd && <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm">+ Ajouter</button>}
        </div>
      )}

      {showAdd && (
        <div className="card !p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Libellé *</label>
            <input type="text" value={addForm.libelle} onChange={e => setAddForm({ ...addForm, libelle: e.target.value })} className="input-field !py-1.5 text-sm" placeholder="Ex : Facture d'électricité SEPTEMBRE" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Montant *</label>
            <input type="number" value={addForm.montant} onChange={e => setAddForm({ ...addForm, montant: e.target.value })} className="input-field !py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Date *</label>
            <input type="date" value={addForm.dateOperation} onChange={e => setAddForm({ ...addForm, dateOperation: e.target.value })} className="input-field !py-1.5 text-sm" />
          </div>
          <div className="sm:col-span-4 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Annuler</button>
            <button onClick={handleAjouter} disabled={savingAdd} className="btn-primary text-sm disabled:opacity-50">{savingAdd ? 'Ajout...' : 'Ajouter'}</button>
          </div>
        </div>
      )}

      <ListeResponsive
        colonnes={[
          { cle: 's', libelle: 'Source', texte: (it: any) => SOURCE_LABELS[it.source] || it.source, rendu: (it: any) => <Discret>{SOURCE_LABELS[it.source] || it.source}</Discret> },
          { cle: 'r', libelle: 'Référence', masquerSous: 'xl' as const, texte: (it: any) => sourceDetail(it), rendu: (it: any) => <Tronque texte={sourceDetail(it)} largeur="14rem" /> },
          { cle: 'l', libelle: 'Libellé', texte: (it: any) => it.libelle, rendu: (it: any) => <Tronque texte={it.libelle} largeur="24rem" /> },
          { cle: 'd', libelle: 'Date', texte: (it: any) => new Date(it.dateOperation).toLocaleDateString('fr-FR'), rendu: (it: any) => <Discret>{new Date(it.dateOperation).toLocaleDateString('fr-FR')}</Discret> },
          { cle: 'm', libelle: 'Montant', align: 'right' as const, texte: (it: any) => String(it.montant), rendu: (it: any) => <Montant valeur={it.montant} /> },
          ...(statutFiltre === 'REJETEE' ? [{ cle: 'x', libelle: 'Motif', texte: (it: any) => it.motifRejet || '', rendu: (it: any) => <Tronque texte={it.motifRejet || '—'} largeur="16rem" /> }] : []),
        ]}
        lignes={items}
        cleLigne={(it: any) => it.id}
        chargement={loading}
        nomExport={statutFiltre === 'EN_ATTENTE' ? 'pieces-en-attente' : 'pieces-rejetees'}
        actions={statutFiltre === 'EN_ATTENTE' ? (it: any) => (
          <>
            <BoutonIcone titre="Comptabiliser" ton="primaire" onClick={() => openComptabiliser(it)}><IconeValider /></BoutonIcone>
            <BoutonIcone titre="Rejeter" ton="danger" onClick={() => handleRejeter(it)}><IconeSupprimer /></BoutonIcone>
          </>
        ) : undefined}
        carte={(it: any) => ({ titre: it.libelle, sousTitre: `${SOURCE_LABELS[it.source] || it.source} — ${sourceDetail(it)}`, droite: <Montant valeur={it.montant} />, details: `${new Date(it.dateOperation).toLocaleDateString('fr-FR')}${statutFiltre === 'REJETEE' && it.motifRejet ? ` — ${it.motifRejet}` : ''}` })}
        vide={<EmptyState titre={statutFiltre === 'EN_ATTENTE' ? 'Aucune pièce en attente' : 'Aucune pièce rejetée'} description="Tout est à jour." />}
      />

      {comptabilisant && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in sm:p-4">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <div>
                <h3 className="font-bold text-lg">Comptabiliser — {comptabilisant.libelle}</h3>
                {chargementProposition && <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><span className="animate-spin w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full" />Préparation de la proposition...</p>}
              </div>
              <button onClick={() => setComptabilisant(null)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            {!exerciceId ? (
              <div className="p-6 text-center text-sm text-gray-500">Sélectionnez d&apos;abord un exercice en haut de page.</div>
            ) : (
            <form onSubmit={handleComptabiliser} className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="label">Journal *</label>
                  <select value={form.journalId} onChange={e => setForm({ ...form, journalId: e.target.value })} className="input-field" required>
                    <option value="">— Sélectionner —</option>
                    {journaux.map((j: any) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
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
                    <PickerField
                      value={l.compteId}
                      onChange={id => updateLigne(i, 'compteId', id)}
                      options={comptes.map((c: any) => ({ id: c.id, label: `${c.numero} ${c.libelle}` }))}
                      placeholder="— Compte —"
                      title="Sélectionner un compte"
                      searchPlaceholder="N° ou libellé du compte..."
                      className="!bg-transparent !border-0 !shadow-none !px-2 !py-1.5 !text-xs !rounded-none"
                    />
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
                <button type="button" onClick={() => setComptabilisant(null)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" disabled={saving || !equilibre} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Enregistrement...' : 'Comptabiliser'}</button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
