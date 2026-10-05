'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { downloadPDF, printDocument, buildProformaHtml, getSocieteBranding, type DocData, type SocieteBranding } from '@/lib/generatePDF';
import { useAuthStore } from '@/stores/authStore';

export default function ProformaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [proforma, setProforma] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transforming, setTransforming] = useState(false);
  const [validating, setValidating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [branding, setBranding] = useState<SocieteBranding | undefined>(undefined);
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
  useEffect(() => { getSocieteBranding().then(setBranding); }, []);

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

  const docData = buildDocData();

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

        {/* Aperçu — genere par exactement la meme fonction que le PDF telecharge et l'impression,
            pour garantir un rendu identique (cf. buildProformaHtml dans lib/generatePDF.ts). */}
        {docData && (
          <div className="pv-sheet-wrap">
            <div className="pv-sheet" dangerouslySetInnerHTML={{ __html: buildProformaHtml(docData, undefined, branding) }} />
          </div>
        )}
      </div>

      <style jsx global>{`
        .pv-sheet-wrap { background:#0a1622; padding:28px 20px; border-radius:14px; display:flex; justify-content:center; overflow-x:auto; }
        .pv-sheet { width:210mm; min-height:293mm; box-sizing:border-box; position:relative; background:#FFFFFF; color:#16232e;
          padding:10mm 12mm; font-family:'Segoe UI',Arial,sans-serif; font-size:11px; box-shadow:0 16px 40px rgba(0,0,0,.4); }
      `}</style>
    </AppLayout>
  );
}
