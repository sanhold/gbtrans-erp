'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Discret, Tronque, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import { dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import { statutColors, statutLabels, STATUTS_DOSSIER } from '@/lib/dossierStatut';
import { fmt } from '@/lib/format';
const natureLabels: Record<string, string> = {
  IMPORT: 'Import', EXPORT: 'Export', TRANSIT: 'Transit', REEXPORT: 'Réexport', CABOTAGE: 'Cabotage', TRANSBORDEMENT: 'Transbordement',
};

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

export default function DossiersHistoriquePage() {
  const router = useRouter();
  const today = new Date();
  const debutAnnee = toInputDate(new Date(today.getFullYear(), 0, 1));
  const finAujourdhui = toInputDate(today);

  const [dossiers, setDossiers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const [dateDebut, setDateDebut] = useState(debutAnnee);
  const [dateFin, setDateFin] = useState(finAujourdhui);
  const [filterNature, setFilterNature] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');

  const [appliedFiltres, setAppliedFiltres] = useState({ dateDebut: debutAnnee, dateFin: finAujourdhui, nature: '', statut: '', search: '' });

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { page, limit, sortBy: 'dateCreation', sortOrder: 'desc' };
    if (appliedFiltres.dateDebut) params.dateDebut = `${appliedFiltres.dateDebut}T00:00:00.000Z`;
    if (appliedFiltres.dateFin) params.dateFin = `${appliedFiltres.dateFin}T23:59:59.999Z`;
    if (appliedFiltres.nature) params.nature = appliedFiltres.nature;
    if (appliedFiltres.statut) params.statut = appliedFiltres.statut;
    if (appliedFiltres.search) params.search = appliedFiltres.search;

    dossiersApi.list(params)
      .then(res => { setDossiers(res.data.data || []); setTotal(res.data.pagination?.total || 0); })
      .catch(() => setDossiers([]))
      .finally(() => setLoading(false));
  }, [page, limit, appliedFiltres]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedFiltres({ dateDebut, dateFin, nature: filterNature, statut: filterStatut, search });
  };

  const applyPreset = (debut: string, fin: string) => {
    setDateDebut(debut); setDateFin(fin);
    setPage(1);
    setAppliedFiltres(f => ({ ...f, dateDebut: debut, dateFin: fin }));
  };

  const presets = [
    { label: "Aujourd'hui", get: () => [toInputDate(today), toInputDate(today)] as [string, string] },
    { label: 'Ce mois', get: () => [toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)), toInputDate(today)] as [string, string] },
    { label: 'Cette année', get: () => [toInputDate(new Date(today.getFullYear(), 0, 1)), toInputDate(today)] as [string, string] },
    { label: 'Année dernière', get: () => [toInputDate(new Date(today.getFullYear() - 1, 0, 1)), toInputDate(new Date(today.getFullYear() - 1, 11, 31))] as [string, string] },
    { label: 'Tout', get: () => ['', ''] as [string, string] },
  ];

  const changeLimit = (n: number) => { setLimit(n); setPage(1); };
  const totalPages = Math.ceil(total / limit);
  const valeurTotale = dossiers.reduce((s, d) => s + (Number(d.valeurCAF) || 0), 0);

  const colonnes = [
    { cle: 'num', libelle: 'N° dossier', texte: (d: any) => d.numeroPhysique || d.numero, rendu: (d: any) => <Link href={`/dossiers/${d.id}`} onClick={e => e.stopPropagation()} className="font-mono text-[12.5px] font-semibold text-azure hover:underline">{d.numeroPhysique || d.numero}</Link> },
    { cle: 'cree', libelle: 'Créé le', texte: (d: any) => fmtDate(d.dateCreation), rendu: (d: any) => <Discret>{fmtDate(d.dateCreation)}</Discret> },
    { cle: 'client', libelle: 'Client', texte: (d: any) => d.client?.raisonSociale || '', rendu: (d: any) => <Tronque texte={d.client?.raisonSociale} largeur="18rem" /> },
    { cle: 'nature', libelle: 'Nature', texte: (d: any) => natureLabels[d.nature] || d.nature, rendu: (d: any) => <Discret>{natureLabels[d.nature] || d.nature}</Discret> },
    { cle: 'statut', libelle: 'Statut', texte: (d: any) => statutLabels[d.statut] || d.statut, rendu: (d: any) => <StatutPastille libelle={statutLabels[d.statut] || d.statut} ton={tonDepuisBadge(statutColors[d.statut])} /> },
    { cle: 'caf', libelle: 'Valeur CAF', align: 'right' as const, texte: (d: any) => String(d.valeurCAF ?? ''), rendu: (d: any) => d.valeurCAF ? <Montant valeur={d.valeurCAF} unite="" /> : <Discret>—</Discret> },
    { cle: 'clot', libelle: 'Clôturé le', masquerSous: 'xl' as const, texte: (d: any) => fmtDate(d.dateCloture), rendu: (d: any) => <Discret>{fmtDate(d.dateCloture)}</Discret> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Historique des dossiers"
          sousTitre="Recherchez les dossiers sur une période"
          actions={<Link href="/dossiers" className="btn-secondary">← Dossiers</Link>}
          centre={
            <>
              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-blue-600" /><b className="tabular-nums">{total}</b><span className="text-gray-500">dossier(s)</span>
              </span>
              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 text-[13px] dark:border-surface-600 dark:bg-surface-800">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-green-500" /><b className="tabular-nums">{fmt(valeurTotale)}</b><span className="text-gray-500">XOF CAF (page)</span>
              </span>
            </>
          }
        />

        <form onSubmit={handleSearch} className="card !p-3 space-y-2">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {presets.map(p => (
              <button key={p.label} type="button" onClick={() => { const [d, f] = p.get(); applyPreset(d, f); }} className="flex-shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-300">{p.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center">
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field !py-2 text-sm lg:!w-40" title="Du" aria-label="Du" />
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field !py-2 text-sm lg:!w-40" title="Au" aria-label="Au" />
            <select value={filterNature} onChange={e => setFilterNature(e.target.value)} aria-label="Nature" className="input-field !py-2 text-sm lg:!w-32">
              <option value="">Nature</option>
              {Object.entries(natureLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} aria-label="Statut" className="input-field !py-2 text-sm lg:!w-32">
              <option value="">Statut</option>
              {STATUTS_DOSSIER.map((k) => <option key={k} value={k}>{statutLabels[k]}</option>)}
            </select>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field !py-2 text-sm col-span-2 lg:col-span-1 lg:!w-56" placeholder="N° dossier, BL, client..." aria-label="Rechercher" />
            <button type="submit" className="btn-primary col-span-2 lg:col-span-1">Afficher</button>
          </div>
        </form>

        <ListeResponsive
          colonnes={colonnes}
          lignes={dossiers}
          cleLigne={(d: any) => d.id}
          chargement={loading}
          nomExport="historique-dossiers"
          carte={(d: any) => ({
            titre: d.numeroPhysique || d.numero,
            sousTitre: d.client?.raisonSociale || '—',
            statut: <StatutPastille libelle={statutLabels[d.statut] || d.statut} ton={tonDepuisBadge(statutColors[d.statut])} />,
            details: `${natureLabels[d.nature] || d.nature} — créé le ${fmtDate(d.dateCreation)}${d.valeurCAF ? ` — CAF ${fmt(d.valeurCAF)}` : ''}`,
          })}
          onClic={(d: any) => { router.push(`/dossiers/${d.id}`); }}
          pagination={{ page, totalPages: Math.max(1, totalPages), total, pageSize: limit, onPageChange: setPage, onPageSizeChange: changeLimit }}
          vide={<EmptyState titre="Aucun dossier" description="Aucun dossier sur cette période." />}
        />
      </div>
    </AppLayout>
  );
}
