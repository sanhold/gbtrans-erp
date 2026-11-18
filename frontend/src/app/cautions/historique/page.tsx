'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Numero, Discret, Tronque, Montant } from '@/components/tables/cellules';
import { cautionsApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function CautionsHistoriquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    cautionsApi.list({ page, limit, etat: 'PAYEE' })
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page, limit]);

  useEffect(() => { load(); }, [load]);

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);
  const sommeMontant = items.reduce((s, c) => s + Number(c.montant || 0), 0);

  const numDossier = (c: any) => c.dossier ? (c.dossier.numeroPhysique || c.dossier.numero) : '—';
  const colonnes = [
    { cle: 'num', libelle: 'Id caution', texte: (c: any) => c.numero, rendu: (c: any) => <Numero>{c.numero}</Numero> },
    { cle: 'date', libelle: 'Date', texte: (c: any) => fmtDate(c.dateCaution), rendu: (c: any) => <Discret>{fmtDate(c.dateCaution)}</Discret> },
    { cle: 'dos', libelle: 'N° dossier', texte: numDossier, rendu: (c: any) => c.dossier ? <Link href={`/dossiers/${c.dossier.id}`} onClick={e => e.stopPropagation()} className="font-mono text-[12.5px] font-semibold text-azure hover:underline">{numDossier(c)}</Link> : <Discret>—</Discret> },
    { cle: 'bl', libelle: 'N° BL', masquerSous: 'xl' as const, texte: (c: any) => c.numeroBL || '', rendu: (c: any) => <Discret>{c.numeroBL || '—'}</Discret> },
    { cle: 'client', libelle: 'Client', texte: (c: any) => c.client?.raisonSociale || '', rendu: (c: any) => <Tronque texte={c.client?.raisonSociale} largeur="14rem" /> },
    { cle: 'qte', libelle: 'Qté', align: 'right' as const, masquerSous: 'xl' as const, texte: (c: any) => String(c.quantite ?? ''), rendu: (c: any) => <Discret>{c.quantite}</Discret> },
    { cle: 'mt', libelle: 'Montant', align: 'right' as const, texte: (c: any) => String(c.montant ?? ''), rendu: (c: any) => <Montant valeur={c.montant} /> },
    { cle: 'cie', libelle: 'Compagnie', masquerSous: 'xl' as const, texte: (c: any) => c.compagnie || '', rendu: (c: any) => <Tronque texte={c.compagnie} largeur="10rem" /> },
    { cle: 'pay', libelle: 'Payée le', texte: (c: any) => fmtDate(c.datePaiement), rendu: (c: any) => <span className="text-[13px] font-medium text-green-600">{fmtDate(c.datePaiement)}</span> },
    { cle: 'obs', libelle: 'Observation', masquerSous: '2xl' as const, texte: (c: any) => c.observations || '', rendu: (c: any) => <Tronque texte={c.observations || '—'} largeur="14rem" /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Historique des cautions"
          sousTitre="Cautions payées"
          actions={<Link href="/cautions" className="btn-secondary">← Gestion des cautions</Link>}
          centre={
            <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-green-500" />
              <b className="tabular-nums">{fmt(sommeMontant)}</b><span className="text-gray-500">F sur cette page — {total} caution(s)</span>
            </span>
          }
        />
        <ListeResponsive
          colonnes={colonnes}
          lignes={items}
          cleLigne={(c: any) => c.id}
          chargement={loading}
          nomExport="historique-cautions"
          carte={(c: any) => ({
            titre: c.client?.raisonSociale || c.numero,
            sousTitre: `${c.numero} — ${numDossier(c)}${c.compagnie ? ` — ${c.compagnie}` : ''}`,
            droite: <Montant valeur={c.montant} />,
            details: `Payée le ${fmtDate(c.datePaiement)}`,
          })}
          pagination={{ page, totalPages: Math.max(1, totalPages), total, pageSize: limit, onPageChange: setPage, onPageSizeChange: changeLimit }}
          vide={<EmptyState titre="Aucune caution payée" description="Les cautions payées apparaîtront ici." />}
        />
      </div>
    </AppLayout>
  );
}
