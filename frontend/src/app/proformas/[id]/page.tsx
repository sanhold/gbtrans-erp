'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { montantEnLettres } from '@/lib/montantEnLettres';
import { downloadPDF, printDocument, generateDocQrDataUrl, type DocData } from '@/lib/generatePDF';

const CI_FLAG = (
  <span className="inline-flex ml-1.5 align-middle shadow-[0_0_0_1px_#e3ddee] rounded-[1px] overflow-hidden">
    <span className="w-2 h-2.5 bg-[#f77f00]" />
    <span className="w-2 h-2.5 bg-white" />
    <span className="w-2 h-2.5 bg-[#009e60]" />
  </span>
);

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function ProformaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [proforma, setProforma] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transforming, setTransforming] = useState(false);
  const [validating, setValidating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/proformas/${params.id}`);
      setProforma(res.data.data);
    } catch { toast.error('Proforma non trouvée'); router.push('/proformas'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { load(); }, [load]);

  const buildDocData = useCallback((): DocData | null => {
    if (!proforma) return null;
    const d = proforma.dossier;
    return {
      type: 'PROFORMA',
      numero: proforma.numero,
      date: new Date(proforma.dateProforma).toLocaleDateString('fr-FR'),
      client: proforma.client?.raisonSociale || '',
      clientAdresse: proforma.client?.adresse || undefined,
      clientTelephone: proforma.client?.telephone || proforma.client?.mobile || undefined,
      clientEmail: proforma.client?.email || undefined,
      clientNcc: proforma.client?.ncc || undefined,
      clientPays: proforma.client?.pays || undefined,
      dossierNumero: d?.numero,
      titre: proforma.titre,
      fobUnitaire: proforma.fobUnitaire ? Number(proforma.fobUnitaire) : undefined,
      fretUnitaire: proforma.fretUnitaire ? Number(proforma.fretUnitaire) : undefined,
      assurance: proforma.assurance ? Number(proforma.assurance) : undefined,
      nombreUnites: proforma.nombreUnites,
      valeurCAF: proforma.valeurCAF ? Number(proforma.valeurCAF) : undefined,
      montantHT: Number(proforma.montantHT),
      montantTVA: Number(proforma.montantTVA),
      montantTTC: Number(proforma.montantTTC),
      lignes: (proforma.lignes || []).map((l: any) => ({
        categorie: l.categorie || '',
        designation: l.designation,
        quantite: Number(l.quantite || 1),
        prixUnitaire: Number(l.prixUnitaire || 0),
        montant: Number(l.prixUnitaire || 0),
      })),
    };
  }, [proforma]);

  useEffect(() => {
    const data = buildDocData();
    if (!data) return;
    generateDocQrDataUrl(data).then(setQrDataUrl).catch(() => {});
  }, [buildDocData]);

  const handleValider = async () => {
    if (!confirm('Valider cette proforma ? Elle passera en attente de facturation (aucune facture ne sera créée pour l\'instant).')) return;
    setValidating(true);
    try {
      const res = await api.patch(`/proformas/${params.id}/valider`);
      toast.success(res.data.message);
      setProforma(res.data.data);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setValidating(false); }
  };

  const handleTransformerFacture = async () => {
    if (!confirm('Transformer cette proforma en facture ?')) return;
    setTransforming(true);
    try {
      const res = await api.post(`/proformas/${params.id}/transformer-facture`);
      toast.success(res.data.message);
      router.push('/facturation');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setTransforming(false); }
  };

  const handleDelete = async () => {
    if (!proforma) return;
    if (proforma.factureId || proforma.statut === 'TRANSFORMEE') {
      toast.error('Impossible de supprimer : cette proforma a déjà été transformée en facture');
      return;
    }
    if (!confirm(`Supprimer définitivement la proforma ${proforma.numero} ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/proformas/${params.id}`);
      toast.success('Proforma supprimée');
      router.push('/proformas');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
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
  if (!proforma) return null;

  const lignes = proforma.lignes || [];
  const categories = [...new Set(lignes.map((l: any) => l.categorie))].filter(Boolean) as string[];
  const groupedLignes = categories.map(cat => ({
    categorie: cat,
    lignes: lignes.filter((l: any) => l.categorie === cat),
    sousTotal: lignes.filter((l: any) => l.categorie === cat).reduce((s: number, l: any) => s + Number(l.prixUnitaire || 0), 0),
  }));

  const totalHT = Number(proforma.montantHT);
  const totalTVA = Number(proforma.montantTVA);
  const totalTTC = Number(proforma.montantTTC);
  const d = proforma.dossier;

  const detailsRows = [
    ['N° Facture', proforma.numero, true],
    ['Date', new Date(proforma.dateProforma).toLocaleDateString('fr-FR'), false],
    ['Réf. Dossier', d?.numero, false],
  ].filter(([, v]) => v);

  const clientInfoRows = [
    ['Nom', proforma.client?.raisonSociale, true],
    ['Adresse', proforma.client?.adresse, false],
    ['Téléphone', proforma.client?.telephone || proforma.client?.mobile, false],
    ['Email', proforma.client?.email, false],
    ['N° Contribuable', proforma.client?.ncc, false],
    ['Pays', proforma.client?.pays, false],
  ].filter(([, v]) => v);

  const isPaysCI = (proforma.client?.pays || '').toLowerCase().includes('ivoire');

  let globalIndex = 0;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/proformas')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{proforma.numero}</h1>
              <p className="text-sm text-gray-500">{proforma.client?.raisonSociale} — <span className={`badge ${proforma.statut === 'TRANSFORMEE' ? 'badge-success' : proforma.statut === 'VALIDEE' ? 'badge-info' : 'badge-gray'}`}>{proforma.statut}</span></p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {proforma.statut !== 'TRANSFORMEE' && (
              <button onClick={() => router.push(`/proformas/${params.id}/edit`)} className="btn-secondary">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
            )}
            <button onClick={handleDownloadPDF} className="btn-primary">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Télécharger PDF
            </button>
            <button onClick={handlePrint} className="btn-secondary">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Imprimer
            </button>
            {proforma.statut === 'BROUILLON' && (
              <button onClick={handleValider} disabled={validating} className="btn-success disabled:opacity-50">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {validating ? 'Validation...' : 'Valider la Proforma'}
              </button>
            )}
            {proforma.statut === 'EN_ATTENTE_FACTURATION' && (
              <button onClick={handleTransformerFacture} disabled={transforming} className="btn-success disabled:opacity-50">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                {transforming ? 'Transformation...' : 'Transformer en Facture'}
              </button>
            )}
            {proforma.statut === 'TRANSFORMEE' && <span className="badge badge-success px-3 py-1.5 text-sm">Facturée</span>}
            {proforma.statut === 'EN_ATTENTE_FACTURATION' && <span className="badge badge-warning px-3 py-1.5 text-sm">En attente de facturation</span>}
            {proforma.statut !== 'TRANSFORMEE' && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Supprimer la proforma"
                className="btn-secondary !text-red-600 hover:!bg-red-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            )}
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
                <span className="inline-block w-full text-center font-display text-sm font-extrabold text-gray-900 dark:text-white bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-md px-4 py-2 tracking-wide">FACTURE PROFORMA</span>
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
                <div className="bg-surface-50 dark:bg-surface-700 text-gray-900 dark:text-white text-[11px] font-extrabold px-3 py-1.5 tracking-wide border-b border-surface-100 dark:border-surface-700">DÉTAILS DE LA PROFORMA</div>
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

            {proforma.titre && (
              <div className="bg-surface-50 dark:bg-surface-700 border-l-[3px] border-primary-700 rounded-r-lg px-4 py-2.5 font-bold text-sm uppercase tracking-wide text-gray-900 dark:text-white">{proforma.titre}</div>
            )}

            {/* Tableau */}
            <div className="border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-700 text-[10px] text-gray-900 dark:text-white">
                    <th className="px-2 py-2 text-center tracking-wide w-8">N°</th>
                    <th className="px-2 py-2 text-left tracking-wide">DÉSIGNATION</th>
                    <th className="px-2 py-2 text-center tracking-wide w-14">QTÉ</th>
                    <th className="px-2 py-2 text-right tracking-wide w-28">PU (XOF)</th>
                    <th className="px-2 py-2 text-right w-32 tracking-wide">MONTANT HT</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLignes.map(group => (
                    <Fragment key={group.categorie}>
                      <tr className="bg-surface-50 dark:bg-surface-700/60 border-t border-surface-100 dark:border-surface-700">
                        <td colSpan={5} className="px-2 py-1.5 font-bold text-[10px] tracking-wide text-gray-900 dark:text-white">{group.categorie}</td>
                      </tr>
                      {group.lignes.map((l: any) => {
                        globalIndex++;
                        return (
                          <tr key={l.id} className="border-t border-surface-100 dark:border-surface-700">
                            <td className="px-2 py-1.5 text-[10px] text-center text-gray-400 dark:text-gray-500">{globalIndex}</td>
                            <td className="px-2 py-1.5 text-[11px] text-gray-700 dark:text-gray-300">{l.designation}</td>
                            <td className="px-2 py-1.5 text-center font-mono text-[11px] text-gray-500 dark:text-gray-400">{Number(l.quantite || 1)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-[11px] text-gray-500 dark:text-gray-400">{fmt(l.prixUnitaire)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-gray-900 dark:text-white">{Number(l.prixUnitaire) > 0 ? fmt(l.prixUnitaire) : ''}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-surface-100 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-700/40">
                        <td colSpan={4} className="px-2 py-1.5 text-right text-[9.5px] font-extrabold text-gray-900 dark:text-white">SOUS-TOTAL {group.categorie}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-extrabold text-[11px] text-gray-900 dark:text-white">{fmt(group.sousTotal)}</td>
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
                <p className="text-sm font-bold italic mt-1 text-gray-900 dark:text-white">{montantEnLettres(totalTTC)}</p>
              </div>
              <table className="text-sm border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden min-w-[240px]">
                <tbody>
                  <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TOTAL HT</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(totalHT)}</td></tr>
                  <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TVA (18%)</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(totalTVA)}</td></tr>
                  <tr>
                    <td colSpan={2} className="p-0">
                      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white flex justify-between px-3 py-2 font-extrabold text-[13px]">
                        <span>NET À PAYER TTC</span><span className="font-mono">{fmt(totalTTC)}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {proforma.observations && (
              <div className="border-t border-surface-100 dark:border-surface-700 pt-3"><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Observations</p><p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{proforma.observations}</p></div>
            )}

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
            <p>Facture proforma — non valable pour dédouanement. Établie sous réserve d&apos;acceptation. Règlement par virement bancaire à l&apos;ordre de GBTRANS SARL.</p>
            <p className="mt-1">GBTRANS SARL — Cocody Angré 7ème Tranche, Abidjan, Côte d&apos;Ivoire — RCCM CI-ABJ-2018-B-12345 — CC 1812345 Z — contact@gbtrans.ci</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
