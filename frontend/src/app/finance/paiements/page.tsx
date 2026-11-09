'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import TablePagination from '@/components/tables/TablePagination';
import DataTable, { type Colonne } from '@/components/tables/DataTable';
import { DoubleLigne, Tiers, StatutPastille } from '@/components/tables/cellules';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import FicheDetail from '@/components/ui/FicheDetail';
import { financeApi } from '@/lib/api';
import { fmt, MODE_PAIEMENT_LABELS } from '@/lib/financeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    financeApi.paiements.list({ page, limit: pageSize })
      .then(r => { setPaiements(r.data.data || []); setTotal(r.data.pagination?.total || 0); })
      .catch(() => setPaiements([]))
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const factures = (p: any) => (p.affectations || []).map((a: any) => a.facture?.numero).filter(Boolean).join(', ');
  const statut = (p: any): { libelle: string; ton: 'success' | 'gray' } => p.statut === 'VALIDE' ? { libelle: 'Validé', ton: 'success' } : { libelle: p.statut === 'ANNULE' ? 'Annulé' : p.statut, ton: 'gray' };

  const colonnes: Colonne<any>[] = [
    { cle: 'pai', libelle: 'Paiement', rendu: p => <DoubleLigne mono haut={p.numero} bas={fmtDate(p.datePaiement)} />, texte: p => p.numero },
    { cle: 'client', libelle: 'Client', rendu: p => <Tiers nom={p.client?.raisonSociale} />, texte: p => p.client?.raisonSociale || '' },
    { cle: 'mode', libelle: 'Mode', rendu: p => <StatutPastille libelle={MODE_PAIEMENT_LABELS[p.modePaiement] || p.modePaiement} ton="info" />, texte: p => MODE_PAIEMENT_LABELS[p.modePaiement] || p.modePaiement },
    { cle: 'factures', libelle: 'Facture(s)', masquerSous: 'xl', mono: true, rendu: p => factures(p) || '—', texte: p => factures(p) },
    { cle: 'montant', libelle: 'Montant', align: 'right', rendu: p => <span className="tabular-nums font-semibold text-emerald-600">+{fmt(p.montant)} <span className="text-[11px] font-normal text-gray-400">F</span></span>, texte: p => String(p.montant) },
    { cle: 'statut', libelle: 'Statut', rendu: p => { const st = statut(p); return <StatutPastille libelle={st.libelle} ton={st.ton} />; }, texte: p => statut(p).libelle },
  ];

  const vide = <EmptyState titre="Aucun paiement" description="Les paiements enregistrés depuis les factures apparaîtront ici." />;

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader titre="Paiements" sousTitre="Historique des paiements clients" sousTitreMasqueMobile />

        <div className="card !py-3 !px-4 bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800 text-sm text-primary-800 dark:text-primary-300">
          Les paiements sont enregistrés depuis la fiche facture (bouton « Enregistrer un paiement »). <Link href="/facturation" className="font-semibold underline">Aller à la Facturation</Link>
        </div>

        <div className="hidden lg:block">
          <DataTable
            colonnes={colonnes}
            lignes={paiements}
            cleLigne={(p) => p.id}
            onClicLigne={setDetail}
            chargement={loading}
            nomExport="paiements"
            pied={<TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} />}
            vide={vide}
          />
        </div>

        <div className="lg:hidden space-y-2">
          {loading ? (
            [0, 1, 2, 3].map(i => <div key={i} className="card !p-0 animate-pulse h-16" />)
          ) : paiements.length === 0 ? (
            <div className="card">{vide}</div>
          ) : paiements.map(p => (
            <button key={p.id} type="button" onClick={() => setDetail(p)} className="card !p-3 w-full text-left flex items-center gap-3 active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              <span aria-hidden="true" className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 7v10H7" /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[14px] text-gray-900 dark:text-white">{p.client?.raisonSociale || '—'}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{MODE_PAIEMENT_LABELS[p.modePaiement] || p.modePaiement}</span>
                  <span className="truncate">{fmtDate(p.datePaiement)}{factures(p) ? ` · ${factures(p)}` : ''}</span>
                </span>
              </span>
              <span className="flex-shrink-0 text-right font-mono font-bold tabular-nums text-[14px] text-emerald-600">+{fmt(p.montant)}<span className="block text-[10px] font-normal text-gray-400">F CFA</span></span>
            </button>
          ))}
          <div className="card !p-0 overflow-hidden"><PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} /></div>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.client?.raisonSociale || 'Paiement'} description={detail ? `${detail.numero} · ${fmtDate(detail.datePaiement)}` : undefined}>
        {detail && (
          <FicheDetail
            mise={{ libelle: 'Montant encaissé', valeur: `+${fmt(detail.montant)} F`, ton: 'positif' }}
            lignes={[
              ['Mode de paiement', MODE_PAIEMENT_LABELS[detail.modePaiement] || detail.modePaiement],
              ['Facture(s)', factures(detail)],
              ['Référence', detail.reference],
              ['Observations', detail.observations],
              ['Statut', statut(detail).libelle],
            ]}
          />
        )}
      </Modal>
    </AppLayout>
  );
}
