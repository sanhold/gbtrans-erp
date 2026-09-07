'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { comptabiliteApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';
const TYPES_JOURNAL = ['ACHAT', 'VENTE', 'BANQUE', 'CAISSE', 'OD', 'SITUATION', 'TRESORERIE'];

export default function JournauxPage() {
  const [journaux, setJournaux] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [journalId, setJournalId] = useState('');
  const [exerciceId, setExerciceId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGE_SIZE);

  const [showGestion, setShowGestion] = useState(false);
  const [journalForm, setJournalForm] = useState({ code: '', libelle: '', type: 'OD', compteContrepartie: '' });
  const [savingJournal, setSavingJournal] = useState(false);

  const loadJournaux = () => comptabiliteApi.journaux().then(r => setJournaux(r.data.data || [])).catch(() => {});

  useEffect(() => {
    loadJournaux();
    comptabiliteApi.exercices().then(r => setExercices(r.data.data || [])).catch(() => {});
  }, []);

  const handleCreerJournal = async () => {
    if (!journalForm.code.trim() || !journalForm.libelle.trim()) { toast.error('Code et libellé sont requis'); return; }
    setSavingJournal(true);
    try {
      await comptabiliteApi.creerJournal({
        code: journalForm.code.trim(), libelle: journalForm.libelle.trim(),
        type: journalForm.type, compteContrepartie: journalForm.compteContrepartie || undefined,
      });
      toast.success('Journal créé');
      setJournalForm({ code: '', libelle: '', type: 'OD', compteContrepartie: '' });
      loadJournaux();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingJournal(false); }
  };

  const handleSupprimerJournal = async (id: string) => {
    if (!confirm('Supprimer ce journal ?')) return;
    try {
      await comptabiliteApi.supprimerJournal(id);
      toast.success('Journal supprimé');
      loadJournaux();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleToggleActifJournal = async (j: any) => {
    try {
      await comptabiliteApi.modifierJournal(j.id, { actif: !j.actif });
      loadJournaux();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit };
    if (journalId) params.journalId = journalId;
    if (exerciceId) params.exerciceId = exerciceId;
    comptabiliteApi.ecritures(params)
      .then(r => { setEcritures(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setEcritures([]))
      .finally(() => setLoading(false));
  }, [journalId, exerciceId, page, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="card !p-3 overflow-x-auto">
          <div className="flex flex-nowrap items-center gap-2 min-w-max">
            <div className="flex-shrink-0 mr-1">
              <Link href="/comptabilite" className="text-[10px] text-primary-600 hover:underline block">← Comptabilité</Link>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Journaux ({total})</h1>
            </div>
            <button onClick={() => setShowGestion(v => !v)} className="btn-secondary !py-1.5 !px-3 text-xs flex-shrink-0">
              {showGestion ? 'Fermer la gestion' : 'Gérer les journaux'}
            </button>
            {journaux.map(j => (
              <button key={j.id} onClick={() => { setJournalId(journalId === j.id ? '' : j.id); setPage(1); }}
                className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-medium transition-colors border flex-shrink-0 whitespace-nowrap ${journalId === j.id ? 'bg-primary-500 text-white border-primary-500' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-surface-700 dark:text-gray-300 dark:border-surface-600'}`}>
                {j.code} — {j.libelle}
              </button>
            ))}
            <select value={exerciceId} onChange={e => { setExerciceId(e.target.value); setPage(1); }} className="input-field !py-1.5 text-xs w-36 flex-shrink-0 ml-auto">
              <option value="">Tous exercices</option>
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
            </select>
          </div>
        </div>

        {showGestion && (
          <div className="card !p-4 space-y-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Gestion des journaux</h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Code *</label>
                <input type="text" value={journalForm.code} onChange={e => setJournalForm({ ...journalForm, code: e.target.value.toUpperCase() })} className="input-field !py-1.5 text-sm" placeholder="AC" maxLength={10} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Libellé *</label>
                <input type="text" value={journalForm.libelle} onChange={e => setJournalForm({ ...journalForm, libelle: e.target.value })} className="input-field !py-1.5 text-sm" placeholder="Journal des achats" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Type *</label>
                <select value={journalForm.type} onChange={e => setJournalForm({ ...journalForm, type: e.target.value })} className="input-field !py-1.5 text-sm">
                  {TYPES_JOURNAL.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Compte contrepartie</label>
                <input type="text" value={journalForm.compteContrepartie} onChange={e => setJournalForm({ ...journalForm, compteContrepartie: e.target.value })} className="input-field !py-1.5 text-sm" placeholder="Optionnel" />
              </div>
              <button onClick={handleCreerJournal} disabled={savingJournal} className="btn-primary text-sm disabled:opacity-50">{savingJournal ? 'Création...' : '+ Créer'}</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] text-gray-500 uppercase border-b border-gray-100 dark:border-surface-700">
                  <th className="p-2">Code</th><th className="p-2">Libellé</th><th className="p-2">Type</th><th className="p-2">Contrepartie</th><th className="p-2">Statut</th><th className="p-2"></th>
                </tr></thead>
                <tbody>
                  {journaux.map(j => (
                    <tr key={j.id} className="border-b border-gray-50 dark:border-surface-700/50">
                      <td className="p-2 font-mono font-semibold">{j.code}</td>
                      <td className="p-2">{j.libelle}</td>
                      <td className="p-2 text-xs text-gray-500">{j.type}</td>
                      <td className="p-2 text-xs text-gray-500">{j.compteContrepartie || '-'}</td>
                      <td className="p-2"><button onClick={() => handleToggleActifJournal(j)} className={`badge ${j.actif ? 'badge-success' : 'badge-gray'} !text-[10px]`}>{j.actif ? 'Actif' : 'Inactif'}</button></td>
                      <td className="p-2 text-right">
                        <button onClick={() => handleSupprimerJournal(j.id)} className="text-gray-300 hover:text-red-500" title="Supprimer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead><tr>
              <th className="table-header !text-[10px] !px-1.5 truncate">Journal</th><th className="table-header !text-[10px] !px-1.5 truncate">N° Écriture</th><th className="table-header !text-[10px] !px-1.5 truncate">Date</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Libellé</th><th className="table-header !text-[10px] !px-1.5 truncate">Référence</th>
              <th className="table-header !text-[10px] !px-1.5 truncate text-right">Débit</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Crédit</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : ecritures.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucune écriture</td></tr>
              ) : ecritures.map(ec => (
                <Fragment key={ec.id}>
                  <tr className="bg-gray-50 dark:bg-surface-700/50">
                    <td className="table-cell font-semibold" data-label="Journal">{ec.journal?.code}</td>
                    <td className="table-cell font-mono text-xs font-semibold" data-label="N° Écriture" colSpan={2}>{ec.numero} — {new Date(ec.dateEcriture).toLocaleDateString('fr-FR')}</td>
                    <td className="table-cell font-medium" data-label="Libellé">{ec.libelle}</td>
                    <td className="table-cell text-xs" data-label="Référence">{ec.reference || '-'}</td>
                    <td className="table-cell text-right font-mono font-semibold" data-label="Débit">{fmt(ec.mouvements.reduce((s: number, m: any) => s + Number(m.debit), 0))}</td>
                    <td className="table-cell text-right font-mono font-semibold" data-label="Crédit">{fmt(ec.mouvements.reduce((s: number, m: any) => s + Number(m.credit), 0))}</td>
                  </tr>
                  {ec.mouvements.map((m: any) => (
                    <tr key={m.id} className="table-row">
                      <td className="table-cell" data-label="Journal"></td>
                      <td className="table-cell font-mono text-xs" data-label="Compte" colSpan={2}>{m.compte?.numero} — {m.compte?.libelle}</td>
                      <td className="table-cell text-xs text-gray-500" data-label="Libellé">{m.libelle}</td>
                      <td className="table-cell" data-label="Référence"></td>
                      <td className="table-cell text-right font-mono" data-label="Débit">{Number(m.debit) > 0 ? fmt(m.debit) : ''}</td>
                      <td className="table-cell text-right font-mono" data-label="Crédit">{Number(m.credit) > 0 ? fmt(m.credit) : ''}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={() => {}} />
        </div>
      </div>
    </AppLayout>
  );
}
