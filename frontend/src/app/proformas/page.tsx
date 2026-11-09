'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, Tiers, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import BoutonIcone, { IconeModifier, IconeSupprimer, IconeTelecharger } from '@/components/tables/BoutonIcone';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { downloadPDF } from '@/lib/generatePDF';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  ACCEPTEE: 'badge-success', TRANSFORMEE: 'badge-success', EXPIREE: 'badge-danger', ANNULEE: 'badge-danger',
};

const statutLibelle: Record<string, string> = {
  BROUILLON: 'Brouillon', VALIDEE: 'Validée', ENVOYEE: 'Envoyée', ACCEPTEE: 'Acceptée', TRANSFORMEE: 'Transformée', EXPIREE: 'Expirée', ANNULEE: 'Annulée',
};
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
const fmt = (n: any) => n ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

export default function ProformasPage() {
  const router = useRouter();
  const [proformas, setProformas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const setPageSize = (n: number) => { setPageSizeState(n); setPage(1); };

  const load = useCallback(() => {
    setLoading(true);
    api.get('/proformas', { params: { page, limit: pageSize } }).then(r => { setProformas(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (p: any) => {
    if (p.statut !== 'BROUILLON') {
      toast.error('Seule une proforma en brouillon peut être supprimée');
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
        client: p.client?.raisonSociale || '', dossierNumero: p.dossier?.numeroPhysique || p.dossier?.numero, titre: p.titre,
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

  const actions = (p: any) => (
    <>
      <BoutonIcone titre="Télécharger le PDF" onClick={() => handleDownload(p.id)}><IconeTelecharger /></BoutonIcone>
      {p.statut === 'BROUILLON' && <BoutonIcone titre="Modifier" ton="primaire" onClick={() => router.push(`/proformas/${p.id}/edit`)}><IconeModifier /></BoutonIcone>}
      {p.statut === 'BROUILLON' && <BoutonIcone titre="Supprimer" ton="danger" onClick={() => handleDelete(p)}><IconeSupprimer /></BoutonIcone>}
    </>
  );

  const colonnes: Colonne<any>[] = [
    { cle: 'numero', libelle: 'Proforma', rendu: p => <DoubleLigne mono haut={p.numero} bas={`${fmtDate(p.dateProforma)}${p.titre ? ' · ' + p.titre : ''}`} />, texte: p => p.numero },
    { cle: 'client', libelle: 'Client', rendu: p => <Tiers nom={p.client?.raisonSociale} detail={p.dossier ? `Dossier ${p.dossier.numeroPhysique || p.dossier.numero}` : undefined} />, texte: p => p.client?.raisonSociale || '' },
    { cle: 'ht', libelle: 'Total HT', align: 'right', masquerSous: '2xl', rendu: p => <Montant valeur={p.montantHT} />, texte: p => String(p.montantHT) },
    { cle: 'tva', libelle: 'TVA', align: 'right', masquerSous: '2xl', rendu: p => <Montant valeur={p.montantTVA} />, texte: p => String(p.montantTVA) },
    { cle: 'ttc', libelle: 'Total TTC', align: 'right', rendu: p => <Montant valeur={p.montantTTC} />, texte: p => String(p.montantTTC) },
    { cle: 'statut', libelle: 'Statut', rendu: p => <StatutPastille libelle={statutLibelle[p.statut] || p.statut} ton={tonDepuisBadge(statutColors[p.statut])} />, texte: p => statutLibelle[p.statut] || p.statut },
  ];

  const vide = <EmptyState titre="Aucune proforma" description="Créez votre première proforma." action={<Link href="/proformas/nouveau" className="btn-primary">Nouvelle proforma</Link>} />;

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          titre="Proformas"
          sousTitre={`${total} proforma(s)`}
          actions={
            <Link href="/proformas/nouveau" className="btn-primary">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouvelle proforma
            </Link>
          }
        />

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={proformas}
            cleLigne={(p) => p.id}
            onClicLigne={(p) => router.push(`/proformas/${p.id}`)}
            chargement={loading}
            nomExport="proformas"
            actionsToujoursVisibles
            actions={actions}
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="card !p-0 animate-pulse h-24" />)
          ) : proformas.length === 0 ? (
            <div className="card">{vide}</div>
          ) : proformas.map(p => (
            <div key={p.id} className="card !p-0 overflow-hidden">
              <button type="button" onClick={() => router.push(`/proformas/${p.id}`)} className="w-full text-left px-4 pt-3 pb-2 flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-primary-600 dark:text-primary-300 truncate">{p.numero}</span>
                  <StatutPastille libelle={statutLibelle[p.statut] || p.statut} ton={tonDepuisBadge(statutColors[p.statut])} />
                </span>
                <span className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-gray-800 dark:text-gray-100 truncate">{p.client?.raisonSociale || '—'}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(p.montantTTC)} F</span>
                </span>
                <span className="text-xs text-gray-500 truncate">{fmtDate(p.dateProforma)}{p.titre ? ` · ${p.titre}` : ''}{p.dossier ? ` · ${p.dossier.numeroPhysique || p.dossier.numero}` : ''}</span>
              </button>
              <div className="flex items-center justify-end gap-2 px-4 pb-3">{actions(p)}</div>
            </div>
          ))}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} /></div>
        </div>
      </div>
    </AppLayout>
  );
}
