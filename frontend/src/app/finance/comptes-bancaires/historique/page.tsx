'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';

export default function ComptesBancairesHistoriquePage() {
  const { comptes, loading, reload } = useComptesFinanciers();
  const comptesDesactives = comptes.filter(c => !c.actif);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(comptesDesactives);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reactiver = async (id: string) => {
    try {
      await financeApi.comptesBancaires.activer(id);
      toast.success('Compte réactivé');
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  if (selectedId) {
    const compte = comptesDesactives.find(c => c.id === selectedId);
    return (
      <AppLayout>
        <div className="space-y-6">
          <CompteHistoriqueDetail compte={compte} onBack={() => setSelectedId(null)} onReactiver={reactiver} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/finance/comptes-bancaires" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Comptes Bancaires</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des comptes bancaires désactivés</h1>
          <p className="text-sm text-gray-500">Cliquez sur un compte pour consulter son historique de transactions.</p>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Code</th><th className="table-header">Libellé</th><th className="table-header">Banque</th><th className="table-header">Devise</th><th className="table-header text-right">Solde</th><th className="table-header"></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : comptesDesactives.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun compte bancaire désactivé</td></tr>
              : paged.map(c => (
                <tr key={c.id} className="table-row cursor-pointer" onClick={() => setSelectedId(c.id)}>
                  <td className="table-cell font-medium text-primary-600" data-label="Code">{c.code}</td>
                  <td className="table-cell" data-label="Libellé">{c.libelle}</td>
                  <td className="table-cell" data-label="Banque">{c.banque}</td>
                  <td className="table-cell" data-label="Devise">{c.devise}</td>
                  <td className="table-cell text-right font-mono" data-label="Solde">{fmt(c.solde)}</td>
                  <td className="table-cell" data-label="Actions"><button onClick={(e) => { e.stopPropagation(); reactiver(c.id); }} className="text-xs text-primary-600 hover:underline">Réactiver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </AppLayout>
  );
}

function CompteHistoriqueDetail({ compte, onBack, onReactiver }: { compte: any; onBack: () => void; onReactiver: (id: string) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(rows);

  const load = useCallback(async () => {
    if (!compte) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 100, compteBancaireId: compte.id, dateDebut: dateDebut || undefined, dateFin: dateFin || undefined };
      const res = await financeApi.operations.list(params);
      setRows(res.data.data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [compte, dateDebut, dateFin]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [compte?.id]);

  if (!compte) return <div className="card text-center text-gray-500 py-8"><button onClick={onBack} className="btn-secondary mb-4">← Retour</button><p>Compte introuvable</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-2">← Comptes désactivés</button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{compte.libelle} ({compte.banque})</h2>
          <p className="text-sm text-gray-500">Solde au moment de la désactivation : <span className="font-bold text-gray-900 dark:text-white">{fmt(compte.solde)} {compte.devise}</span> · <span className="badge badge-gray">Inactif</span></p>
        </div>
        <button onClick={() => onReactiver(compte.id)} className="btn-primary">Réactiver ce compte</button>
      </div>

      <div className="card">
        <div className="flex items-end justify-between flex-wrap gap-3 p-4 border-b border-gray-200 dark:border-surface-700">
          <h3 className="text-sm font-semibold">Transactions du compte</h3>
          <div className="flex items-end flex-wrap gap-3">
            <div><label className="label !mb-1">Du</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field !w-auto" /></div>
            <div><label className="label !mb-1">Au</label><input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field !w-auto" /></div>
            <button onClick={load} className="btn-primary">Afficher</button>
          </div>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Date</th><th className="table-header">Sens</th><th className="table-header">Origine</th><th className="table-header">Réf.</th><th className="table-header text-right">Montant</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">Aucune transaction sur cette période</td></tr>
              : paged.map(op => (
                <tr key={op.id} className="table-row">
                  <td className="table-cell text-xs" data-label="Date">{new Date(op.dateOperation).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Sens">{op.sens === 'ENTREE' ? <span className="text-green-600 font-medium">↘ Entrée</span> : <span className="text-red-600 font-medium">↗ Sortie</span>}</td>
                  <td className="table-cell" data-label="Origine">{op.libelle}</td>
                  <td className="table-cell font-mono text-xs text-primary-600" data-label="Réf.">{op.reference || op.numero}</td>
                  <td className={`table-cell text-right font-mono font-semibold ${op.sens === 'ENTREE' ? 'text-green-600' : 'text-red-600'}`} data-label="Montant">{op.sens === 'ENTREE' ? '+' : '-'}{fmt(op.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </div>
  );
}
