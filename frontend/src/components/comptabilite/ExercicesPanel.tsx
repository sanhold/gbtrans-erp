'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import SheetActions from '@/components/forms/SheetActions';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export default function ExercicesPanel() {
  const confirmer = useConfirm();
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

  const handleCreerExercice = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
    if (!(await confirmer({
      titre: `${ex.cloture ? 'Rouvrir' : 'Clôturer'} l'exercice ${ex.code} ?`,
      message: ex.cloture ? undefined : 'Plus aucune écriture ne pourra y être saisie.',
      confirmer: ex.cloture ? 'Rouvrir' : 'Clôturer',
      danger: !ex.cloture,
    }))) return;
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
          <button onClick={() => setShowNouvel(true)} className="btn-primary text-sm min-h-[44px] md:min-h-0">Nouvel exercice</button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 -mt-2 mb-4">Un seul jeu d&apos;exercices, utilisé à la fois par Compta Auto et Compta Manuelle.</p>

        <Sheet open={showNouvel} onClose={() => setShowNouvel(false)} title="Nouvel exercice" size="md">
          <form onSubmit={handleCreerExercice} className="space-y-4">
            <div><label className="label">Code *</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" placeholder="2027" required /></div>
            <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" placeholder="Exercice 2027" required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Début *</label><input type="date" value={form.dateDebut} onChange={e => setForm({ ...form, dateDebut: e.target.value })} className="input-field" required /></div>
              <div><label className="label">Fin *</label><input type="date" value={form.dateFin} onChange={e => setForm({ ...form, dateFin: e.target.value })} className="input-field" required /></div>
            </div>
            <SheetActions onCancel={() => setShowNouvel(false)} loading={saving} submitLabel="Créer" />
          </form>
        </Sheet>

        <div className="table-container !shadow-none !border-0">
          <table className="w-full">
            <thead><tr><th className="table-header">Actions</th><th className="table-header">Code</th><th className="table-header">Libellé</th><th className="table-header">Début</th><th className="table-header">Fin</th><th className="table-header text-right">Écritures</th><th className="table-header">Statut</th></tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} />
              ) : exercices.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Aucun exercice comptable<br /><button type="button" onClick={() => setShowNouvel(true)} className="btn-primary mt-3">Nouvel exercice</button></td></tr>
              ) : exercices.map(ex => (
                <tr className="table-row" key={ex.id}>
                  <td className="table-cell" data-label="Actions">
                    <button onClick={() => toggleCloture(ex)} disabled={busyId === ex.id} className="text-sm px-2 py-2 text-primary-600 hover:underline disabled:opacity-50">{ex.cloture ? 'Rouvrir' : 'Clôturer'}</button>
                  </td>
                  <td className="table-cell font-medium" data-label="Code">{ex.code}</td>
                  <td className="table-cell col-opt" data-label="Libellé">{ex.libelle}</td>
                  <td className="table-cell col-opt" data-label="Début">{new Date(ex.dateDebut).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Fin">{new Date(ex.dateFin).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono" data-label="Écritures">
                    {ex.nbEcritures ?? 0}
                    {ex.nbNonValidees > 0 && <span className="ml-1 text-xs text-amber-700" title="Écritures non validées">({ex.nbNonValidees} à valider)</span>}
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
