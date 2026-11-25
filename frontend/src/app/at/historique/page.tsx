'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Numero, Discret, Tronque, Montant } from '@/components/tables/cellules';
import { atApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function ATHistoriquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { page, limit, etat: 'APURE' };
    if (appliedSearch) params.search = appliedSearch;
    atApi.list(params)
      .then(res => { setItems(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page, limit, appliedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setAppliedSearch(search); };
  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const numDossier = (at: any) => at.dossiers?.[0] ? (at.dossiers[0].numeroPhysique || at.dossiers[0].numero) : '—';
  const colonnes = [
    { cle: 'num', libelle: 'Id. AT', texte: (at: any) => at.numero, rendu: (at: any) => <Numero>{at.numero}</Numero> },
    { cle: 'dos', libelle: 'N° dossier', texte: numDossier, rendu: (at: any) => at.dossiers?.[0] ? <Link href={`/dossiers/${at.dossiers[0].id}`} onClick={e => e.stopPropagation()} className="font-mono text-[12.5px] font-semibold text-azure hover:underline">{numDossier(at)}</Link> : <Discret>—</Discret> },
    { cle: 'client', libelle: 'Client', texte: (at: any) => at.client?.raisonSociale || '', rendu: (at: any) => <Tronque texte={at.client?.raisonSociale} largeur="14rem" /> },
    { cle: 'des', libelle: 'Désignation', masquerSous: 'xl' as const, texte: (at: any) => at.designation || '', rendu: (at: any) => <Tronque texte={at.designation} largeur="16rem" /> },
    { cle: 'ech', libelle: 'Échéance', texte: (at: any) => fmtDate(at.dateExpiration), rendu: (at: any) => <Discret>{fmtDate(at.dateExpiration)}</Discret> },
    { cle: 'gar', libelle: 'Garantie', align: 'right' as const, masquerSous: 'xl' as const, texte: (at: any) => String(at.montantCaution ?? ''), rendu: (at: any) => <Montant valeur={at.montantCaution} unite="" /> },
    { cle: 'apu', libelle: 'Apuré le', texte: (at: any) => fmtDate(at.dateApurement), rendu: (at: any) => <Discret>{fmtDate(at.dateApurement)}</Discret> },
    { cle: 'mt', libelle: 'Mt apuré', align: 'right' as const, texte: (at: any) => String(at.montantApure ?? ''), rendu: (at: any) => <Montant valeur={at.montantApure} ton="positif" unite="" /> },
    { cle: 'ref', libelle: 'Réf. apurement', masquerSous: '2xl' as const, texte: (at: any) => at.referenceApurement || '', rendu: (at: any) => <Discret>{at.referenceApurement || '—'}</Discret> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Historique AT"
          sousTitre={`${total} admission(s) temporaire(s) apurée(s)`}
          actions={<Link href="/at" className="btn-secondary">← Admissions temporaires</Link>}
        />
        <form onSubmit={handleSearch} className="card !p-3 flex gap-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field !py-2 text-sm flex-1 min-w-0" placeholder="N° AT, désignation, déclarant..." aria-label="Rechercher" />
          <button type="submit" className="btn-primary flex-shrink-0">Afficher</button>
        </form>
        <ListeResponsive
          colonnes={colonnes}
          lignes={items}
          cleLigne={(at: any) => at.id}
          chargement={loading}
          nomExport="historique-at"
          carte={(at: any) => ({
            titre: at.client?.raisonSociale || at.numero,
            sousTitre: `${at.numero} — ${at.designation || ''}`,
            droite: <Montant valeur={at.montantApure} ton="positif" />,
            details: `Apuré le ${fmtDate(at.dateApurement)}${at.referenceApurement ? ` — réf. ${at.referenceApurement}` : ''}`,
          })}
          pagination={{ page, totalPages: Math.max(1, totalPages), total, pageSize: limit, onPageChange: setPage, onPageSizeChange: changeLimit }}
          vide={<EmptyState titre="Aucune AT apurée" description="Les admissions temporaires apurées apparaîtront ici." />}
        />
      </div>
    </AppLayout>
  );
}
