'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getSocieteBranding } from '@/lib/generatePDF';
import api, { facturesApi, financeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { downloadPDF, printDocument, generateDocQrDataUrl, type DocData } from '@/lib/generatePDF';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import StickyActionBar, { StickyActionSpacer } from '@/components/facturation/StickyActionBar';
import { STATUT_COLORS } from '../_components/detail/factureHelpers';
import FactureResume from '../_components/detail/FactureResume';
import FactureLignes from '../_components/detail/FactureLignes';
import FactureDocument from '../_components/detail/FactureDocument';
import FacturePaiements from '../_components/detail/FacturePaiements';
import { AvoirSheet, CatalogueLignesSheet, PaiementSheet, type PaiementForm } from '../_components/detail/FactureSheets';

type Onglet = 'resume' | 'lignes' | 'paiements' | 'documents';

export default function FactureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirmer = useConfirm();
  const factureId = params.id as string;
  const { hasPermission } = useAuthStore();
  const canSignature = hasPermission('DOCUMENTS:SIGNATURE');

  const [facture, setFacture] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [onglet, setOnglet] = useState<Onglet>('resume');

  useEffect(() => {
    getSocieteBranding().then(setBranding);
  }, []);

  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [searchCat, setSearchCat] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [validating, setValidating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showPaiement, setShowPaiement] = useState(false);
  const [paying, setPaying] = useState(false);
  const [comptesOptions, setComptesOptions] = useState<{ value: string; label: string }[]>([]);
  const [paiementForm, setPaiementForm] = useState<PaiementForm>({ montant: '', modePaiement: 'ESPECES', reference: '', banque: '', compte: '' });
  const [numeroNormalise, setNumeroNormalise] = useState('');
  const [savingNumeroNormalise, setSavingNumeroNormalise] = useState(false);
  const [showAvoir, setShowAvoir] = useState(false);
  const [motifAvoir, setMotifAvoir] = useState('');
  const [creatingAvoir, setCreatingAvoir] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fRes, catRes] = await Promise.all([
        facturesApi.get(factureId),
        api.get('/proformas/catalogue'),
      ]);
      setFacture(fRes.data.data);
      setNumeroNormalise(fRes.data.data.numeroNormalise || '');
      setCatalogue(catRes.data.data || []);
    } catch { toast.error('Facture non trouvée'); router.push('/facturation'); }
    finally { setLoading(false); }
  }, [factureId, router]);

  useEffect(() => { load(); }, [load]);

  const handleToggleSignature = async (checked: boolean) => {
    if (!canSignature) return;
    setFacture((prev: any) => prev ? { ...prev, afficherSignature: checked } : prev);
    try {
      await api.patch(`/factures/${factureId}/signature`, { afficherSignature: checked });
    } catch { toast.error('Erreur lors de la mise à jour'); setFacture((prev: any) => prev ? { ...prev, afficherSignature: !checked } : prev); }
  };

  const buildDocData = useCallback((): DocData | null => {
    if (!facture) return null;
    const d = facture.dossier;
    return {
      type: 'FACTURE',
      modele: facture.modele,
      numero: facture.numero,
      date: new Date(facture.dateFacture).toLocaleDateString('fr-FR'),
      client: facture.client?.raisonSociale || '',
      clientAdresse: facture.client?.adresse || undefined,
      clientTelephone: facture.client?.telephone || facture.client?.mobile || undefined,
      clientEmail: facture.client?.email || undefined,
      clientNcc: facture.client?.ncc || undefined,
      clientPays: facture.client?.pays || undefined,
      dossierNumero: d?.numeroPhysique || d?.numero,
      titre: facture.titre,
      afficherSignature: !!facture.afficherSignature,
      montantHT: Number(facture.montantHT),
      montantTVA: Number(facture.montantTVA),
      montantTTC: Number(facture.montantTTC),
      montantPrestation: facture.montantPrestation ? Number(facture.montantPrestation) : undefined,
      tvaPrestation: facture.tvaPrestation ? Number(facture.tvaPrestation) : undefined,
      acompte: Number(facture.acompte) || undefined,
      resteAPayer: Number(facture.resteAPayer) || undefined,
      lignes: (facture.lignes || []).map((l: any) => ({
        categorie: l.categorie || '',
        designation: l.designation,
        quantite: Number(l.quantite || 1),
        prixUnitaire: Number(l.prixUnitaire || 0),
        montant: Number(l.prixUnitaire || 0),
      })),
    };
  }, [facture]);

  useEffect(() => {
    const data = buildDocData();
    if (!data) return;
    generateDocQrDataUrl(data).then(setQrDataUrl).catch(() => {});
  }, [buildDocData]);

  const isBrouillon = facture?.statut === 'BROUILLON';

  const handleAddLigne = async (prestation: any) => {
    try {
      const res = await api.post(`/factures/${factureId}/lignes`, {
        categorie: prestation.categorie,
        codePrestation: prestation.code,
        designation: prestation.designation,
        montant: Number(prestation.montantDefaut) || 0,
        estTVA: prestation.estTVA,
      });
      setFacture(res.data.data);
      toast.success(`${prestation.designation} ajouté`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleDeleteLigne = async (ligneId: string) => {
    try {
      const res = await api.delete(`/factures/${factureId}/lignes/${ligneId}`);
      setFacture(res.data.data);
      toast.success('Ligne supprimée');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleUpdateMontant = async (ligneId: string, montant: number, designation: string, categorie: string, estTVA: boolean) => {
    try {
      const res = await api.put(`/factures/${factureId}/lignes/${ligneId}`, { montant, designation, categorie, estTVA });
      setFacture(res.data.data);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleValiderFacture = async () => {
    if (!(await confirmer({ titre: 'Valider cette facture ?', message: 'Elle ne pourra plus être modifiée.', confirmer: 'Valider' }))) return;
    setValidating(true);
    try {
      await facturesApi.valider(factureId);
      toast.success('Facture validée');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setValidating(false); }
  };

  const openPaiementModal = async () => {
    setPaiementForm({ montant: String(Number(facture.resteAPayer) || 0), modePaiement: 'ESPECES', reference: '', banque: '', compte: '' });
    setShowPaiement(true);
    try {
      const [cRes, bRes] = await Promise.all([financeApi.caisses.list(), financeApi.comptesBancaires.list()]);
      const caisses = (cRes.data.data || []).filter((c: any) => c.actif);
      const comptes = (bRes.data.data || []).filter((c: any) => c.actif);
      setComptesOptions([
        ...caisses.map((c: any) => ({ value: `CAISSE:${c.id}`, label: `Caisse — ${c.libelle}` })),
        ...comptes.map((c: any) => ({ value: `BANQUE:${c.id}`, label: `Banque — ${c.libelle} (${c.banque})` })),
      ]);
    } catch { setComptesOptions([]); }
  };

  const handlePayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(paiementForm.montant) > Number(facture.resteAPayer)) { toast.error('Le montant dépasse le reste à payer'); return; }
    const [compteType, compteId] = paiementForm.compte.split(':');
    setPaying(true);
    try {
      await facturesApi.payer(factureId, {
        montant: Number(paiementForm.montant),
        modePaiement: paiementForm.modePaiement,
        reference: paiementForm.reference || undefined,
        banque: paiementForm.banque || undefined,
        caisseId: compteType === 'CAISSE' ? compteId : undefined,
        compteBancaireId: compteType === 'BANQUE' ? compteId : undefined,
      });
      toast.success('Paiement enregistré');
      setShowPaiement(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setPaying(false); }
  };

  const handleSaveNumeroNormalise = async () => {
    if ((facture.numeroNormalise || '') === numeroNormalise.trim()) return;
    setSavingNumeroNormalise(true);
    try {
      await facturesApi.updateNumeroNormalise(factureId, numeroNormalise.trim());
      setFacture((prev: any) => prev ? { ...prev, numeroNormalise: numeroNormalise.trim() || null } : prev);
      toast.success('Numéro de facture normalisée enregistré');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingNumeroNormalise(false); }
  };

  const handleCreerAvoir = async () => {
    if (!motifAvoir.trim()) { toast.error('Le motif de l\'avoir est requis'); return; }
    setCreatingAvoir(true);
    try {
      const res = await facturesApi.creerAvoir(factureId, motifAvoir.trim());
      toast.success(`Avoir ${res.data.data.numero} créé`);
      setShowAvoir(false);
      setMotifAvoir('');
      router.push(`/facturation/${res.data.data.id}`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setCreatingAvoir(false); }
  };

  const handleDownloadPDF = () => {
    const data = buildDocData();
    if (!data) return;
    downloadPDF(data);
    toast.success('PDF téléchargé');
  };

  const handlePrint = async () => {
    const data = buildDocData();
    if (!data) return;
    const ok = await printDocument(data);
    if (!ok) toast.error('Popup bloqué. Autorisez les popups.');
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div></AppLayout>;
  if (!facture) return null;

  const lignes = facture.lignes || [];
  const paiements = (facture.paiements || []).filter((a: any) => a.paiement);
  const canPayer = facture.statut !== 'ANNULEE' && facture.statut !== 'PAYEE' && Number(facture.resteAPayer) > 0;
  const canAvoir = facture.type === 'FACTURE' && facture.statut !== 'BROUILLON' && facture.statut !== 'ANNULEE';
  // L'édition des lignes n'existait que pour le modèle « actuel » (le modèle proforma reste en lecture seule)
  const lignesEditables = isBrouillon && facture.modele !== 'PROFORMA';

  const onglets: { id: Onglet; label: string; count?: number }[] = [
    { id: 'resume', label: 'Résumé' },
    { id: 'lignes', label: 'Lignes', count: lignes.length },
    { id: 'paiements', label: 'Paiements', count: paiements.length },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* En-tête */}
        <div className="bg-primary-700 rounded-lg p-3 flex items-center gap-3">
          <button type="button" onClick={() => router.push('/facturation')} aria-label="Retour à la facturation" className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-primary-600 text-white">
            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white truncate">{facture.type === 'AVOIR' ? 'Fiche Avoir' : 'Fiche Facture'}</h1>
            <p className="text-primary-100 text-xs truncate">{facture.numero} — {facture.client?.raisonSociale}</p>
          </div>
          <span className={`badge ${STATUT_COLORS[facture.statut] || 'badge-gray'} flex-shrink-0`}>{facture.statut?.replace(/_/g, ' ')}</span>
        </div>

        {/* Actions principales (barre collante sur mobile) */}
        <StickyActionBar>
          {isBrouillon && (
            <button type="button" onClick={handleValiderFacture} disabled={validating} className="btn-success disabled:opacity-50">
              {validating ? 'Validation...' : 'Valider'}
            </button>
          )}
          {canPayer && (
            <button type="button" onClick={openPaiementModal} className="btn-primary">Enregistrer un paiement</button>
          )}
          <button type="button" onClick={handleDownloadPDF} className="btn-secondary">
            <svg aria-hidden="true" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            PDF
          </button>
          <button type="button" onClick={handlePrint} className="btn-secondary">Imprimer</button>
          {canAvoir && (
            <button type="button" onClick={() => setShowAvoir(true)} className="btn-secondary">Créer un avoir</button>
          )}
        </StickyActionBar>

        {/* Onglets */}
        <div role="tablist" aria-label="Sections de la facture" className="flex gap-1 bg-gray-100 dark:bg-surface-700 rounded-lg p-1 overflow-x-auto">
          {onglets.map(o => (
            <button
              key={o.id} type="button" role="tab" id={`tab-${o.id}`} aria-selected={onglet === o.id} aria-controls={`panel-${o.id}`}
              onClick={() => setOnglet(o.id)}
              className={`flex-1 min-h-[40px] px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${onglet === o.id ? 'bg-white dark:bg-surface-800 shadow text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {o.label}{o.count != null ? ` (${o.count})` : ''}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${onglet}`} aria-labelledby={`tab-${onglet}`}>
          {onglet === 'resume' && (
            <FactureResume
              facture={facture}
              numeroNormalise={numeroNormalise} setNumeroNormalise={setNumeroNormalise}
              savingNumeroNormalise={savingNumeroNormalise} onSaveNumeroNormalise={handleSaveNumeroNormalise}
              canSignature={canSignature} onToggleSignature={handleToggleSignature}
            />
          )}
          {onglet === 'lignes' && (
            <FactureLignes
              lignes={lignes} editable={lignesEditables}
              onUpdateMontant={handleUpdateMontant} onDelete={handleDeleteLigne} onOpenCatalogue={() => setShowCatalogue(true)}
            />
          )}
          {onglet === 'paiements' && (
            <FacturePaiements paiements={paiements} canPayer={canPayer} onPayer={openPaiementModal} />
          )}
          {onglet === 'documents' && (
            <FactureDocument facture={facture} branding={branding} qrDataUrl={qrDataUrl} docData={buildDocData()} />
          )}
        </div>

        <StickyActionSpacer />
      </div>

      <CatalogueLignesSheet
        open={showCatalogue} onClose={() => setShowCatalogue(false)}
        catalogue={catalogue} lignes={lignes}
        search={searchCat} setSearch={setSearchCat} selectedCat={selectedCat} setSelectedCat={setSelectedCat}
        onAdd={handleAddLigne}
      />
      <AvoirSheet open={showAvoir} onClose={() => setShowAvoir(false)} facture={facture} motif={motifAvoir} setMotif={setMotifAvoir} creating={creatingAvoir} onCreate={handleCreerAvoir} />
      <PaiementSheet open={showPaiement} onClose={() => setShowPaiement(false)} facture={facture} form={paiementForm} setForm={setPaiementForm} comptesOptions={comptesOptions} paying={paying} onSubmit={handlePayer} />
    </AppLayout>
  );
}
