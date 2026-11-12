'use client';

import { useEffect, useState } from 'react';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import SheetActions from '@/components/forms/SheetActions';
import EcritureLignesEditor from './EcritureLignesEditor';
import { fmt, emptyLigne, emptyEcritureForm } from './comptaShared';

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

const today = () => new Date().toISOString().slice(0, 10);

/** Pièces en attente de comptabilisation (Compta Manuelle) ou rejetées. */
export default function EnAttenteTab({ exerciceId, comptes, journaux, statutFiltre }: { exerciceId: string; comptes: any[]; journaux: any[]; statutFiltre: 'EN_ATTENTE' | 'REJETEE' }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ libelle: '', montant: '', dateOperation: today() });
  const [savingAdd, setSavingAdd] = useState(false);
  const [comptabilisant, setComptabilisant] = useState<any>(null);
  const [form, setForm] = useState(emptyEcritureForm());
  const [saving, setSaving] = useState(false);
  const [chargementProposition, setChargementProposition] = useState(false);
  const [aRejeter, setARejeter] = useState<any>(null);
  const [motifRejet, setMotifRejet] = useState('');
  const [rejetEnCours, setRejetEnCours] = useState(false);

  const load = () => {
    setLoading(true);
    comptabiliteApi.ecrituresAttente({ statut: statutFiltre })
      .then(r => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statutFiltre]);

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.libelle.trim() || !addForm.montant || !addForm.dateOperation) { toast.error('Libellé, montant et date sont requis'); return; }
    setSavingAdd(true);
    try {
      await comptabiliteApi.ajouterEnAttente({ libelle: addForm.libelle.trim(), montant: addForm.montant, dateOperation: addForm.dateOperation });
      toast.success('Ajouté à la file d\'attente');
      setShowAdd(false);
      setAddForm({ libelle: '', montant: '', dateOperation: today() });
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSavingAdd(false); }
  };

  const handleRejeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aRejeter) return;
    setRejetEnCours(true);
    try {
      await comptabiliteApi.rejeterEnAttente(aRejeter.id, motifRejet.trim() || undefined);
      toast.success('Entrée rejetée');
      setARejeter(null);
      setMotifRejet('');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setRejetEnCours(false); }
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
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const enAttente = statutFiltre === 'EN_ATTENTE';

  return (
    <div className="space-y-3">
      {enAttente && (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm max-md:w-full min-h-[44px] md:min-h-0">Ajouter une pièce</button>
        </div>
      )}

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} size="md" title="Ajouter une pièce à comptabiliser">
        <form onSubmit={handleAjouter} className="space-y-4">
          <div><label className="label">Libellé *</label><input type="text" value={addForm.libelle} onChange={e => setAddForm({ ...addForm, libelle: e.target.value })} className="input-field" placeholder="Ex : Facture d'électricité SEPTEMBRE" required /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Montant *</label><input type="number" inputMode="decimal" value={addForm.montant} onChange={e => setAddForm({ ...addForm, montant: e.target.value })} className="input-field" required /></div>
            <div><label className="label">Date *</label><input type="date" value={addForm.dateOperation} onChange={e => setAddForm({ ...addForm, dateOperation: e.target.value })} className="input-field" required /></div>
          </div>
          <SheetActions onCancel={() => setShowAdd(false)} loading={savingAdd} submitLabel="Ajouter" />
        </form>
      </Sheet>

      <div className="table-container">
        <table className="w-full table-fixed">
          <colgroup>
            {enAttente && <col style={{ width: '17%' }} />}
            <col style={{ width: '12%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            {!enAttente && <col style={{ width: '17%' }} />}
          </colgroup>
          <thead><tr>
            {enAttente && <th className="table-header !text-[10px] !px-1.5 truncate">Actions</th>}
            <th className="table-header !text-[10px] !px-1.5 truncate">Source</th><th className="table-header !text-[10px] !px-1.5 truncate">Référence</th>
            <th className="table-header !text-[10px] !px-1.5 truncate">Libellé</th><th className="table-header !text-[10px] !px-1.5 truncate">Date</th>
            <th className="table-header !text-[10px] !px-1.5 truncate text-right">Montant</th>
            {!enAttente && <th className="table-header !text-[10px] !px-1.5 truncate">Motif</th>}
          </tr></thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={6} />
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">{enAttente ? 'Aucune entrée en attente' : 'Aucune entrée rejetée'}</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="table-row">
                {enAttente && (
                  <td className="table-cell" data-label="Actions">
                    <div className="flex flex-wrap gap-2 text-sm md:text-xs">
                      <button onClick={() => openComptabiliser(item)} className="px-2 py-2 text-primary-600 hover:underline">Comptabiliser</button>
                      <button onClick={() => { setARejeter(item); setMotifRejet(''); }} className="px-2 py-2 text-red-600 hover:underline">Rejeter</button>
                    </div>
                  </td>
                )}
                <td className="table-cell col-opt !text-[10.5px]" data-label="Source"><span className="badge badge-gray !text-[10px]">{SOURCE_LABELS[item.source] || item.source}</span></td>
                <td className="table-cell !text-[10.5px] truncate" data-label="Référence" title={sourceDetail(item)}>{sourceDetail(item)}</td>
                <td className="table-cell !text-[11px] truncate" data-label="Libellé" title={item.libelle}>{item.libelle}</td>
                <td className="table-cell col-opt !text-[10.5px]" data-label="Date">{new Date(item.dateOperation).toLocaleDateString('fr-FR')}</td>
                <td className="table-cell text-right font-mono !text-[10.5px]" data-label="Montant">{fmt(item.montant)}</td>
                {!enAttente && <td className="table-cell !text-[10.5px]" data-label="Motif">{item.motifRejet || '-'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!aRejeter} onClose={() => setARejeter(null)} size="md" title="Rejeter cette pièce" description={aRejeter?.libelle}>
        <form onSubmit={handleRejeter} className="space-y-4">
          <div><label className="label">Motif du rejet (optionnel)</label><textarea value={motifRejet} onChange={e => setMotifRejet(e.target.value)} rows={3} className="input-field" /></div>
          <SheetActions onCancel={() => setARejeter(null)} variant="danger" loading={rejetEnCours} submitLabel="Rejeter" />
        </form>
      </Sheet>

      <Sheet
        open={!!comptabilisant}
        onClose={() => setComptabilisant(null)}
        size="3xl"
        fullScreen
        closeOnBackdrop={false}
        title={`Comptabiliser — ${comptabilisant?.libelle || ''}`}
        description={chargementProposition ? 'Préparation de la proposition...' : undefined}
      >
        {!exerciceId ? (
          <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-300">Sélectionnez d&apos;abord un exercice en haut de page.</div>
        ) : (
          <form onSubmit={handleComptabiliser} className="space-y-4">
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
            <EcritureLignesEditor lignes={form.lignes} comptes={comptes} totalDebit={totalDebit} totalCredit={totalCredit} equilibre={equilibre} onUpdate={updateLigne} onAdd={addLigne} onRemove={removeLigne} />
            <SheetActions onCancel={() => setComptabilisant(null)} loading={saving} disabled={!equilibre} submitLabel="Comptabiliser" />
          </form>
        )}
      </Sheet>
    </div>
  );
}
