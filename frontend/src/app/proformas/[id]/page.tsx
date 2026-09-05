'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { montantEnLettres } from '@/lib/montantEnLettres';
import { downloadPDF, printDocument, type DocData } from '@/lib/generatePDF';
import { useAuthStore } from '@/stores/authStore';

const CI_FLAG = (
  <span className="inline-flex ml-1.5 align-middle shadow-[0_0_0_1px_#dbe2e8] rounded-[1px] overflow-hidden">
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
  const [branding, setBranding] = useState<any>(null);
  const { hasPermission } = useAuthStore();
  const canImprimer = hasPermission('PROFORMAS:IMPRIMER');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/proformas/${params.id}`);
      setProforma(res.data.data);
    } catch { toast.error('Proforma non trouvée'); router.push('/proformas'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/parametres/societe').then(r => setBranding(r.data.data)).catch(() => {}); }, []);

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
      dossierNumero: d?.numeroPhysique || d?.numero,
      titre: proforma.titre,
      afficherSignature: !!proforma.afficherSignature,
      fobUnitaire: proforma.fobUnitaire ? Number(proforma.fobUnitaire) : undefined,
      fretUnitaire: proforma.fretUnitaire ? Number(proforma.fretUnitaire) : undefined,
      assurance: proforma.assurance ? Number(proforma.assurance) : undefined,
      fraisDivers: proforma.fraisDivers ? Number(proforma.fraisDivers) : undefined,
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
        estTVA: !!l.estTVA,
      })),
    };
  }, [proforma]);


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
    if (!canImprimer) { toast.error('Vous n\'avez pas la permission d\'imprimer/télécharger ce document'); return; }
    const data = buildDocData();
    if (!data) return;
    downloadPDF(data);
    toast.success('PDF téléchargé');
  };

  const handlePrint = async () => {
    if (!canImprimer) { toast.error('Vous n\'avez pas la permission d\'imprimer/télécharger ce document'); return; }
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

  const brand = {
    nom: branding?.raisonSociale || 'GBTRANS SARL',
    slogan: branding?.slogan || 'Transit · Douane · Logistique',
    adresse: branding?.adresse || "Cocody Angré 7ème Tranche, Abidjan — Côte d'Ivoire",
    telephone: branding?.telephone || branding?.mobile || '+225 27 20 00 00 00',
    email: branding?.email || 'contact@gbtrans.ci',
    rccm: branding?.rccm || 'CI-ABJ-2018-B-12345',
    ncc: branding?.ncc || '1812345 Z',
    ville: branding?.ville || 'Abidjan',
  };

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
            <button onClick={handleDownloadPDF} disabled={!canImprimer} title={!canImprimer ? 'Permission requise : PROFORMAS:IMPRIMER' : undefined} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Télécharger PDF
            </button>
            <button onClick={handlePrint} disabled={!canImprimer} title={!canImprimer ? 'Permission requise : PROFORMAS:IMPRIMER' : undefined} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">
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

        {/* Aperçu — rendu papier */}
        <div className="pv-sheet-wrap">
          <div className="pv-sheet">
            {/* Header */}
            <div className="pv-head">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {branding?.logo && <img src={branding.logo} alt={brand.nom} style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />}
                <div>
                  <p className="pv-company-name">{brand.nom}</p>
                  <p className="pv-company-sub">{brand.slogan}</p>
                  <div className="pv-company-addr">
                    <p>{brand.adresse}</p>
                    <p>{brand.telephone} &nbsp;·&nbsp; {brand.email}</p>
                  </div>
                </div>
              </div>
              <div className="pv-title-block">
                <p className="pv-doc-label">FACTURE PROFORMA</p>
                <p className="pv-doc-num">N° <strong>{proforma.numero}</strong></p>
                {d?.numero && <p className="pv-doc-num">Dossier : <strong>{d.numeroPhysique || d.numero}</strong></p>}
                <p className="pv-doc-num">Date : {new Date(proforma.dateProforma).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            {/* FOB/FRET + CLIENT */}
            <div className="pv-meta-grid">
              {(proforma.fobUnitaire || proforma.fretUnitaire || proforma.assurance || proforma.valeurCAF) ? (
                <div className="pv-fob-block">
                  <table className="pv-fob-table">
                    <tbody>
                      <tr>
                        <td>FOB (Unitaire)</td><td className="pv-num">{fmt(proforma.fobUnitaire)}</td>
                        <td>Frais divers</td><td className="pv-num">{fmt(proforma.fraisDivers)}</td>
                      </tr>
                      <tr>
                        <td>FRET (Unitaire)</td><td className="pv-num">{fmt(proforma.fretUnitaire)}</td>
                        <td>Nbre unités</td><td className="pv-num">{proforma.nombreUnites || 1}</td>
                      </tr>
                      <tr>
                        <td>Assurance</td><td className="pv-num">{fmt(proforma.assurance)}</td>
                        <td className="pv-fob-strong">Valeur CAF</td><td className="pv-num pv-fob-strong">{fmt(proforma.valeurCAF)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="pv-meta-block">
                <p className="pv-meta-k">Adressée à</p>
                {clientInfoRows.map(([label, value]) => (
                  <p key={label as string} className={label === 'Nom' ? 'pv-meta-v pv-meta-strong' : 'pv-meta-v'}>
                    {value}{label === 'Pays' && isPaysCI ? CI_FLAG : null}
                  </p>
                ))}
                <p className="pv-meta-dim">Offre valable 30 jours à compter de la date d&apos;émission.</p>
              </div>
            </div>

            {proforma.titre && <div className="pv-titre">{proforma.titre}</div>}

            {/* Sections par catégorie */}
            <table className="pv-items">
              <thead>
                <tr>
                  <th className="pv-numcol">N°</th>
                  <th>Désignation</th>
                  <th className="pv-num pv-montantcol">Montant</th>
                </tr>
              </thead>
              {groupedLignes.map(group => (
                <tbody key={group.categorie}>
                  <tr><td colSpan={3} className="pv-section-head">{group.categorie}</td></tr>
                  {group.lignes.map((l: any) => {
                    globalIndex++;
                    return (
                      <tr key={l.id}>
                        <td className="pv-numcol">{globalIndex}</td>
                        <td>{l.designation}{l.estTVA && <span className="pv-tva-badge">TVA</span>}</td>
                        <td className="pv-num">{Number(l.prixUnitaire) > 0 ? fmt(l.prixUnitaire) : ''}</td>
                      </tr>
                    );
                  })}
                  <tr className="pv-subtotal-row">
                    <td colSpan={2}>Sous-total {group.categorie}</td>
                    <td className="pv-num">{fmt(group.sousTotal)}</td>
                  </tr>
                </tbody>
              ))}
            </table>

            {/* Totaux */}
            <div className="pv-bottom-row">
              <div className="pv-lettres">
                <p className="pv-meta-k">Arrêtée à la présente facture à la somme de :</p>
                <p className="pv-lettres-text">{montantEnLettres(totalTTC)}</p>
              </div>
              <table className="pv-totals-table">
                <tbody>
                  <tr><td>TOTAL HT</td><td className="pv-num">{fmt(totalHT)}</td></tr>
                  <tr><td>TOTAL TVA</td><td className="pv-num">{fmt(totalTVA)}</td></tr>
                  <tr className="pv-grand"><td>TOTAL TTC</td><td className="pv-num">{fmt(totalTTC)}</td></tr>
                </tbody>
              </table>
            </div>

            {proforma.afficherSignature && (
              <div className="pv-signature-row">
                <div className="pv-signature-box">
                  {branding?.signature ? <img src={branding.signature} alt="Signature" className="pv-signature-img" /> : <div className="pv-signature-placeholder" />}
                  <div className="pv-signature-label">Le Responsable</div>
                </div>
              </div>
            )}

            {proforma.observations && (
              <div className="pv-obs"><p className="pv-meta-k">Observations</p><p className="pv-obs-text">{proforma.observations}</p></div>
            )}

            {/* Footer légal */}
            <div className="pv-footer">
              <p>{branding?.mentionLegale || `Facture proforma — non valable pour dédouanement. Établie sous réserve d'acceptation. Règlement par virement bancaire à l'ordre de ${brand.nom}.`}</p>
              <p className="mt-1">{brand.nom} — {brand.adresse} — RCCM {brand.rccm} — CC {brand.ncc} — {brand.email}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .pv-sheet-wrap { --pv-ink:#16232e; --pv-ink-soft:#56626f; --pv-gold:#e8821e; --pv-gold-soft:#fdf1e3; --pv-paper:#FFFFFF; --pv-line:#dbe2e8; --pv-dim:#93a1ab;
          background:#0a1622; padding:28px 20px; border-radius:14px; display:flex; justify-content:center; overflow-x:auto; }
        .pv-sheet { width:100%; max-width:210mm; background:var(--pv-paper); color:var(--pv-ink); padding:26px 28px; font-family:'Segoe UI',Arial,sans-serif; box-shadow:0 16px 40px rgba(0,0,0,.4); }
        .pv-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--pv-ink); padding-bottom:14px; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .pv-company-name { font-size:22px; font-weight:700; letter-spacing:.01em; margin:0; }
        .pv-company-sub { font-size:11.5px; color:var(--pv-ink-soft); margin:2px 0 0; }
        .pv-company-addr { font-size:10.5px; color:#5C6580; margin-top:6px; line-height:1.5; }
        .pv-company-addr p { margin:0; }
        .pv-title-block { text-align:right; }
        .pv-doc-label { font-size:20px; font-weight:700; letter-spacing:.05em; margin:0; }
        .pv-doc-num { font-size:12px; color:var(--pv-ink-soft); margin:4px 0 0; }
        .pv-doc-num strong { color:var(--pv-gold); font-family:'Courier New',monospace; }
        .pv-qr-border { border-color:var(--pv-line); border-radius:3px; }
        .pv-qr-label { font-size:7.5px; color:var(--pv-dim); margin-top:2px; }

        .pv-meta-grid { display:flex; gap:10px; margin-bottom:14px; align-items:stretch; }
        .pv-meta-block { flex:1; border:1px solid var(--pv-line); padding:9px 11px; }
        .pv-meta-k { font-size:9px; text-transform:uppercase; letter-spacing:.08em; color:var(--pv-gold); margin:0 0 6px; font-weight:700; }
        .pv-meta-v { font-size:12px; margin:1px 0; }
        .pv-meta-strong { font-weight:700; }
        .pv-meta-dim { color:#8b93ad; font-size:9.5px; margin-top:4px; }

        .pv-fob-block { flex:1.2; border:1px solid var(--pv-line); padding:6px 9px; }
        .pv-fob-table { width:100%; font-size:10px; color:var(--pv-ink-soft); border-collapse:collapse; }
        .pv-fob-table td { padding:2px 4px; }
        .pv-fob-table .pv-num { text-align:right; font-weight:700; font-family:'Courier New',monospace; color:var(--pv-ink); }
        .pv-fob-strong { font-weight:700; color:var(--pv-gold) !important; }

        .pv-titre { background:var(--pv-gold-soft); padding:8px 11px; margin-bottom:14px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; border-left:3px solid var(--pv-gold); color:var(--pv-ink); }

        .pv-section-head { color:var(--pv-ink); padding:6px 10px; font-size:10px; letter-spacing:.03em; font-weight:700; text-align:left; border-top:1px solid var(--pv-line); border-bottom:1px solid var(--pv-line); }
        table.pv-items { width:100%; border-collapse:collapse; border:1px solid var(--pv-line); font-size:12px; }
        table.pv-items th { text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--pv-ink-soft); border-bottom:1px solid var(--pv-line); padding:6px; }
        table.pv-items td { padding:6px; border-bottom:1px solid var(--pv-line); vertical-align:middle; }
        .pv-numcol { width:30px; text-align:center; color:var(--pv-dim); font-size:10.5px; }
        .pv-montantcol { width:120px; }
        table.pv-items .pv-num { text-align:right; white-space:nowrap; font-family:'Courier New',monospace; font-weight:700; }
        .pv-tva-badge { font-size:7.5px; color:var(--pv-ink-soft); border:1px solid var(--pv-dim); border-radius:8px; padding:1px 6px; margin-left:6px; white-space:nowrap; }
        .pv-subtotal-row td { font-weight:700; color:var(--pv-ink); border-top:1px solid var(--pv-line); border-bottom:1px solid var(--pv-line); }
        .pv-subtotal-row td:first-child { text-align:right; font-size:10.5px; }

        .pv-bottom-row { display:flex; gap:12px; margin-top:8px; margin-bottom:16px; align-items:stretch; }
        .pv-totals-table { width:230px; border:1px solid var(--pv-line); border-collapse:collapse; font-size:12px; }
        .pv-totals-table td { padding:5px 9px; border-bottom:1px solid var(--pv-line); }
        .pv-totals-table td:first-child { color:var(--pv-ink-soft); }
        .pv-totals-table .pv-num { text-align:right; font-weight:700; font-family:'Courier New',monospace; }
        .pv-totals-table tr.pv-grand td { border-bottom:none; font-weight:800; font-size:14px; color:var(--pv-ink); padding-top:6px; padding-bottom:6px; }

        .pv-signature-row { display:flex; justify-content:flex-end; margin-top:8px; margin-bottom:16px; }
        .pv-signature-box { text-align:center; width:160px; }
        .pv-signature-img { max-width:140px; max-height:70px; object-fit:contain; }
        .pv-signature-placeholder { height:70px; }
        .pv-signature-label { border-top:1px solid var(--pv-line); padding-top:4px; font-size:9px; color:var(--pv-ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.04em; }


        .pv-lettres { flex:1; border:1px solid var(--pv-line); padding:10px 12px; }
        .pv-lettres-text { font-style:italic; font-weight:700; color:var(--pv-ink); font-size:12px; line-height:1.5; margin:2px 0 0; }

        .pv-obs { border-top:1px solid var(--pv-line); padding-top:10px; margin-bottom:12px; }
        .pv-obs-text { font-size:12px; color:var(--pv-ink-soft); margin-top:4px; }


        .pv-footer { border-top:1px solid var(--pv-line); margin-top:22px; padding-top:12px; text-align:center; font-size:9px; color:var(--pv-dim); line-height:1.6; }
      `}</style>
    </AppLayout>
  );
}
