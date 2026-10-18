'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import { financeApi } from '@/lib/api';
import { fmt, mergedComptes, parseCompteValue, MODE_PAIEMENT_LABELS, useComptesFinanciers } from '@/lib/financeHelpers';
import { ouvrirPiece } from '@/lib/pieceJointe';

const STATUT_LABEL: Record<string, string> = { EN_ATTENTE: 'En attente', VALIDE: 'Validé', REJETE: 'Rejeté' };
const STATUT_BADGE: Record<string, string> = { EN_ATTENTE: 'badge-warning', VALIDE: 'badge-success', REJETE: 'badge-danger' };
// Modes acceptés par la validation (un justificatif correspond à un décaissement réel).
const MODES = ['ESPECES', 'CHEQUE', 'VIREMENT', 'MOBILE_MONEY', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'MOOV_MONEY'];
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

export default function JustificatifsDotationPage() {
  const { caisses, comptes } = useComptesFinanciers();
  const [statut, setStatut] = useState('EN_ATTENTE');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aValider, setAValider] = useState<any | null>(null);
  const [compte, setCompte] = useState('');
  const [mode, setMode] = useState('ESPECES');
  const [aRejeter, setARejeter] = useState<any | null>(null);
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    financeApi.justificatifs.list({ statut })
      .then(r => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [statut]);

  useEffect(() => { load(); }, [load]);

  const compteOptions = mergedComptes(caisses, comptes).map(o => ({ id: o.value, label: o.label }));

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseCompteValue(compte);
    if (!aValider || !c) { toast.error('Sélectionnez le compte à débiter'); return; }
    setBusy(true);
    try {
      const r = await financeApi.justificatifs.valider(aValider.id, {
        modePaiement: mode,
        caisseId: c.type === 'CAISSE' ? c.id : undefined,
        compteBancaireId: c.type === 'BANQUE' ? c.id : undefined,
      });
      toast.success(r.data.message || 'Justificatif validé');
      setAValider(null); setCompte('');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const rejeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aRejeter) return;
    setBusy(true);
    try {
      await financeApi.justificatifs.rejeter(aRejeter.id, motif);
      toast.success('Justificatif rejeté');
      setARejeter(null); setMotif('');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const voirPiece = async (j: any) => {
    try { const r = await financeApi.justificatifs.piece(j.id); ouvrirPiece(r.data.data.piece); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Pièce introuvable'); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="card !p-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Justificatifs de dotation</h1>
            <p className="text-[11px] text-gray-500">Validez les dépenses saisies par les bénéficiaires : la validation crée la dépense et débite le compte choisi.</p>
          </div>
          <select value={statut} onChange={e => setStatut(e.target.value)} className="input-field !py-1.5 text-xs w-44">
            <option value="EN_ATTENTE">En attente</option>
            <option value="VALIDE">Validés</option>
            <option value="REJETE">Rejetés</option>
            <option value="TOUS">Tous</option>
          </select>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Actions</th>
                <th className="table-header">Date</th>
                <th className="table-header">Bénéficiaire</th>
                <th className="table-header">Dotation</th>
                <th className="table-header">Dossier</th>
                <th className="table-header">Catégorie</th>
                <th className="table-header">Désignation</th>
                <th className="table-header text-right">Montant</th>
                <th className="table-header">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={9} />
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">Aucun justificatif {statut === 'EN_ATTENTE' ? 'en attente de validation' : ''}</td></tr>
              ) : items.map(j => (
                <tr key={j.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex gap-3 text-xs">
                      {j.aPiece && <button type="button" onClick={() => voirPiece(j)} className="text-primary-600 hover:underline">Pièce</button>}
                      {j.statut === 'EN_ATTENTE' && (
                        <>
                          <button type="button" onClick={() => { setAValider(j); setCompte(''); setMode('ESPECES'); }} className="text-green-700 font-semibold hover:underline">Valider</button>
                          <button type="button" onClick={() => { setARejeter(j); setMotif(''); }} className="text-red-600 hover:underline">Rejeter</button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="table-cell" data-label="Date">{fmtDate(j.dateJustificatif)}</td>
                  <td className="table-cell" data-label="Bénéficiaire">{j.auteur?.nom} {j.auteur?.prenom}</td>
                  <td className="table-cell font-mono" data-label="Dotation">{j.dotation?.numero}</td>
                  <td className="table-cell font-mono" data-label="Dossier">{j.dossier ? (j.dossier.numeroPhysique || j.dossier.numero) : '-'}</td>
                  <td className="table-cell" data-label="Catégorie">{j.categorie}</td>
                  <td className="table-cell !whitespace-normal" data-label="Désignation">{j.designation}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant">{fmt(j.montant)}</td>
                  <td className="table-cell" data-label="Statut">
                    <span className={`badge ${STATUT_BADGE[j.statut]}`}>{STATUT_LABEL[j.statut]}</span>
                    {j.statut === 'REJETE' && j.motifRejet && <div className="text-[11px] text-red-600 mt-1 !whitespace-normal">{j.motifRejet}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {aValider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setAValider(null)}>
          <form onSubmit={valider} className="bg-white dark:bg-surface-800 rounded-sm shadow-lg w-full max-w-md border border-gray-300 dark:border-surface-700" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 bg-primary-600 text-white font-bold">Valider le justificatif</div>
            <div className="p-4 space-y-3 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-surface-700 rounded-sm">
                <div className="font-semibold">{aValider.designation}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {aValider.auteur?.nom} {aValider.auteur?.prenom} — {aValider.dotation?.numero}
                  {aValider.dossier ? ` — dossier ${aValider.dossier.numeroPhysique || aValider.dossier.numero}` : ''}
                </div>
                <div className="font-mono font-bold mt-1">{fmt(aValider.montant)} F</div>
              </div>
              <p className="text-xs text-gray-500">La dépense sera enregistrée, rattachée à la dotation{aValider.dossier ? ' et au dossier' : ''}, et le compte choisi sera débité de ce montant.</p>
              <div>
                <label className="label">Compte à débiter *</label>
                <PickerField value={compte} onChange={setCompte} options={compteOptions} placeholder="Sélectionner..." title="Sélectionner un compte" searchPlaceholder="Compte, caisse..." required />
              </div>
              <div>
                <label className="label">Mode de paiement</label>
                <select value={mode} onChange={e => setMode(e.target.value)} className="input-field">
                  {MODES.map(m => <option key={m} value={m}>{MODE_PAIEMENT_LABELS[m] || m}</option>)}
                </select>
              </div>
            </div>
            <div className="px-4 pb-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAValider(null)}>Annuler</button>
              <button type="submit" className="btn-success" disabled={busy}>{busy ? 'Validation...' : 'Valider et enregistrer la dépense'}</button>
            </div>
          </form>
        </div>
      )}

      {aRejeter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setARejeter(null)}>
          <form onSubmit={rejeter} className="bg-white dark:bg-surface-800 rounded-sm shadow-lg w-full max-w-md border border-gray-300 dark:border-surface-700" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 bg-primary-600 text-white font-bold">Rejeter le justificatif</div>
            <div className="p-4 space-y-3 text-sm">
              <p className="text-gray-600 dark:text-gray-300">« {aRejeter.designation} » — {fmt(aRejeter.montant)} F</p>
              <div>
                <label className="label">Motif du rejet *</label>
                <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={3} className="input-field" placeholder="Ex : pièce illisible, montant différent du reçu..." required />
              </div>
            </div>
            <div className="px-4 pb-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setARejeter(null)}>Annuler</button>
              <button type="submit" className="btn-danger" disabled={busy}>{busy ? 'Rejet...' : 'Rejeter'}</button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
