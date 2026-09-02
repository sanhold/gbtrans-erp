'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { offresApi } from '@/lib/api';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', ENVOYEE: 'badge-info', ACCEPTEE: 'badge-success',
  REFUSEE: 'badge-danger', EXPIREE: 'badge-danger', TRANSFORMEE: 'badge-success', ANNULEE: 'badge-danger',
};
const statutLabels: Record<string, string> = {
  BROUILLON: 'Brouillon', ENVOYEE: 'Envoyée', ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée', EXPIREE: 'Expirée', TRANSFORMEE: 'Transformée', ANNULEE: 'Annulée',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function OffreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [offre, setOffre] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await offresApi.get(params.id as string);
      setOffre(res.data.data);
    } catch { toast.error('Offre non trouvée'); router.push('/offres'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { load(); }, [load]);

  const handleChangerStatut = async (statut: string) => {
    setBusy(true);
    try {
      const res = await offresApi.changerStatut(params.id as string, statut);
      setOffre(res.data.data);
      toast.success(res.data.message);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const handleTransformer = async () => {
    if (!confirm('Transformer cette offre en proforma ?')) return;
    setBusy(true);
    try {
      const res = await offresApi.transformerProforma(params.id as string);
      toast.success(res.data.message);
      router.push(`/proformas/${res.data.data.id}`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); setBusy(false); }
  };

  const handleDelete = async () => {
    if (offre.proformaId) { toast.error('Impossible de supprimer : déjà transformée'); return; }
    if (!confirm(`Supprimer définitivement l'offre ${offre.numero} ?`)) return;
    try { await offresApi.delete(params.id as string); toast.success('Offre supprimée'); router.push('/offres'); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div></AppLayout>;
  if (!offre) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link href="/offres" className="text-sm text-primary-600 hover:underline mb-2 inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Offres
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              {offre.numero}
              <span className={`badge ${statutColors[offre.statut] || 'badge-gray'}`}>{statutLabels[offre.statut] || offre.statut}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">{offre.client?.raisonSociale} {offre.dossier && <>— Dossier <Link href={`/dossiers/${offre.dossier.id}`} className="text-primary-600 hover:underline">{offre.dossier.numero}</Link></>}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {offre.statut === 'BROUILLON' && <button disabled={busy} onClick={() => handleChangerStatut('ENVOYEE')} className="btn-secondary">Marquer envoyée</button>}
            {offre.statut === 'ENVOYEE' && <button disabled={busy} onClick={() => handleChangerStatut('ACCEPTEE')} className="btn-success">Marquer acceptée</button>}
            {offre.statut === 'ENVOYEE' && <button disabled={busy} onClick={() => handleChangerStatut('REFUSEE')} className="btn-danger">Marquer refusée</button>}
            {offre.statut === 'ACCEPTEE' && !offre.proformaId && <button disabled={busy} onClick={handleTransformer} className="btn-primary">Transformer en proforma</button>}
            {offre.statut !== 'TRANSFORMEE' && <button onClick={handleDelete} className="btn-secondary !text-red-600">Supprimer</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Lignes de prestations</h3>
              <div className="table-container !shadow-none !border-0">
                <table className="w-full">
                  <thead><tr><th className="table-header">Désignation</th><th className="table-header text-right">Qté</th><th className="table-header text-right">Prix unit.</th><th className="table-header text-right">TVA</th><th className="table-header text-right">Montant HT</th></tr></thead>
                  <tbody>
                    {(offre.lignes || []).map((l: any) => (
                      <tr key={l.id} className="table-row">
                        <td className="table-cell" data-label="Désignation">{l.designation}</td>
                        <td className="table-cell text-right" data-label="Qté">{fmt(l.quantite)} {l.unite}</td>
                        <td className="table-cell text-right font-mono" data-label="Prix unit.">{fmt(l.prixUnitaire)}</td>
                        <td className="table-cell text-right" data-label="TVA">{fmt(l.tauxTVA)}%</td>
                        <td className="table-cell text-right font-mono font-medium" data-label="Montant HT">{fmt(l.montantHT)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total HT</span><span className="font-mono">{fmt(offre.montantHT)} XOF</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">TVA</span><span className="font-mono">{fmt(offre.montantTVA)} XOF</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">Total TTC</span><span className="font-mono font-bold text-primary-600">{fmt(offre.montantTTC)} XOF</span></div>
                </div>
              </div>
            </div>

            {(offre.description || offre.conditions || offre.observations) && (
              <div className="card space-y-3">
                {offre.description && <div><h4 className="text-sm font-semibold text-gray-500 mb-1">Description</h4><p className="text-sm whitespace-pre-wrap">{offre.description}</p></div>}
                {offre.conditions && <div><h4 className="text-sm font-semibold text-gray-500 mb-1">Conditions</h4><p className="text-sm whitespace-pre-wrap">{offre.conditions}</p></div>}
                {offre.observations && <div><h4 className="text-sm font-semibold text-gray-500 mb-1">Observations</h4><p className="text-sm whitespace-pre-wrap">{offre.observations}</p></div>}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Informations</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Objet</dt><dd className="text-right max-w-[60%]">{offre.objet}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Date de l'offre</dt><dd>{new Date(offre.dateOffre).toLocaleDateString('fr-FR')}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Validité</dt><dd>{new Date(offre.dateValidite).toLocaleDateString('fr-FR')}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Version</dt><dd>v{offre.version}</dd></div>
              </dl>
            </div>
            {offre.proformaId && (
              <div className="card">
                <p className="text-sm text-gray-500 mb-2">Proforma générée</p>
                <Link href={`/proformas/${offre.proformaId}`} className="btn-secondary w-full justify-center">Voir la proforma →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
