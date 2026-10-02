'use client';

import { useEffect, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ExercicesPanel() {
  const [exercices, setExercices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNouvel, setShowNouvel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', dateDebut: '', dateFin: '' });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    comptabiliteApi.exercices()
      .then(r => setExercices(r.data.data || []))
      .catch(() => setExercices([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreerExercice = async () => {
    if (!form.code || !form.libelle || !form.dateDebut || !form.dateFin) { toast.error('Tous les champs sont requis'); return; }
    setSaving(true);
    try {
      await comptabiliteApi.creerExercice(form);
      toast.success('Exercice créé');
      setShowNouvel(false);
      setForm({ code: '', libelle: '', dateDebut: '', dateFin: '' });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const toggleCloture = async (ex: any) => {
    const action = ex.cloture ? 'rouvrir' : 'clôturer';
    if (!confirm(`Voulez-vous ${action} l'exercice ${ex.code} ?${ex.cloture ? '' : ' Plus aucune écriture ne pourra y être saisie.'}`)) return;
    setBusyId(ex.id);
    try {
      const res = await (ex.cloture ? comptabiliteApi.rouvrirExercice(ex.id) : comptabiliteApi.cloturerExercice(ex.id));
      toast.success(res.data.message);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Exercices comptables</h3>
          {!showNouvel && <button onClick={() => setShowNouvel(true)} className="btn-primary text-sm">+ Nouvel exercice</button>}
        </div>
        <p className="text-sm text-gray-500 -mt-2 mb-4">Un seul jeu d&apos;exercices, utilisé à la fois par Compta Auto et Compta Manuelle.</p>

        {showNouvel && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-surface-700/30 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Code *</label>
              <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field !py-1.5 text-sm" placeholder="2027" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Libellé *</label>
              <input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field !py-1.5 text-sm" placeholder="Exercice 2027" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Début *</label>
              <input type="date" value={form.dateDebut} onChange={e => setForm({ ...form, dateDebut: e.target.value })} className="input-field !py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Fin *</label>
              <input type="date" value={form.dateFin} onChange={e => setForm({ ...form, dateFin: e.target.value })} className="input-field !py-1.5 text-sm" />
            </div>
            <div className="sm:col-span-4 flex justify-end gap-2">
              <button onClick={() => setShowNouvel(false)} className="btn-secondary text-sm">Annuler</button>
              <button onClick={handleCreerExercice} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        )}

        <div className="table-container !shadow-none !border-0">
          <table className="w-full">
            <thead><tr><th className="table-header">Actions</th><th className="table-header">Code</th><th className="table-header">Libellé</th><th className="table-header">Début</th><th className="table-header">Fin</th><th className="table-header text-right">Écritures</th><th className="table-header">Statut</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : exercices.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Aucun exercice comptable</td></tr>
              ) : exercices.map(ex => (
                <tr className="table-row" key={ex.id}>
                  <td className="table-cell" data-label="Actions">
                    <button onClick={() => toggleCloture(ex)} disabled={busyId === ex.id} className="text-xs text-gray-600 hover:underline disabled:opacity-50">{ex.cloture ? 'Rouvrir' : 'Clôturer'}</button>
                  </td>
                  <td className="table-cell font-medium" data-label="Code">{ex.code}</td>
                  <td className="table-cell" data-label="Libellé">{ex.libelle}</td>
                  <td className="table-cell" data-label="Début">{new Date(ex.dateDebut).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Fin">{new Date(ex.dateFin).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono" data-label="Écritures">
                    {ex.nbEcritures ?? 0}
                    {ex.nbNonValidees > 0 && <span className="ml-1 text-[10px] text-amber-600" title="Écritures non validées">({ex.nbNonValidees} à valider)</span>}
                  </td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${ex.cloture ? 'badge-gray' : 'badge-success'}`}>{ex.cloture ? 'Clôturé' : 'Actif'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
