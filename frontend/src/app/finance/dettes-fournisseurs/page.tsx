'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeValider } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import { financeApi } from '@/lib/api';
import { fmt, CREANCE_STATUTS_OUVERTS, CREANCE_STATUT_BADGE } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';

export default function DettesFournisseursPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { paged, page, setPage, pageSize, setPageSize, total: totalRows, totalPages } = usePagination(rows);

  useEffect(() => {
    financeApi.facturesFournisseurs.list({ limit: 200 })
      .then(r => setRows((r.data.data || []).filter((f: any) => CREANCE_STATUTS_OUVERTS.includes(f.statut) && Number(f.resteAPayer) > 0)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const total = rows.reduce((s, r) => s + Number(r.resteAPayer), 0);
  const tiers = (f: any) => f.fournisseur?.raisonSociale || '—';
  const date = (f: any) => new Date(f.dateEcheance).toLocaleDateString('fr-FR');
  const statut = (f: any) => (f.statut || '').replace(/_/g, ' ');
  const lien = (f: any) => `/facturation-fournisseurs/${f.id}`;

  const colonnes = [
    { cle: 'numero', libelle: 'N° facture', texte: (f: any) => f.numero, rendu: (f: any) => <Numero>{f.numero}</Numero> },
    { cle: 'date', libelle: 'Échéance', texte: date, rendu: (f: any) => <Discret>{date(f)}</Discret> },
    { cle: 'tiers', libelle: 'Fournisseur', texte: tiers, rendu: (f: any) => <Tronque texte={tiers(f)} largeur="18rem" /> },
    { cle: 'ttc', libelle: 'Total TTC', align: 'right' as const, texte: (f: any) => String(f.montantTTC), rendu: (f: any) => <Montant valeur={f.montantTTC} /> },
    { cle: 'paye', libelle: 'Payé', align: 'right' as const, masquerSous: 'xl' as const, texte: (f: any) => String(f.montantPaye), rendu: (f: any) => <Montant valeur={f.montantPaye} ton="positif" /> },
    { cle: 'reste', libelle: 'Reste à payer', align: 'right' as const, texte: (f: any) => String(f.resteAPayer), rendu: (f: any) => <Montant valeur={f.resteAPayer} ton="negatif" /> },
    { cle: 'statut', libelle: 'Statut', texte: statut, rendu: (f: any) => <StatutPastille libelle={statut(f)} ton={tonDepuisBadge(CREANCE_STATUT_BADGE[f.statut])} /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Dettes fournisseurs"
          sousTitre="Factures fournisseurs validées et non soldées"
          icone="M12 8c-2 0-3 .9-3 2s1 2 3 2 3 .9 3 2-1 2-3 2m0-8V6m0 12v-2"
          centre={
            <>
              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
                <b className="tabular-nums">{fmt(total)}</b><span className="text-gray-500">XOF à payer</span>
              </span>
              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-blue-600" />
                <b className="tabular-nums">{rows.length}</b><span className="text-gray-500">facture(s) ouverte(s)</span>
              </span>
            </>
          }
        />
        <ListeResponsive
          colonnes={colonnes}
          lignes={paged}
          cleLigne={(f: any) => f.id}
          chargement={loading}
          nomExport="dettes-fournisseurs"
          actions={(f: any) => <BoutonIcone titre="Payer" ton="primaire" href={lien(f)}><IconeValider /></BoutonIcone>}
          carte={(f: any) => ({ titre: f.numero, sousTitre: tiers(f), droite: <Montant valeur={f.resteAPayer} ton="negatif" />, details: <span className="inline-flex flex-wrap items-center gap-2">{date(f)}<StatutPastille libelle={statut(f)} ton={tonDepuisBadge(CREANCE_STATUT_BADGE[f.statut])} /></span> })}
          pagination={{ page, totalPages, total: totalRows, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre="Aucune dette ouverte" description="Toutes les factures sont soldées." />}
        />
      </div>
    </AppLayout>
  );
}
