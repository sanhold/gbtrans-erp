'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { financeApi } from '@/lib/api';
import toast from 'react-hot-toast';

const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', TRAITE: 'Traite',
  MOBILE_MONEY: 'Mobile Money', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money',
  WAVE: 'Wave', MOOV_MONEY: 'Moov Money', CARTE_BANCAIRE: 'Carte bancaire', COMPENSATION: 'Compensation',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

function parseCompteValue(value: string): { type: 'CAISSE' | 'BANQUE' | 'TIERS'; id: string } | null {
  if (!value) return null;
  const [type, id] = value.split(':');
  return { type: type as 'CAISSE' | 'BANQUE' | 'TIERS', id };
}

export default function FactureFournisseurDetailPage() {
  const params = useParams();
  const router = useRouter();
  const factureId = params.id as string;

  const [facture, setFacture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [showLigne, setShowLigne] = useState(false);
  const [ligneForm, setLigneForm] = useState({ designation: '', quantite: '1', prixUnitaire: '', tauxTVA: '18' });
  const [showPaiement, setShowPaiement] = useState(false);
  const [paying, setPaying] = useState(false);
  const [comptesOptions, setComptesOptions] = useState<{ value: string; label: string }[]>([]);
  const [paiementForm, setPaiementForm] = useState({ montant: '', modePaiement: 'ESPECES', reference: '', banque: '', compte: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.facturesFournisseurs.get(factureId);
      setFacture(res.data.data);
    } catch { toast.error('Facture fournisseur introuvable'); router.push('/facturation-fournisseurs'); }
    finally { setLoading(false); }
  }, [factureId, router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div></AppLayout>;
  if (!facture) return null;

  const isBrouillon = facture.statut === 'BROUILLON';
  const lignes = facture.lignes || [];

  const handleAddLigne = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await financeApi.facturesFournisseurs.ajouterLigne(factureId, {
        designation: ligneForm.designation, quantite: Number(ligneForm.quantite), prixUnitaire: Number(ligneForm.prixUnitaire), tauxTVA: Number(ligneForm.tauxTVA),
      });
      setFacture(res.data.data);
      setShowLigne(false);
      setLigneForm({ designation: '', quantite: '1', prixUnitaire: '', tauxTVA: '18' });
      toast.success('Ligne ajoutée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleDeleteLigne = async (ligneId: string) => {
    try {
      const res = await financeApi.facturesFournisseurs.supprimerLigne(factureId, ligneId);
      setFacture(res.data.data);
      toast.success('Ligne supprimée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleValider = async () => {
    setValidating(true);
    try {
      await financeApi.facturesFournisseurs.valider(factureId);
      toast.success('Facture fournisseur validée');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setValidating(false); }
  };

  const openPaiementModal = async () => {
    setPaiementForm({ montant: String(Number(facture.resteAPayer) || 0), modePaiement: 'ESPECES', reference: '', banque: '', compte: '' });
    setShowPaiement(true);
    try {
      const [cRes, bRes, tRes] = await Promise.all([financeApi.caisses.list(), financeApi.comptesBancaires.list(), financeApi.comptesTiers.list()]);
      const opts = [
        ...(cRes.data.data || []).filter((c: any) => c.actif).map((c: any) => ({ value: `CAISSE:${c.id}`, label: `Caisse — ${c.libelle}` })),
        ...(bRes.data.data || []).filter((c: any) => c.actif).map((c: any) => ({ value: `BANQUE:${c.id}`, label: `Banque — ${c.libelle} (${c.banque})` })),
        ...(tRes.data.data || []).filter((c: any) => c.actif).map((c: any) => ({ value: `TIERS:${c.id}`, label: `${c.type} — ${c.libelle}` })),
      ];
      setComptesOptions(opts);
    } catch { setComptesOptions([]); }
  };

  const handlePayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const compte = parseCompteValue(paiementForm.compte);
    setPaying(true);
    try {
      await financeApi.facturesFournisseurs.payer(factureId, {
        montant: Number(paiementForm.montant),
        modePaiement: paiementForm.modePaiement,
        reference: paiementForm.reference || undefined,
        banque: paiementForm.banque || undefined,
        caisseId: compte?.type === 'CAISSE' ? compte.id : undefined,
        compteBancaireId: compte?.type === 'BANQUE' ? compte.id : undefined,
        compteTiersId: compte?.type === 'TIERS' ? compte.id : undefined,
      });
      toast.success('Paiement enregistré');
      setShowPaiement(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setPaying(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-primary-700 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/facturation-fournisseurs')} className="p-2 rounded-lg hover:bg-primary-600 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Facture Fournisseur</h1>
              <p className="text-primary-100 text-xs">{facture.numero} — {facture.statut}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isBrouillon && (
              <button onClick={handleValider} disabled={validating} className="px-4 py-2 bg-white text-primary-700 rounded-lg font-semibold text-sm hover:bg-primary-50 disabled:opacity-50 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {validating ? 'Validation...' : 'Valider'}
              </button>
            )}
            {facture.statut !== 'ANNULEE' && facture.statut !== 'PAYEE' && Number(facture.resteAPayer) > 0 && (
              <button onClick={openPaiementModal} className="px-4 py-2 bg-white text-primary-700 rounded-lg font-semibold text-sm hover:bg-primary-50">
                Enregistrer un paiement
              </button>
            )}
          </div>
        </div>

        {/* Infos */}
        <div className="card grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-500 text-xs block">Fournisseur</span><span className="font-bold">{facture.fournisseur?.raisonSociale}</span></div>
          <div><span className="text-gray-500 text-xs block">Dossier</span><span className="font-mono">{facture.dossier?.numero || '-'}</span></div>
          <div><span className="text-gray-500 text-xs block">Date facture</span><span>{new Date(facture.dateFacture).toLocaleDateString('fr-FR')}</span></div>
          <div><span className="text-gray-500 text-xs block">Échéance</span><span>{new Date(facture.dateEcheance).toLocaleDateString('fr-FR')}</span></div>
          <div><span className="text-gray-500 text-xs block">Référence</span><span>{facture.reference || '-'}</span></div>
          <div><span className="text-gray-500 text-xs block">Objet</span><span>{facture.objet || '-'}</span></div>
        </div>

        {/* Lignes */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Lignes</h3>
            {isBrouillon && (
              <button onClick={() => setShowLigne(true)} className="btn-secondary text-xs">+ Ajouter une ligne</button>
            )}
          </div>
          <div className="table-container">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="table-header">Désignation</th><th className="table-header text-right">Quantité</th>
                <th className="table-header text-right">Prix unitaire</th><th className="table-header text-right">Taux TVA</th>
                <th className="table-header text-right">Montant HT</th><th className="table-header text-right">Montant TVA</th>
                {isBrouillon && <th className="table-header"></th>}
              </tr></thead>
              <tbody>
                {lignes.length === 0 ? <tr><td colSpan={isBrouillon ? 7 : 6} className="text-center py-8 text-gray-500">Aucune ligne. {isBrouillon ? 'Ajoutez-en une.' : ''}</td></tr>
                : lignes.map((l: any) => (
                  <tr key={l.id} className="table-row">
                    <td className="table-cell" data-label="Désignation">{l.designation}</td>
                    <td className="table-cell text-right font-mono" data-label="Quantité">{Number(l.quantite)}</td>
                    <td className="table-cell text-right font-mono" data-label="Prix unitaire">{fmt(l.prixUnitaire)}</td>
                    <td className="table-cell text-right font-mono" data-label="Taux TVA">{Number(l.tauxTVA)}%</td>
                    <td className="table-cell text-right font-mono" data-label="Montant HT">{fmt(l.montantHT)}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant TVA">{fmt(l.montantTVA)}</td>
                    {isBrouillon && (
                      <td className="table-cell" data-label="Actions">
                        <button onClick={() => handleDeleteLigne(l.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total HT</span><span className="font-mono">{fmt(facture.montantHT)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total TVA</span><span className="font-mono">{fmt(facture.montantTVA)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total TTC</span><span className="font-mono">{fmt(facture.montantTTC)}</span></div>
              <div className="flex justify-between text-green-600"><span>Payé</span><span className="font-mono">{fmt(facture.montantPaye)}</span></div>
              <div className="flex justify-between font-bold text-red-600"><span>Reste à payer</span><span className="font-mono">{fmt(facture.resteAPayer)}</span></div>
            </div>
          </div>
        </div>

        {/* Historique des paiements */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">Historique des paiements</h3>
          {(facture.paiements || []).length === 0 ? (
            <p className="text-sm text-gray-500">Aucun paiement enregistré pour cette facture</p>
          ) : (
            <div className="table-container">
              <table className="w-full text-sm">
                <thead><tr>
                  <th className="table-header">Date</th><th className="table-header">N° Transaction</th>
                  <th className="table-header">Mode</th><th className="table-header">Compte financier</th>
                  <th className="table-header text-right">Montant</th><th className="table-header">Utilisateur</th>
                  <th className="table-header">Observations</th>
                </tr></thead>
                <tbody>
                  {facture.paiements.map((aff: any) => {
                    const p = aff.paiementFournisseur;
                    if (!p) return null;
                    return (
                      <tr key={aff.id} className="table-row">
                        <td className="table-cell text-xs" data-label="Date">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                        <td className="table-cell font-medium text-primary-600" data-label="N° Transaction">{p.numero}</td>
                        <td className="table-cell" data-label="Mode">{MODE_PAIEMENT_LABELS[p.modePaiement] || p.modePaiement}</td>
                        <td className="table-cell" data-label="Compte financier">{p.caisse?.libelle || p.compteBancaire?.libelle || p.compteTiers?.libelle || '-'}</td>
                        <td className="table-cell text-right font-mono" data-label="Montant">{fmt(aff.montant)}</td>
                        <td className="table-cell" data-label="Utilisateur">{p.createur ? `${p.createur.nom} ${p.createur.prenom}` : '-'}</td>
                        <td className="table-cell text-xs" data-label="Observations">{p.observations || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajouter Ligne */}
      {showLigne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Ajouter une ligne</h2>
              <button onClick={() => setShowLigne(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleAddLigne} className="p-6 space-y-4">
              <div><label className="label">Désignation *</label><input type="text" value={ligneForm.designation} onChange={e => setLigneForm({ ...ligneForm, designation: e.target.value })} className="input-field" required /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Quantité</label><input type="number" step="0.001" value={ligneForm.quantite} onChange={e => setLigneForm({ ...ligneForm, quantite: e.target.value })} className="input-field" /></div>
                <div><label className="label">Prix unitaire *</label><input type="number" value={ligneForm.prixUnitaire} onChange={e => setLigneForm({ ...ligneForm, prixUnitaire: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Taux TVA %</label><input type="number" value={ligneForm.tauxTVA} onChange={e => setLigneForm({ ...ligneForm, tauxTVA: e.target.value })} className="input-field" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowLigne(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Ajouter</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPaiement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Enregistrer un paiement</h2>
              <button onClick={() => setShowPaiement(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handlePayer} className="p-6 space-y-4">
              <p className="text-xs text-gray-500">Reste à payer : <span className="font-mono font-semibold text-gray-900 dark:text-white">{fmt(facture.resteAPayer)} XOF</span></p>
              <div><label className="label">Montant *</label><input type="number" value={paiementForm.montant} onChange={e => setPaiementForm({ ...paiementForm, montant: e.target.value })} className="input-field" max={Number(facture.resteAPayer)} required /></div>
              <div><label className="label">Mode de paiement</label>
                <select value={paiementForm.modePaiement} onChange={e => setPaiementForm({ ...paiementForm, modePaiement: e.target.value })} className="input-field">
                  {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="label">Compte à débiter *</label>
                <select value={paiementForm.compte} onChange={e => setPaiementForm({ ...paiementForm, compte: e.target.value })} className="input-field" required>
                  <option value="">Sélectionner...</option>
                  {comptesOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {(paiementForm.modePaiement === 'CHEQUE' || paiementForm.modePaiement === 'VIREMENT') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Référence</label><input type="text" value={paiementForm.reference} onChange={e => setPaiementForm({ ...paiementForm, reference: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Banque</label><input type="text" value={paiementForm.banque} onChange={e => setPaiementForm({ ...paiementForm, banque: e.target.value })} className="input-field" /></div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowPaiement(false)} className="btn-secondary">Annuler</button><button type="submit" disabled={paying} className="btn-primary disabled:opacity-50">{paying ? 'Enregistrement...' : 'Enregistrer'}</button></div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
