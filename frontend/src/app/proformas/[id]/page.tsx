'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
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
        estTVA: !!l.estTVA,
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

        {/* Aperçu — rendu papier */}
        <div className="pv-sheet-wrap">
          <div className="pv-sheet">
            {/* Header */}
            <div className="pv-head">
              <div>
                <p className="pv-company-name">GBTRANS SARL</p>
                <p className="pv-company-sub">Transit · Douane · Logistique</p>
                <div className="pv-company-addr">
                  <p>Cocody Angré 7ème Tranche, Abidjan — Côte d&apos;Ivoire</p>
                  <p>+225 27 20 00 00 00 &nbsp;·&nbsp; contact@gbtrans.ci</p>
                </div>
              </div>
              <div className="pv-title-block">
                <p className="pv-doc-label">FACTURE PROFORMA</p>
                <p className="pv-doc-num">N° <strong>{proforma.numero}</strong></p>
                <p className="pv-doc-num">Date : {new Date(proforma.dateProforma).toLocaleDateString('fr-FR')}</p>
                {qrDataUrl && (
                  <div className="flex justify-end mt-2">
                    <div className="text-center">
                      <img src={qrDataUrl} alt="QR code de vérification" className="w-14 h-14 border pv-qr-border p-0.5 bg-white" />
                      <p className="pv-qr-label">Vérifier le document</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DÉTAILS / CLIENT */}
            <div className="pv-meta-grid">
              <div className="pv-meta-block">
                <p className="pv-meta-k">Adressée à</p>
                {clientInfoRows.map(([label, value]) => (
                  <p key={label as string} className={label === 'Nom' ? 'pv-meta-v pv-meta-strong' : 'pv-meta-v'}>
                    {value}{label === 'Pays' && isPaysCI ? CI_FLAG : null}
                  </p>
                ))}
              </div>
              <div className="pv-meta-block">
                <p className="pv-meta-k">Détails</p>
                {d?.numero && <p className="pv-meta-v">Dossier : <strong>{d.numero}</strong></p>}
                <p className="pv-meta-dim">Offre valable 30 jours à compter de la date d&apos;émission.</p>
              </div>
            </div>

            {proforma.titre && <div className="pv-titre">{proforma.titre}</div>}

            {/* Sections par catégorie */}
            {groupedLignes.map(group => {
              const catColor = CAT_COLORS[group.categorie] || '#7322ab';
              return (
                <div key={group.categorie} className="pv-section">
                  <div className="pv-section-head" style={{ background: catColor }}>{group.categorie}</div>
                  <table className="pv-items">
                    <thead>
                      <tr>
                        <th className="pv-numcol">N°</th>
                        <th>Désignation</th>
                        <th className="pv-num pv-montantcol">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.lignes.map((l: any) => {
                        globalIndex++;
                        return (
                          <tr key={l.id}>
                            <td className="pv-numcol">{globalIndex}</td>
                            <td>{l.designation}{l.estTVA && <span className="pv-tva-badge" style={{ borderColor: catColor, color: catColor }}>TVA</span>}</td>
                            <td className="pv-num">{Number(l.prixUnitaire) > 0 ? fmt(l.prixUnitaire) : ''}</td>
                          </tr>
                        );
                      })}
                      <tr className="pv-subtotal-row" style={{ borderBottomColor: catColor }}>
                        <td colSpan={2}>Sous-total {group.categorie}</td>
                        <td className="pv-num">{fmt(group.sousTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* Totaux */}
            <div className="pv-totals">
              <div className="pv-trow"><span>Total HT</span><span>{fmt(totalHT)}</span></div>
              <div className="pv-trow"><span>Total TVA</span><span>{fmt(totalTVA)}</span></div>
              <div className="pv-trow pv-grand"><span>Total Général</span><span>{fmt(totalTTC)}</span></div>
            </div>

            <div className="pv-hors">
              <strong>HORS :</strong> Frais de dépotage, d&apos;expertises éventuels, scanner, frais de magasinage, de dépôt douane, de surestarie, BSC, tout autre frais non défini mais induit par les opérations de dédouanement.
            </div>

            <div className="pv-lettres">
              <p className="pv-meta-k">Montant arrêté à la somme de</p>
              <p className="pv-lettres-text">{montantEnLettres(totalTTC)}</p>
            </div>

            {proforma.observations && (
              <div className="pv-obs"><p className="pv-meta-k">Observations</p><p className="pv-obs-text">{proforma.observations}</p></div>
            )}

            {/* Signature */}
            <div className="pv-sign">
              Fait à Abidjan
              <div className="pv-sign-line">GBTRANS SARL</div>
            </div>

            {/* Footer légal */}
            <div className="pv-footer">
              <p>Facture proforma — non valable pour dédouanement. Établie sous réserve d&apos;acceptation. Règlement par virement bancaire à l&apos;ordre de GBTRANS SARL.</p>
              <p className="mt-1">GBTRANS SARL — Cocody Angré 7ème Tranche, Abidjan, Côte d&apos;Ivoire — RCCM CI-ABJ-2018-B-12345 — CC 1812345 Z — contact@gbtrans.ci</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .pv-sheet-wrap { --pv-ink:#241536; --pv-ink-soft:#5d4a72; --pv-gold:#7322ab; --pv-gold-soft:#f0e6fa; --pv-paper:#FBF9F4; --pv-line:#ded2ea; --pv-dim:#9a8bb0;
          background:#0C0812; padding:28px 20px; border-radius:14px; display:flex; justify-content:center; overflow-x:auto; }
        .pv-sheet { width:100%; max-width:210mm; background:var(--pv-paper); color:var(--pv-ink); padding:26px 28px; font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif; box-shadow:0 16px 40px rgba(0,0,0,.4); }
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

        .pv-meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        .pv-meta-block { border:1px solid var(--pv-line); padding:10px 12px; }
        .pv-meta-k { font-size:9.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--pv-gold); margin:0 0 6px; font-weight:700; }
        .pv-meta-v { font-size:12.5px; margin:1px 0; }
        .pv-meta-strong { font-weight:700; }
        .pv-meta-dim { color:#8b93ad; font-size:10.5px; margin-top:4px; }

        .pv-titre { background:var(--pv-gold-soft); padding:10px 12px; margin-bottom:18px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; border-left:3px solid var(--pv-gold); color:var(--pv-ink); }

        .pv-section { margin-bottom:16px; }
        .pv-section-head { color:#fff; padding:6px 10px; font-size:11.5px; letter-spacing:.03em; font-weight:700; }
        table.pv-items { width:100%; border-collapse:collapse; font-size:12px; }
        table.pv-items th { text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--pv-ink-soft); border-bottom:1px solid var(--pv-line); padding:6px; }
        table.pv-items td { padding:6px; border-bottom:1px solid var(--pv-line); vertical-align:middle; }
        .pv-numcol { width:30px; text-align:center; color:var(--pv-dim); font-size:10.5px; }
        .pv-montantcol { width:120px; }
        table.pv-items .pv-num { text-align:right; white-space:nowrap; font-family:'Courier New',monospace; font-weight:700; }
        .pv-tva-badge { font-size:8.5px; border:1px solid; border-radius:8px; padding:0 6px; margin-left:7px; }
        .pv-subtotal-row td { font-weight:700; color:var(--pv-ink); background:rgba(174,124,31,.06); border-bottom:2px solid; }
        .pv-subtotal-row td:first-child { text-align:right; font-size:10.5px; }

        .pv-totals { margin-left:auto; width:270px; margin-top:10px; margin-bottom:18px; }
        .pv-trow { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; border-bottom:1px solid var(--pv-line); }
        .pv-trow.pv-grand { border-bottom:none; border-top:2px solid var(--pv-ink); margin-top:4px; padding-top:8px; font-size:16px; font-weight:700; color:var(--pv-ink); }

        .pv-hors { font-size:10px; color:var(--pv-ink-soft); border:1px solid var(--pv-line); padding:9px 11px; background:rgba(174,124,31,.05); line-height:1.55; margin-bottom:16px; }
        .pv-hors strong { color:var(--pv-ink); }

        .pv-lettres { border:1px solid var(--pv-line); padding:10px 12px; margin-bottom:16px; }
        .pv-lettres-text { font-style:italic; font-weight:700; color:var(--pv-ink); font-size:12px; line-height:1.5; margin:2px 0 0; }

        .pv-obs { border-top:1px solid var(--pv-line); padding-top:10px; margin-bottom:12px; }
        .pv-obs-text { font-size:12px; color:var(--pv-ink-soft); margin-top:4px; }

        .pv-sign { margin-top:22px; text-align:right; font-size:12px; color:var(--pv-ink-soft); }
        .pv-sign-line { margin-top:34px; border-top:1px solid var(--pv-ink-soft); display:inline-block; padding-top:4px; width:200px; font-weight:700; color:var(--pv-ink); }

        .pv-footer { border-top:1px solid var(--pv-line); margin-top:22px; padding-top:12px; text-align:center; font-size:9px; color:var(--pv-dim); line-height:1.6; }
      `}</style>
    </AppLayout>
  );
}
