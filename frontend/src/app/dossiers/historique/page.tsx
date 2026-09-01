'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { dossiersApi } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';

const statutColors: Record<string, string> = {
  NOUVEAU: 'badge-info', EN_COURS: 'badge-warning', ATTENTE_CLIENT: 'badge-gray', ATTENTE_DOUANE: 'badge-gray',
  LIQUIDATION: 'badge-warning', PAIEMENT: 'badge-info', MAIN_LEVEE: 'badge-info', LIVRAISON: 'badge-success',
  CLOTURE: 'badge-success', ANNULE: 'badge-danger', ARCHIVE: 'badge-gray',
};
const statutLabels: Record<string, string> = {
  NOUVEAU: 'Nouveau', EN_COURS: 'En cours', ATTENTE_CLIENT: 'Att. Client', ATTENTE_DOUANE: 'Att. Douane',
  LIQUIDATION: 'Liquidation', PAIEMENT: 'Paiement', MAIN_LEVEE: 'Main levée', LIVRAISON: 'Livraison',
  CLOTURE: 'Clôturé', ANNULE: 'Annulé', ARCHIVE: 'Archivé',
};
const natureLabels: Record<string, string> = {
  IMPORT: 'Import', EXPORT: 'Export', TRANSIT: 'Transit', REEXPORT: 'Réexport', CABOTAGE: 'Cabotage', TRANSBORDEMENT: 'Transbordement',
};

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

export default function DossiersHistoriquePage() {
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

  const load = () => {
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
  };

  useEffect(() => { load(); }, [page, limit, appliedFiltres]);

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/dossiers" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Dossiers</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des Dossiers</h1>
          <p className="text-sm text-gray-500">Consultez tous les dossiers sur une période donnée</p>
        </div>

        <div className="card !p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.label} type="button" onClick={() => { const [d, f] = p.get(); applyPreset(d, f); }} className="btn-secondary !py-1.5 !px-3 !text-xs">
                {p.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Du</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Au</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Nature</label>
              <select value={filterNature} onChange={e => setFilterNature(e.target.value)} className="input-field w-40">
                <option value="">Toutes</option>
                {Object.entries(natureLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Statut</label>
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="input-field w-40">
                <option value="">Tous</option>
                {Object.entries(statutLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="label">Recherche</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder="N° dossier, BL, client..." />
            </div>
            <button type="submit" className="btn-primary">Afficher</button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card !p-4">
            <p className="text-xs text-gray-500">Dossiers sur la période</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
          </div>
          <div className="card !p-4 sm:col-span-2">
            <p className="text-xs text-gray-500">Valeur CAF cumulée (page affichée)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(valeurTotale)} XOF</p>
          </div>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">N° Dossier</th>
                <th className="table-header">N° Physique</th>
                <th className="table-header">Client</th>
                <th className="table-header">Nature</th>
                <th className="table-header">Statut</th>
                <th className="table-header text-right">Valeur CAF</th>
                <th className="table-header">Date création</th>
                <th className="table-header">Date clôture</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : dossiers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucun dossier sur cette période</td></tr>
              ) : dossiers.map(d => (
                <tr key={d.id} className="table-row">
                  <td className="table-cell font-medium text-primary-600" data-label="N° Dossier">
                    <Link href={`/dossiers/${d.id}`} className="hover:underline">{d.numero}</Link>
                  </td>
                  <td className="table-cell font-mono text-xs" data-label="N° Physique">{d.numeroPhysique || '-'}</td>
                  <td className="table-cell" data-label="Client">{d.client?.raisonSociale || '-'}</td>
                  <td className="table-cell" data-label="Nature"><span className="badge badge-info">{natureLabels[d.nature] || d.nature}</span></td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[d.statut] || 'badge-gray'}`}>{statutLabels[d.statut] || d.statut}</span></td>
                  <td className="table-cell text-right font-mono" data-label="Valeur CAF">{d.valeurCAF ? fmt(d.valeurCAF) : '-'}</td>
                  <td className="table-cell text-xs" data-label="Date création">{fmtDate(d.dateCreation)}</td>
                  <td className="table-cell text-xs" data-label="Date clôture">{fmtDate(d.dateCloture)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={limit} onPageChange={setPage} onPageSizeChange={changeLimit} />
        </div>
      </div>
    </AppLayout>
  );
}
