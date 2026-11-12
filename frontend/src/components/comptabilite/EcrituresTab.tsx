'use client';

import { Fragment, useEffect, useState } from 'react';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import FAB from '@/components/ui/FAB';
import SheetActions from '@/components/forms/SheetActions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EcritureLignesEditor from './EcritureLignesEditor';
import { fmt, emptyLigne, emptyEcritureForm } from './comptaShared';

export default function EcrituresTab({ exerciceId, comptes, journaux, origine, lectureSeule = false }: { exerciceId: string; comptes: any[]; journaux: any[]; origine: 'AUTO' | 'MANUEL'; lectureSeule?: boolean }) {
  const confirmer = useConfirm();
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalFiltre, setJournalFiltre] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyEcritureForm());
  const [saving, setSaving] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params: any = { exerciceId, origine, limit: 100 };
    if (journalFiltre) params.journalId = journalFiltre;
    comptabiliteApi.ecritures(params)
      .then(r => setEcritures(r.data.data || []))
      .catch(() => setEcritures([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (exerciceId) load(); }, [exerciceId, journalFiltre, origine]);

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
    if (!(await confirmer({ titre: 'Supprimer cette écriture ?', message: 'Cette action est définitive.', confirmer: 'Supprimer', danger: true }))) return;
    try { await comptabiliteApi.supprimerEcriture(id); toast.success('Écriture supprimée'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <select value={journalFiltre} onChange={e => setJournalFiltre(e.target.value)} aria-label="Filtrer par journal" className="input-field !w-auto max-md:flex-1 md:text-sm">
          <option value="">Tous les journaux</option>
          {journaux.map((j: any) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
        </select>
        {!lectureSeule && <button onClick={openCreate} className="btn-primary text-sm hidden lg:inline-flex">Nouvelle écriture</button>}
      </div>
      {!lectureSeule && <FAB label="Nouvelle écriture" onClick={openCreate} />}
      <div className="table-container">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '27%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead><tr>
            <th className="table-header !text-[10px] !px-1.5 truncate">Actions</th><th className="table-header !text-[10px] !px-1.5 truncate">N°</th><th className="table-header !text-[10px] !px-1.5 truncate">Date</th><th className="table-header !text-[10px] !px-1.5 truncate">Journal</th>
            <th className="table-header !text-[10px] !px-1.5 truncate">Libellé</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Débit</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Crédit</th>
            <th className="table-header !text-[10px] !px-1.5 truncate">Statut</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={8} />
            ) : ecritures.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">{lectureSeule ? 'Aucune écriture. Lancez la génération depuis l\'onglet Génération.' : 'Aucune écriture. Cliquez sur « Nouvelle écriture ».'}{!lectureSeule && <><br /><button type="button" onClick={openCreate} className="btn-primary mt-3">Nouvelle écriture</button></>}</td></tr>
            ) : ecritures.map(ec => {
              const totalDebit = ec.mouvements.reduce((s: number, m: any) => s + Number(m.debit), 0);
              const totalCredit = ec.mouvements.reduce((s: number, m: any) => s + Number(m.credit), 0);
              return (
                <Fragment key={ec.id}>
                  <tr className="table-row cursor-pointer" onClick={() => setOuverte(ouverte === ec.id ? null : ec.id)}>
                    <td className="table-cell" data-label="Actions" onClick={e => e.stopPropagation()}>
                      {!ec.validee && (
                        <div className="flex gap-2 text-sm md:text-xs">
                          <button onClick={() => handleValider(ec.id)} className="px-2 py-2 text-primary-600 hover:underline">Valider</button>
                          <button onClick={() => handleSupprimer(ec.id)} className="px-2 py-2 text-red-600 hover:underline">Supprimer</button>
                        </div>
                      )}
                    </td>
                    <td className="table-cell font-mono text-xs text-primary-600" data-label="N°">{ec.numero}</td>
                    <td className="table-cell col-opt text-xs" data-label="Date">{new Date(ec.dateEcriture).toLocaleDateString('fr-FR')}</td>
                    <td className="table-cell col-opt" data-label="Journal"><span className="badge badge-gray">{ec.journal.code}</span></td>
                    <td className="table-cell text-xs" data-label="Libellé">{ec.libelle}</td>
                    <td className="table-cell text-right font-mono" data-label="Débit">{fmt(totalDebit)}</td>
                    <td className="table-cell text-right font-mono" data-label="Crédit">{fmt(totalCredit)}</td>
                    <td className="table-cell" data-label="Statut"><span className={`badge ${ec.validee ? 'badge-success' : 'badge-gray'}`}>{ec.validee ? 'Validée' : 'Brouillon'}</span></td>
                  </tr>
                  {ouverte === ec.id && (
                    <tr>
                      <td colSpan={8} className="p-0 bg-gray-50 dark:bg-surface-700/40">
                        <ul className="md:hidden divide-y divide-gray-100 dark:divide-surface-700 text-sm" aria-label="Lignes de l'écriture">
                          {ec.mouvements.map((m: any) => (
                            <li key={m.id} className="px-3 py-2">
                              <p className="font-mono text-xs">{m.compte.numero} — {m.compte.libelle}</p>
                              {m.libelle && <p className="text-gray-600 dark:text-gray-300">{m.libelle}</p>}
                              <p className="font-mono">
                                {Number(m.debit) > 0 ? <>Débit : {fmt(m.debit)}</> : <>Crédit : {fmt(m.credit)}</>}
                              </p>
                            </li>
                          ))}
                        </ul>
                        <table className="hidden md:table w-full text-xs">
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

      <Sheet open={showModal} onClose={() => setShowModal(false)} size="3xl" fullScreen closeOnBackdrop={false} title="Nouvelle écriture">
        <form onSubmit={handleSave} className="space-y-4">
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
          <EcritureLignesEditor lignes={form.lignes} comptes={comptes} totalDebit={totalDebit} totalCredit={totalCredit} equilibre={equilibre} onUpdate={updateLigne} onAdd={addLigne} onRemove={removeLigne} />
          <SheetActions onCancel={() => setShowModal(false)} loading={saving} disabled={!equilibre} submitLabel="Créer l'écriture" />
        </form>
      </Sheet>
    </div>
  );
}

