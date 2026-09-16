'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPES_JOURNAL = ['ACHAT', 'VENTE', 'BANQUE', 'CAISSE', 'OD', 'SITUATION', 'TRESORERIE'];

export default function JournauxPage() {
  const [journaux, setJournaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [journalForm, setJournalForm] = useState({ code: '', libelle: '', type: 'OD', compteContrepartie: '' });
  const [savingJournal, setSavingJournal] = useState(false);

  const loadJournaux = () => {
    setLoading(true);
    comptabiliteApi.journaux().then(r => setJournaux(r.data.data || [])).catch(() => setJournaux([])).finally(() => setLoading(false));
  };

  useEffect(() => { loadJournaux(); }, []);

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/comptabilite" className="text-xs font-medium text-primary-600 hover:underline mb-1 inline-block">← Comptabilité</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journaux comptables</h1>
          <p className="text-sm text-gray-500">Paramétrage des journaux (Achats, Ventes, Banque, Caisse, OD...). Les écritures se saisissent dans Compta Réel.</p>
        </div>

        <div className="card !p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Nouveau journal</h2>
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
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Code</th><th className="table-header">Libellé</th><th className="table-header">Type</th>
              <th className="table-header">Contrepartie</th><th className="table-header">Statut</th><th className="table-header"></th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : journaux.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun journal. Créez-en un ci-dessus.</td></tr>
              ) : journaux.map(j => (
                <tr key={j.id} className="table-row">
                  <td className="table-cell font-mono font-semibold text-primary-600" data-label="Code">{j.code}</td>
                  <td className="table-cell" data-label="Libellé">{j.libelle}</td>
                  <td className="table-cell text-xs text-gray-500" data-label="Type">{j.type}</td>
                  <td className="table-cell text-xs text-gray-500" data-label="Contrepartie">{j.compteContrepartie || '-'}</td>
                  <td className="table-cell" data-label="Statut"><button onClick={() => handleToggleActifJournal(j)} className={`badge ${j.actif ? 'badge-success' : 'badge-gray'}`}>{j.actif ? 'Actif' : 'Inactif'}</button></td>
                  <td className="table-cell text-right" data-label="Actions">
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
    </AppLayout>
  );
}
