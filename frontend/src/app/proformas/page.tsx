'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import api from '@/lib/api';
import { downloadPDF } from '@/lib/generatePDF';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  ACCEPTEE: 'badge-success', TRANSFORMEE: 'badge-success', EXPIREE: 'badge-danger', ANNULEE: 'badge-danger',
};

const fmt = (n: any) => n ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function ProformasPage() {
  const router = useRouter();
  const [proformas, setProformas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { paged, page, setPage, pageSize, setPageSize, total: totalRows, totalPages } = usePagination(proformas);

  const load = () => {
    api.get('/proformas', { params: { limit: 500 } }).then(r => { setProformas(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (p: any) => {
    if (p.factureId || p.statut === 'TRANSFORMEE') {
      toast.error('Impossible de supprimer : déjà transformée en facture');
      return;
    }
    if (!confirm(`Supprimer définitivement la proforma ${p.numero} ?`)) return;
    try {
      await api.delete(`/proformas/${p.id}`);
      toast.success('Proforma supprimée');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await api.get(`/proformas/${id}`);
      const p = res.data.data;
      downloadPDF({
        type: 'PROFORMA', numero: p.numero,
        date: new Date(p.dateProforma).toLocaleDateString('fr-FR'),
        client: p.client?.raisonSociale || '', dossierNumero: p.dossier?.numero, titre: p.titre,
        fobUnitaire: p.fobUnitaire ? Number(p.fobUnitaire) : undefined,
        fretUnitaire: p.fretUnitaire ? Number(p.fretUnitaire) : undefined,
        assurance: p.assurance ? Number(p.assurance) : undefined,
        valeurCAF: p.valeurCAF ? Number(p.valeurCAF) : undefined,
        montantHT: Number(p.montantHT), montantTVA: Number(p.montantTVA), montantTTC: Number(p.montantTTC),
        lignes: (p.lignes || []).map((l: any) => ({ categorie: l.categorie || '', designation: l.designation, montant: Number(l.prixUnitaire || 0), estTVA: l.estTVA })),
      });
      toast.success('PDF téléchargé');
    } catch { toast.error('Erreur téléchargement'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proformas</h1><p className="text-sm text-gray-500">{total} proforma(s)</p></div>
          <Link href="/proformas/nouveau" className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle Proforma
          </Link>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">N° Proforma</th><th className="table-header">Client</th>
              <th className="table-header">Dossier</th><th className="table-header">Titre</th>
              <th className="table-header text-right">Total HT</th><th className="table-header text-right">TVA</th>
              <th className="table-header text-right">Total TTC</th><th className="table-header">Date</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"/>Chargement...</td></tr>
              : proformas.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-gray-500">Aucune proforma. Créez votre première proforma.</td></tr>
              : paged.map(p => (
                <tr key={p.id} className="table-row cursor-pointer" onClick={() => router.push(`/proformas/${p.id}`)}>
                  <td className="table-cell font-medium text-primary-600" data-label="N° Proforma">{p.numero}</td>
                  <td className="table-cell" data-label="Client">{p.client?.raisonSociale}</td>
                  <td className="table-cell font-mono text-xs" data-label="Dossier">{p.dossier?.numero || '-'}</td>
                  <td className="table-cell" data-label="Titre">{p.titre || '-'}</td>
                  <td className="table-cell text-right font-mono" data-label="Total HT">{fmt(p.montantHT)}</td>
                  <td className="table-cell text-right font-mono" data-label="TVA">{fmt(p.montantTVA)}</td>
                  <td className="table-cell text-right font-mono font-bold" data-label="Total TTC">{fmt(p.montantTTC)}</td>
                  <td className="table-cell text-xs" data-label="Date">{new Date(p.dateProforma).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[p.statut] || 'badge-gray'}`}>{p.statut}</span></td>
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(p.id); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Télécharger PDF">
                        <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                      {p.statut !== 'TRANSFORMEE' && (
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/proformas/${p.id}/edit`); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {p.statut !== 'TRANSFORMEE' && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={totalRows} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </AppLayout>
  );
}
