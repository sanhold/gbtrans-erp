'use client';

import { useEffect, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeSupprimer } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, StatutPastille } from '@/components/tables/cellules';
import toast from 'react-hot-toast';

const TYPES_JOURNAL = ['ACHAT', 'VENTE', 'BANQUE', 'CAISSE', 'OD', 'SITUATION', 'TRESORERIE'];

export default function JournauxPanel() {
  const [journaux, setJournaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [journalForm, setJournalForm] = useState({ code: '', libelle: '', type: 'OD', compteContrepartie: '' });
  const [savingJournal, setSavingJournal] = useState(false);
  const [showNouveau, setShowNouveau] = useState(false);

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
      setShowNouveau(false);
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
    <div className="space-y-2">
      {/* Une ligne : compteur et bouton ; le formulaire n'apparaît qu'à la demande (explications dans la bulle « i » de la page). */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">{journaux.length} journal(aux)</span>
        {!showNouveau && <button onClick={() => setShowNouveau(true)} className="btn-primary !py-1.5 text-xs">+ Nouveau journal</button>}
      </div>

      {showNouveau && (
        <div className="card !p-3">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Code *</label>
              <input type="text" value={journalForm.code} onChange={e => setJournalForm({ ...journalForm, code: e.target.value.toUpperCase() })} className="input-field !py-1.5 text-sm" placeholder="AC" />
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
              <input type="text" value={journalForm.compteContrepartie} onChange={e => setJournalForm({ ...journalForm, compteContrepartie: e.target.value })} className="input-field !py-1.5 text-sm" placeholder="521" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNouveau(false)} className="btn-secondary text-sm">Annuler</button>
              <button onClick={handleCreerJournal} disabled={savingJournal} className="btn-primary text-sm disabled:opacity-50">{savingJournal ? 'Création...' : '+ Créer'}</button>
            </div>
          </div>
        </div>
      )}

      <ListeResponsive
        colonnes={[
          { cle: 'code', libelle: 'Code', texte: (j: any) => j.code, rendu: (j: any) => <Numero>{j.code}</Numero> },
          { cle: 'lib', libelle: 'Libellé', texte: (j: any) => j.libelle, rendu: (j: any) => <Tronque texte={j.libelle} largeur="22rem" /> },
          { cle: 'type', libelle: 'Type', texte: (j: any) => j.type, rendu: (j: any) => <Discret>{j.type}</Discret> },
          { cle: 'cp', libelle: 'Contrepartie', texte: (j: any) => j.compteContrepartie || '', rendu: (j: any) => <Discret>{j.compteContrepartie || '—'}</Discret> },
          { cle: 'st', libelle: 'Statut', texte: (j: any) => (j.actif ? 'Actif' : 'Inactif'), rendu: (j: any) => <button type="button" onClick={e => { e.stopPropagation(); handleToggleActifJournal(j); }} title="Cliquer pour activer ou désactiver"><StatutPastille libelle={j.actif ? 'Actif' : 'Inactif'} ton={j.actif ? 'success' : 'gray'} /></button> },
        ]}
        lignes={journaux}
        cleLigne={(j: any) => j.id}
        chargement={loading}
        nomExport="journaux"
        actions={(j: any) => <BoutonIcone titre="Supprimer" ton="danger" onClick={() => handleSupprimerJournal(j.id)}><IconeSupprimer /></BoutonIcone>}
        carte={(j: any) => ({ titre: j.libelle, sousTitre: `${j.code} — ${j.type}${j.compteContrepartie ? ` — contrepartie ${j.compteContrepartie}` : ''}`, statut: <button type="button" onClick={() => handleToggleActifJournal(j)}><StatutPastille libelle={j.actif ? 'Actif' : 'Inactif'} ton={j.actif ? 'success' : 'gray'} /></button> })}
        vide={<EmptyState titre="Aucun journal" description="Créez-en un avec « Nouveau journal »." />}
      />
    </div>
  );
}
