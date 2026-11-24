'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import PageHeader from '@/components/ui/PageHeader';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeSupprimer } from '@/components/tables/BoutonIcone';
import { Discret, Numero, Montant, Tronque } from '@/components/tables/cellules';
import { financeApi } from '@/lib/api';
import toast from 'react-hot-toast';

const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', TRAITE: 'Traite',
  MOBILE_MONEY: 'Mobile Money', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money',
  WAVE: 'Wave', MOOV_MONEY: 'Moov Money', CARTE_BANCAIRE: 'Carte bancaire', COMPENSATION: 'Compensation',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

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

  const colonnesLignes = [
    { cle: 'des', libelle: 'Désignation', texte: (l: any) => l.designation, rendu: (l: any) => <Tronque texte={l.designation} largeur="28rem" /> },
    { cle: 'qte', libelle: 'Qté', align: 'right' as const, texte: (l: any) => String(Number(l.quantite)), rendu: (l: any) => <Discret>{Number(l.quantite)}</Discret> },
    { cle: 'pu', libelle: 'Prix unitaire', align: 'right' as const, texte: (l: any) => String(l.prixUnitaire), rendu: (l: any) => <Montant valeur={l.prixUnitaire} unite="" /> },
    { cle: 'tva', libelle: 'TVA', align: 'right' as const, masquerSous: 'xl' as const, texte: (l: any) => `${Number(l.tauxTVA)}%`, rendu: (l: any) => <Discret>{Number(l.tauxTVA)}%</Discret> },
    { cle: 'ht', libelle: 'Montant HT', align: 'right' as const, texte: (l: any) => String(l.montantHT), rendu: (l: any) => <Montant valeur={l.montantHT} unite="" /> },
    { cle: 'mtva', libelle: 'Montant TVA', align: 'right' as const, masquerSous: 'xl' as const, texte: (l: any) => String(l.montantTVA), rendu: (l: any) => <Montant valeur={l.montantTVA} unite="" /> },
  ];
  const colonnesPaiements = [
    { cle: 'date', libelle: 'Date', texte: (a: any) => new Date(a.paiementFournisseur.datePaiement).toLocaleDateString('fr-FR'), rendu: (a: any) => <Discret>{new Date(a.paiementFournisseur.datePaiement).toLocaleDateString('fr-FR')}</Discret> },
    { cle: 'num', libelle: 'N° transaction', texte: (a: any) => a.paiementFournisseur.numero, rendu: (a: any) => <Numero>{a.paiementFournisseur.numero}</Numero> },
    { cle: 'mode', libelle: 'Mode', texte: (a: any) => MODE_PAIEMENT_LABELS[a.paiementFournisseur.modePaiement] || a.paiementFournisseur.modePaiement, rendu: (a: any) => <Discret>{MODE_PAIEMENT_LABELS[a.paiementFournisseur.modePaiement] || a.paiementFournisseur.modePaiement}</Discret> },
    { cle: 'compte', libelle: 'Compte', masquerSous: 'xl' as const, texte: (a: any) => { const p = a.paiementFournisseur; return p.caisse?.libelle || p.compteBancaire?.libelle || p.compteTiers?.libelle || '—'; }, rendu: (a: any) => { const p = a.paiementFournisseur; return <Tronque texte={p.caisse?.libelle || p.compteBancaire?.libelle || p.compteTiers?.libelle || '—'} largeur="14rem" />; } },
    { cle: 'montant', libelle: 'Montant', align: 'right' as const, texte: (a: any) => String(a.montant), rendu: (a: any) => <Montant valeur={a.montant} ton="positif" /> },
    { cle: 'user', libelle: 'Utilisateur', masquerSous: 'xl' as const, texte: (a: any) => { const c = a.paiementFournisseur.createur; return c ? `${c.nom} ${c.prenom}` : '—'; }, rendu: (a: any) => { const c = a.paiementFournisseur.createur; return <Discret>{c ? `${c.nom} ${c.prenom}` : '—'}</Discret>; } },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre={`Facture ${facture.numero}`}
          sousTitre={`${(facture.statut || '').replace(/_/g, ' ')} — ${facture.fournisseur?.raisonSociale || ''}`}
          actions={
            <>
              <button onClick={() => router.push('/facturation-fournisseurs')} className="btn-secondary">← Retour</button>
              {isBrouillon && (
                <button onClick={handleValider} disabled={validating} className="btn-primary disabled:opacity-50">{validating ? 'Validation...' : 'Valider'}</button>
              )}
              {facture.statut !== 'ANNULEE' && facture.statut !== 'PAYEE' && Number(facture.resteAPayer) > 0 && (
                <button onClick={openPaiementModal} className="btn-primary">Enregistrer un paiement</button>
              )}
            </>
          }
        />

        {/* Infos */}
        <div className="card grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-500 text-xs block">Fournisseur</span><span className="font-bold">{facture.fournisseur?.raisonSociale}</span></div>
          <div><span className="text-gray-500 text-xs block">Dossier</span><span className="font-mono">{facture.dossier?.numeroPhysique || facture.dossier?.numero || '-'}</span></div>
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
          <ListeResponsive
            colonnes={colonnesLignes}
            lignes={lignes}
            cleLigne={(l: any) => l.id}
            actions={isBrouillon ? (l: any) => <BoutonIcone titre="Supprimer" ton="danger" onClick={() => handleDeleteLigne(l.id)}><IconeSupprimer /></BoutonIcone> : undefined}
            carte={(l: any) => ({ titre: l.designation, sousTitre: `${Number(l.quantite)} × ${fmt(l.prixUnitaire)} — TVA ${Number(l.tauxTVA)}%`, droite: <Montant valeur={l.montantHT} /> })}
            vide={<p className="py-6 text-center text-sm text-gray-500">Aucune ligne. {isBrouillon ? 'Ajoutez-en une.' : ''}</p>}
          />

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
            <ListeResponsive
              colonnes={colonnesPaiements}
              lignes={(facture.paiements || []).filter((a: any) => a.paiementFournisseur)}
              cleLigne={(a: any) => a.id}
              carte={(a: any) => ({ titre: a.paiementFournisseur.numero, sousTitre: `${new Date(a.paiementFournisseur.datePaiement).toLocaleDateString('fr-FR')} — ${MODE_PAIEMENT_LABELS[a.paiementFournisseur.modePaiement] || a.paiementFournisseur.modePaiement}`, droite: <Montant valeur={a.montant} ton="positif" /> })}
              vide={<p className="py-4 text-sm text-gray-500">Aucun paiement enregistré</p>}
            />
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <PickerField value={paiementForm.compte} onChange={id => setPaiementForm({ ...paiementForm, compte: id })} options={comptesOptions.map(o => ({ id: o.value, label: o.label }))} placeholder="Sélectionner..." title="Sélectionner un compte" searchPlaceholder="Compte, caisse..." required />
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
