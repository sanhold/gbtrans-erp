'use client';

import { useEffect, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeArchiver, IconeValider } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, StatutPastille } from '@/components/tables/cellules';
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
    <div className="space-y-2">
      <div>
        {/* Une ligne : compteur et bouton (explications dans la bulle « i » de la page). */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-gray-500">{exercices.length} exercice(s)</span>
          {!showNouvel && <button onClick={() => setShowNouvel(true)} className="btn-primary !py-1.5 text-xs">+ Nouvel exercice</button>}
        </div>

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

        <ListeResponsive
          colonnes={[
            { cle: 'code', libelle: 'Code', texte: (ex: any) => ex.code, rendu: (ex: any) => <Numero>{ex.code}</Numero> },
            { cle: 'lib', libelle: 'Libellé', texte: (ex: any) => ex.libelle, rendu: (ex: any) => <Tronque texte={ex.libelle} largeur="20rem" /> },
            { cle: 'deb', libelle: 'Début', texte: (ex: any) => new Date(ex.dateDebut).toLocaleDateString('fr-FR'), rendu: (ex: any) => <Discret>{new Date(ex.dateDebut).toLocaleDateString('fr-FR')}</Discret> },
            { cle: 'fin', libelle: 'Fin', texte: (ex: any) => new Date(ex.dateFin).toLocaleDateString('fr-FR'), rendu: (ex: any) => <Discret>{new Date(ex.dateFin).toLocaleDateString('fr-FR')}</Discret> },
            { cle: 'nb', libelle: 'Écritures', align: 'right' as const, texte: (ex: any) => String(ex.nbEcritures ?? 0), rendu: (ex: any) => <span className="font-mono text-[13px] tabular-nums">{ex.nbEcritures ?? 0}{ex.nbNonValidees > 0 && <span className="ml-1 text-[11px] text-amber-600" title="Écritures non validées">({ex.nbNonValidees} à valider)</span>}</span> },
            { cle: 'st', libelle: 'Statut', texte: (ex: any) => (ex.cloture ? 'Clôturé' : 'Actif'), rendu: (ex: any) => <StatutPastille libelle={ex.cloture ? 'Clôturé' : 'Actif'} ton={ex.cloture ? 'gray' : 'success'} /> },
          ]}
          lignes={exercices}
          cleLigne={(ex: any) => ex.id}
          chargement={loading}
          nomExport="exercices"
          actions={(ex: any) => <BoutonIcone titre={ex.cloture ? 'Rouvrir' : 'Clôturer'} ton={ex.cloture ? 'primaire' : 'neutre'} disabled={busyId === ex.id} onClick={() => toggleCloture(ex)}>{ex.cloture ? <IconeValider /> : <IconeArchiver />}</BoutonIcone>}
          carte={(ex: any) => ({ titre: ex.libelle, sousTitre: `${ex.code} — ${new Date(ex.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(ex.dateFin).toLocaleDateString('fr-FR')}`, statut: <StatutPastille libelle={ex.cloture ? 'Clôturé' : 'Actif'} ton={ex.cloture ? 'gray' : 'success'} />, details: `${ex.nbEcritures ?? 0} écriture(s)${ex.nbNonValidees > 0 ? ` — ${ex.nbNonValidees} à valider` : ''}` })}
          vide={<EmptyState titre="Aucun exercice comptable" description="Créez votre premier exercice." />}
        />
      </div>
    </div>
  );
}
