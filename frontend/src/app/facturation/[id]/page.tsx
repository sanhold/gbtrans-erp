'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api, { facturesApi, financeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { montantEnLettres } from '@/lib/montantEnLettres';
import { downloadPDF, printDocument, generateDocQrDataUrl, type DocData } from '@/lib/generatePDF';

const CAT_COLORS: Record<string, string> = {
  'DOUANE': '#059669', 'DOUANE & COMPAGNIE': '#059669',
  'DEBOURS DOUANE': '#0d9488', 'DEBOURS DOUANE & COMPAGNIE': '#0d9488',
  'DOUANE ELIBU-NOE-E': '#65a30d',
  'COMPAGNIE MARITIME': '#2563eb',
  'FRAIS PORTUAIRES': '#0891b2',
  'GUICHET UNIQUE': '#4f46e5', 'GUICHET UNIQUE/IMMATRICULATION': '#4f46e5',
  'EXPORT ET FRET': '#7c3aed',
  'TRANSPORT': '#9333ea',
  'PENALITES PORTUAIRES': '#dc2626',
  'AUTRES FRAIS': '#d97706',
  'DIVERS': '#6b7280',
};
const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', TRAITE: 'Traite',
  MOBILE_MONEY: 'Mobile Money', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money',
  WAVE: 'Wave', MOOV_MONEY: 'Moov Money', CARTE_BANCAIRE: 'Carte bancaire', COMPENSATION: 'Compensation',
};
const CI_FLAG = (
  <span className="inline-flex ml-1.5 align-middle shadow-[0_0_0_1px_#e3ddee] rounded-[1px] overflow-hidden">
    <span className="w-2 h-2.5 bg-[#f77f00]" />
    <span className="w-2 h-2.5 bg-white" />
    <span className="w-2 h-2.5 bg-[#009e60]" />
  </span>
);
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function FactureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const factureId = params.id as string;

  const [facture, setFacture] = useState<any>(null);
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
  const [paiementForm, setPaiementForm] = useState({ montant: '', modePaiement: 'ESPECES', reference: '', banque: '', compte: '' });

  const load = useCallback(async () => {
    try {
      const [fRes, catRes] = await Promise.all([
        facturesApi.get(factureId),
        api.get('/proformas/catalogue'),
      ]);
      setFacture(fRes.data.data);
      setCatalogue(catRes.data.data || []);
    } catch { toast.error('Facture non trouvée'); router.push('/facturation'); }
    finally { setLoading(false); }
  }, [factureId, router]);

  useEffect(() => { load(); }, [load]);

  const buildDocData = useCallback((): DocData | null => {
    if (!facture) return null;
    const d = facture.dossier;
    return {
      type: 'FACTURE',
      numero: facture.numero,
      date: new Date(facture.dateFacture).toLocaleDateString('fr-FR'),
      client: facture.client?.raisonSociale || '',
      clientAdresse: facture.client?.adresse || undefined,
      clientTelephone: facture.client?.telephone || facture.client?.mobile || undefined,
      clientEmail: facture.client?.email || undefined,
      clientNcc: facture.client?.ncc || undefined,
      clientPays: facture.client?.pays || undefined,
      dossierNumero: d?.numero,
      titre: facture.titre,
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
    if (!confirm('Valider cette facture ? Elle ne pourra plus être modifiée.')) return;
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
  const categories = [...new Set(lignes.map((l: any) => l.categorie))].filter(Boolean) as string[];
  const groupedLignes = categories.map(cat => ({
    categorie: cat,
    lignes: lignes.filter((l: any) => l.categorie === cat),
    sousTotal: lignes.filter((l: any) => l.categorie === cat).reduce((s: number, l: any) => s + Number(l.prixUnitaire || 0), 0),
  }));

  const d = facture.dossier;

  const detailsRows = [
    ['N° Facture', facture.numero, true],
    ['Date', new Date(facture.dateFacture).toLocaleDateString('fr-FR'), false],
    ['Réf. Dossier', d?.numero, false],
  ].filter(([, v]) => v);

  const clientInfoRows = [
    ['Nom', facture.client?.raisonSociale, true],
    ['Adresse', facture.client?.adresse, false],
    ['Téléphone', facture.client?.telephone || facture.client?.mobile, false],
    ['Email', facture.client?.email, false],
    ['N° Contribuable', facture.client?.ncc, false],
    ['Pays', facture.client?.pays, false],
  ].filter(([, v]) => v);

  const isPaysCI = (facture.client?.pays || '').toLowerCase().includes('ivoire');

  let globalIndex = 0;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-primary-700 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/facturation')} className="p-2 rounded-lg hover:bg-primary-600 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Fiche Facture</h1>
              <p className="text-primary-100 text-xs">{facture.numero} — {facture.statut}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isBrouillon && (
              <button onClick={handleValiderFacture} disabled={validating} className="px-4 py-2 bg-white text-primary-700 rounded-lg font-semibold text-sm hover:bg-primary-50 disabled:opacity-50 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {validating ? 'Validation...' : 'Valider'}
              </button>
            )}
            <button onClick={handleDownloadPDF} className="px-4 py-2 bg-white text-primary-700 rounded-lg font-semibold text-sm hover:bg-primary-50 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              PDF
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-primary-800 text-white rounded-lg font-semibold text-sm hover:bg-primary-900">Imprimer</button>
            {facture.statut !== 'ANNULEE' && facture.statut !== 'PAYEE' && Number(facture.resteAPayer) > 0 && (
              <button onClick={openPaiementModal} className="px-4 py-2 bg-accent-500 text-white rounded-lg font-semibold text-sm hover:bg-accent-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Enregistrer un paiement
              </button>
            )}
            <button onClick={() => router.push('/facturation')} className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600">Fermer</button>
          </div>
        </div>

        {/* Aperçu état */}
        <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-100 dark:border-surface-700 shadow-card overflow-hidden">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-[11px] bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0"><span className="font-extrabold text-white text-sm">GB</span></div>
                <div>
                  <p className="font-display font-extrabold text-lg tracking-tight text-gray-900 dark:text-white">GBTRANS SARL</p>
                  <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold mt-0.5">Transit • Douane • Logistique</p>
                  <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed space-y-0.5">
                    <p>Cocody Angré 7ème Tranche, Abidjan — Côte d&apos;Ivoire</p>
                    <p>+225 27 20 00 00 00 &nbsp;·&nbsp; contact@gbtrans.ci</p>
                  </div>
                </div>
              </div>
              <div className="min-w-[220px] text-right">
                <span className="inline-block w-full text-center font-display text-sm font-extrabold text-gray-900 dark:text-white bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-md px-4 py-2 tracking-wide">FACTURE</span>
                {qrDataUrl && (
                  <div className="flex justify-end mt-2">
                    <div className="text-center">
                      <img src={qrDataUrl} alt="QR code de vérification" className="w-16 h-16 border border-surface-200 dark:border-surface-600 rounded-md p-0.5 bg-white" />
                      <p className="text-[7.5px] text-gray-400 dark:text-gray-500 mt-1">Vérifier le document</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DÉTAILS / CLIENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden">
                <div className="bg-surface-50 dark:bg-surface-700 text-gray-900 dark:text-white text-[11px] font-extrabold px-3 py-1.5 tracking-wide border-b border-surface-100 dark:border-surface-700">DÉTAILS DE LA FACTURE</div>
                <table className="w-full text-[11px]">
                  <tbody>
                    {detailsRows.map(([label, value, hl]) => (
                      <tr key={label as string}><td className="px-3 py-1 text-gray-500 dark:text-gray-400 w-2/5">{label}</td><td className={`px-3 py-1 font-semibold ${hl ? 'font-mono font-bold text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>{value}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden">
                <div className="bg-surface-50 dark:bg-surface-700 text-gray-900 dark:text-white text-[11px] font-extrabold px-3 py-1.5 tracking-wide border-b border-surface-100 dark:border-surface-700">CLIENT</div>
                <table className="w-full text-[11px]">
                  <tbody>
                    {clientInfoRows.map(([label, value]) => (
                      <tr key={label as string}>
                        <td className="px-3 py-1 text-gray-500 dark:text-gray-400 w-[34%]">{label}</td>
                        <td className="px-3 py-1 font-semibold text-gray-900 dark:text-white">
                          {value}{label === 'Pays' && isPaysCI ? CI_FLAG : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {facture.titre && <div className="bg-surface-50 dark:bg-surface-700 border-l-[3px] border-primary-700 rounded-r-lg px-4 py-2.5 font-bold text-sm uppercase tracking-wide text-gray-900 dark:text-white">{facture.titre}</div>}

            {/* Toolbar */}
            {isBrouillon && (
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => setShowCatalogue(true)} className="px-3 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Ajouter
                </button>
                <span className="text-xs text-gray-400">Facture en brouillon — vous pouvez ajouter ou supprimer des lignes</span>
              </div>
            )}

            {/* Tableau lignes */}
            <div className="border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-700 text-[10px] text-gray-900 dark:text-white">
                    <th className="px-2 py-2 text-center tracking-wide w-8">N°</th>
                    <th className="px-2 py-2 text-left tracking-wide">DÉSIGNATION</th>
                    <th className="px-2 py-2 text-center tracking-wide w-14">QTÉ</th>
                    <th className="px-2 py-2 text-right tracking-wide w-28">PU (XOF)</th>
                    <th className="px-2 py-2 text-right w-32 tracking-wide">MONTANT HT</th>
                    {isBrouillon && <th className="px-2 py-2 w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {groupedLignes.map(group => (
                    <Fragment key={group.categorie}>
                      <tr className="bg-surface-50 dark:bg-surface-700/60 border-t border-surface-100 dark:border-surface-700">
                        <td colSpan={isBrouillon ? 6 : 5} className="px-2 py-1.5 font-bold text-[10px] tracking-wide text-gray-900 dark:text-white">{group.categorie}</td>
                      </tr>
                      {group.lignes.map((l: any) => { globalIndex++; return (
                        <tr key={l.id} className="border-t border-surface-100 dark:border-surface-700">
                          <td className="px-2 py-1.5 text-[10px] text-center text-gray-400 dark:text-gray-500">{globalIndex}</td>
                          <td className="px-2 py-1.5 text-[11px] text-gray-700 dark:text-gray-300">{l.designation}</td>
                          <td className="px-2 py-1.5 text-center font-mono text-[11px] text-gray-500 dark:text-gray-400">{Number(l.quantite || 1)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-gray-900 dark:text-white">
                            {isBrouillon ? (
                              <input type="number" defaultValue={Number(l.prixUnitaire)} onBlur={e => handleUpdateMontant(l.id, parseFloat(e.target.value) || 0, l.designation, l.categorie, l.estTVA)} className="w-20 bg-transparent border-0 outline-none text-right font-mono font-semibold text-[11px]" />
                            ) : fmt(l.prixUnitaire)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-gray-900 dark:text-white">{fmt(l.prixUnitaire)}</td>
                          {isBrouillon && (
                            <td className="px-2 py-1.5 text-center">
                              <button onClick={() => handleDeleteLigne(l.id)} className="text-red-400 hover:text-red-600">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ); })}
                      <tr className="border-t border-surface-100 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-700/40">
                        <td colSpan={isBrouillon ? 5 : 4} className="px-2 py-1.5 text-right text-[9.5px] font-extrabold text-gray-900 dark:text-white">SOUS-TOTAL {group.categorie}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-extrabold text-[11px] text-gray-900 dark:text-white">{fmt(group.sousTotal)}</td>
                        {isBrouillon && <td></td>}
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Montant en lettres + Totaux */}
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px] border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-700/40 rounded-md p-3">
                <p className="text-[10px] font-extrabold text-gray-900 dark:text-white tracking-wide">MONTANT ARRÊTÉ À LA SOMME DE :</p>
                <p className="text-sm font-bold italic mt-1 text-gray-900 dark:text-white">{montantEnLettres(Number(facture.montantTTC))}</p>
              </div>
              <table className="text-sm border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden min-w-[240px]">
                <tbody>
                  <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TOTAL HT</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.montantHT)}</td></tr>
                  {facture.montantPrestation ? <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">Montant Prestation</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.montantPrestation)}</td></tr> : null}
                  {facture.tvaPrestation ? <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TVA/Prestation</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.tvaPrestation)}</td></tr> : null}
                  <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TVA (18%)</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.montantTVA)}</td></tr>
                  <tr>
                    <td colSpan={2} className="p-0">
                      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white flex justify-between px-3 py-2 font-extrabold text-[13px]">
                        <span>NET À PAYER TTC</span><span className="font-mono">{fmt(facture.montantTTC)}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Acompte / Reste à payer */}
            <div className="flex gap-4">
              <div><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Acompte</p><div className="px-3 py-1.5 border border-surface-100 dark:border-surface-700 rounded-lg font-mono text-sm">{fmt(facture.acompte)}</div></div>
              <div><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Reste à payer</p><div className="px-3 py-1.5 border border-surface-100 dark:border-surface-700 rounded-lg font-mono text-sm font-bold text-red-600">{fmt(facture.resteAPayer)}</div></div>
            </div>

            {/* Signature */}
            <div className="flex justify-end pt-4">
              <div className="text-center w-56">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-9">Le Directeur / Cachet &amp; Signature</p>
                <div className="border-t border-gray-900 dark:border-white pt-1 font-bold text-gray-900 dark:text-white">GBTRANS SARL</div>
              </div>
            </div>
          </div>

          {/* Footer légal */}
          <div className="border-t border-surface-100 dark:border-surface-700 px-6 py-4 text-center text-[9px] text-gray-400 dark:text-gray-500 leading-relaxed">
            <p>Facture définitive. Toute réclamation doit être formulée sous 8 jours.</p>
            <p className="mt-1">GBTRANS SARL — Cocody Angré 7ème Tranche, Abidjan, Côte d&apos;Ivoire — RCCM CI-ABJ-2018-B-12345 — CC 1812345 Z — contact@gbtrans.ci</p>
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
                    const p = aff.paiement;
                    if (!p) return null;
                    return (
                      <tr key={aff.id} className="table-row">
                        <td className="table-cell text-xs" data-label="Date">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                        <td className="table-cell font-medium text-primary-600" data-label="N° Transaction">{p.numero}</td>
                        <td className="table-cell" data-label="Mode">{MODE_PAIEMENT_LABELS[p.modePaiement] || p.modePaiement}</td>
                        <td className="table-cell" data-label="Compte financier">{p.caisse?.libelle || p.compteBancaire?.libelle || '-'}</td>
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

      {/* Modal Catalogue */}
      {showCatalogue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-bold text-lg">Ajouter une prestation</h3><button onClick={() => setShowCatalogue(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="px-4 pt-3 space-y-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={searchCat} onChange={e => setSearchCat(e.target.value)} placeholder="Rechercher..." className="input-field pl-10 text-sm" autoFocus />
              </div>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setSelectedCat('')} className={`px-3 py-1 rounded-full text-xs font-medium ${!selectedCat ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>Toutes</button>
                {Object.entries(CAT_COLORS).map(([cat, color]) => (
                  <button key={cat} onClick={() => setSelectedCat(cat)} className={`px-3 py-1 rounded-full text-xs font-medium ${selectedCat === cat ? 'text-white' : 'bg-gray-100'}`} style={selectedCat === cat ? { backgroundColor: color } : { color }}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {catalogue.filter(p => (!selectedCat || p.categorie === selectedCat) && (!searchCat || p.designation.toLowerCase().includes(searchCat.toLowerCase()) || p.code.toLowerCase().includes(searchCat.toLowerCase()))).map(p => {
                const exists = lignes.some((l: any) => l.codePrestation === p.code);
                return (
                  <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${exists ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 hover:border-primary-300'}`}>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold text-white min-w-[40px] text-center" style={{ backgroundColor: CAT_COLORS[p.categorie] || '#6B7280' }}>{p.code}</span>
                      <div><p className="text-sm font-medium">{p.designation}</p><p className="text-[10px] text-gray-400">{p.categorie}{p.montantDefaut ? ` • ${fmt(Number(p.montantDefaut))} F` : ''}</p></div>
                    </div>
                    {exists ? <span className="text-green-600 text-xs">Ajouté</span> : (
                      <button onClick={() => handleAddLigne(p)} className="px-3 py-1 bg-primary-500 text-white rounded text-xs hover:bg-primary-600">+ Ajouter</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setShowCatalogue(false)} className="btn-primary">Fermer</button></div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Montant *</label><input type="number" value={paiementForm.montant} onChange={e => setPaiementForm({ ...paiementForm, montant: e.target.value })} className="input-field" max={Number(facture.resteAPayer)} required /></div>
                <div><label className="label">Mode de paiement</label>
                  <select value={paiementForm.modePaiement} onChange={e => setPaiementForm({ ...paiementForm, modePaiement: e.target.value })} className="input-field">
                    {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Compte de destination *</label>
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
