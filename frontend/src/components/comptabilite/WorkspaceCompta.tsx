'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import Sheet from '@/components/ui/Sheet';
import SheetActions from '@/components/forms/SheetActions';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';
import GenerationAutoTab from './GenerationAutoTab';
import PlanComptablePanel from './PlanComptablePanel';
import EcrituresTab from './EcrituresTab';
import GrandLivreTab from './GrandLivreTab';
import BalanceTab from './BalanceTab';
import BilanTab from './BilanTab';
import EnAttenteTab from './EnAttenteTab';

const emptyExerciceForm = { code: '', libelle: '', dateDebut: '', dateFin: '' };

type TabId = 'generation' | 'ecritures' | 'attente' | 'rejetees' | 'grand-livre' | 'balance' | 'bilan' | 'plan';

export default function WorkspaceCompta({ source }: { source: 'REEL' | 'AUTO' }) {
  const estReel = source === 'REEL';
  const origine: 'AUTO' | 'MANUEL' = estReel ? 'MANUEL' : 'AUTO';
  const [tab, setTab] = useState<TabId>(estReel ? 'ecritures' : 'generation');
  const [exercices, setExercices] = useState<any[]>([]);
  const [exerciceId, setExerciceId] = useState('');
  const [comptes, setComptes] = useState<any[]>([]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      const res = await comptabiliteApi.creerExercice(exerciceForm);
      toast.success('Exercice créé');
      setShowExerciceModal(false);
      setExerciceForm(emptyExerciceForm);
      loadExercices();
      setExerciceId(res.data.data.id);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingExercice(false); }
  };

  if (loading) return <AppLayout><div role="status" aria-label="Chargement" className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div></AppLayout>;

  const onglets: { id: TabId; label: string }[] = [
    ...(estReel ? [] : [{ id: 'generation' as TabId, label: 'Génération' }]),
    { id: 'ecritures', label: estReel ? 'Journal manuel' : 'Journal automatique' },
    ...(estReel ? [{ id: 'attente' as TabId, label: 'Pièces à comptabiliser' }, { id: 'rejetees' as TabId, label: 'Pièces rejetées' }] : []),
    { id: 'grand-livre', label: 'Grand Livre' },
    { id: 'balance', label: 'Balance' },
    { id: 'bilan', label: 'Bilan' },
    { id: 'plan', label: 'Plan comptable' },
  ];

  const sansExercice = ['ecritures', 'grand-livre', 'balance', 'bilan'].includes(tab) && exercices.length === 0;

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title={estReel ? 'Compta Manuelle' : 'Compta Auto'}
          subtitle={estReel
            ? 'Comptabilisez les pièces en attente ou passez des écritures diverses — même plan comptable que Compta Auto'
            : 'Écritures générées et validées automatiquement depuis les factures, paiements et dépenses — même plan comptable que Compta Manuelle'}
          actions={
            <div className="flex flex-wrap gap-2 items-center max-md:w-full">
              <select value={exerciceId} onChange={e => setExerciceId(e.target.value)} aria-label="Exercice comptable" className="input-field !w-auto max-md:flex-1 md:text-sm">
                {exercices.length === 0 && <option value="">Aucun exercice</option>}
                {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.libelle} ({ex.code}){ex.cloture ? ' — clôturé' : ''}</option>)}
              </select>
              <button onClick={() => setShowExerciceModal(true)} className="btn-secondary text-sm">Nouvel exercice</button>
              <Link href="/comptabilite/plan-comptable" className="btn-secondary text-sm">Paramètres</Link>
            </div>
          }
        />

        <div role="tablist" className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 w-fit max-w-full overflow-x-auto">
          {onglets.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 md:py-2 min-h-[44px] md:min-h-0 text-sm font-medium rounded-md transition-all whitespace-nowrap ${tab === t.id ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Les pièces à comptabiliser ne dépendent pas d'un exercice : Compta Auto peut en
            déposer avant même qu'un exercice ne soit ouvert. */}
        {estReel && tab === 'attente' && <EnAttenteTab exerciceId={exerciceId} comptes={comptes} journaux={journaux} statutFiltre="EN_ATTENTE" />}
        {estReel && tab === 'rejetees' && <EnAttenteTab exerciceId={exerciceId} comptes={comptes} journaux={journaux} statutFiltre="REJETEE" />}

        {tab === 'plan' && <PlanComptablePanel lectureSeule />}

        {tab === 'generation' && !estReel && (exercices.length === 0 ? (
          <div className="card text-center py-16 text-gray-600 dark:text-gray-300">
            <p className="mb-3">Aucun exercice. Créez-en un pour générer vos écritures.</p>
            <button onClick={() => setShowExerciceModal(true)} className="btn-primary text-sm">Nouvel exercice</button>
          </div>
        ) : (
          <GenerationAutoTab exercice={exercices.find(e => e.id === exerciceId)} onGenerated={() => setTab('ecritures')} />
        ))}

        {sansExercice ? (
          <div className="card text-center py-16 text-gray-600 dark:text-gray-300">
            <p className="mb-3">{estReel ? 'Aucun exercice. Créez-en un pour commencer à saisir vos écritures manuellement.' : 'Aucun exercice.'}</p>
            <button onClick={() => setShowExerciceModal(true)} className="btn-primary text-sm">Nouvel exercice</button>
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

      <Sheet open={showExerciceModal} onClose={() => setShowExerciceModal(false)} size="sm" closeOnBackdrop={false} title="Nouvel exercice">
        <form onSubmit={handleCreerExercice} className="space-y-3">
          <div><label className="label">Code *</label><input type="text" value={exerciceForm.code} onChange={e => setExerciceForm({ ...exerciceForm, code: e.target.value })} className="input-field" placeholder="2026-REEL" required /></div>
          <div><label className="label">Libellé *</label><input type="text" value={exerciceForm.libelle} onChange={e => setExerciceForm({ ...exerciceForm, libelle: e.target.value })} className="input-field" placeholder="Exercice réel 2026" required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Date de début *</label><input type="date" value={exerciceForm.dateDebut} onChange={e => setExerciceForm({ ...exerciceForm, dateDebut: e.target.value })} className="input-field" required /></div>
            <div><label className="label">Date de fin *</label><input type="date" value={exerciceForm.dateFin} onChange={e => setExerciceForm({ ...exerciceForm, dateFin: e.target.value })} className="input-field" required /></div>
          </div>
          <SheetActions onCancel={() => setShowExerciceModal(false)} loading={savingExercice} submitLabel="Créer" />
        </form>
      </Sheet>
    </AppLayout>
  );
}
