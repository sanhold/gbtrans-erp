'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import SheetActions from '@/components/forms/SheetActions';
import FAB from '@/components/ui/FAB';
import PageHeader from '@/components/ui/PageHeader';

const MONTANT_MASQUE = '•••••••';

export default function CaissesPage() {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const { caisses, loading, reload } = useComptesFinanciers();
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(caisses);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', devise: 'XOF', plafond: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.caisses.create({ ...form, plafond: form.plafond ? Number(form.plafond) : undefined });
      toast.success('Caisse créée');
      setShowModal(false);
      setForm({ code: '', libelle: '', devise: 'XOF', plafond: '' });
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const toggleActif = async (c: any) => {
    try {
      await (c.actif ? financeApi.caisses.desactiver(c.id) : financeApi.caisses.activer(c.id));
      toast.success(c.actif ? 'Caisse désactivée' : 'Caisse activée');
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Caisses"
          subtitle="Gestion des caisses espèces"
          actions={<button onClick={() => setShowModal(true)} className="btn-primary hidden lg:inline-flex">
            <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle caisse
          </button>}
        />
        <FAB label="Nouvelle caisse" onClick={() => setShowModal(true)} />
        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '10%' }} />
              </colgroup>
            <thead><tr><th className="table-header !text-[10px] !px-1.5 truncate">Actions</th><th className="table-header !text-[10px] !px-1.5 truncate">Code</th><th className="table-header !text-[10px] !px-1.5 truncate">Libellé</th><th className="table-header !text-[10px] !px-1.5 truncate">Devise</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Solde</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Plafond</th><th className="table-header !text-[10px] !px-1.5 truncate">Statut</th></tr></thead>
            <tbody>
              {loading ? <SkeletonRows cols={7} />
              : caisses.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucune caisse.<br /><button type="button" onClick={() => setShowModal(true)} className="btn-primary mt-3">Nouvelle caisse</button></td></tr>
              : paged.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell !px-1.5" data-label="Actions"><button onClick={() => toggleActif(c)} className="text-xs px-2 py-2 text-primary-600 hover:underline">{c.actif ? 'Désactiver' : 'Activer'}</button></td>
                  <td className="table-cell font-medium text-primary-600 !px-1.5 !text-[11px] truncate" data-label="Code">{c.code}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Libellé" title={c.libelle}>{c.libelle}</td>
                  <td className="table-cell col-opt !px-1.5 !text-[11px] truncate" data-label="Devise">{c.devise}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Solde">{canSeeMontants ? fmt(c.solde) : MONTANT_MASQUE}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Plafond">{canSeeMontants ? (c.plafond ? fmt(c.plafond) : '-') : MONTANT_MASQUE}</td>
                  <td className="table-cell !px-1.5" data-label="Statut">{c.actif ? <span className="badge badge-success !text-[10px] !px-1.5 !py-0">Actif</span> : <span className="badge badge-gray !text-[10px] !px-1.5 !py-0">Inactif</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>

        <Sheet open={showModal} onClose={() => setShowModal(false)} title="Nouvelle Caisse" size="lg">
              <form onSubmit={handleCreate} className="space-y-4">
                <div><label className="label">Code *</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" required placeholder="CAI001" /></div>
                <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Devise</label><input type="text" value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Plafond</label><input type="number" inputMode="decimal" value={form.plafond} onChange={e => setForm({ ...form, plafond: e.target.value })} className="input-field" /></div>
                </div>
                <SheetActions onCancel={() => setShowModal(false)} cancelLabel="Annuler" submitLabel="Créer" />
              </form>
            
        </Sheet>
      </div>
    </AppLayout>
  );
}
