'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useState } from 'react';
import Link from 'next/link';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import FAB from '@/components/ui/FAB';
import SheetActions from '@/components/forms/SheetActions';

const MONTANT_MASQUE = '•••••••';

export default function ComptesBancairesManager({ onSelectAccount }: { onSelectAccount?: (id: string) => void }) {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const { comptes, loading, reload } = useComptesFinanciers();
  const comptesActifs = comptes.filter(c => c.actif);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(comptesActifs);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', banque: '', rib: '', iban: '', swift: '', devise: 'XOF' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.comptesBancaires.create(form);
      toast.success('Compte bancaire créé');
      setShowModal(false);
      setForm({ code: '', libelle: '', banque: '', rib: '', iban: '', swift: '', devise: 'XOF' });
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const toggleActif = async (c: any) => {
    try {
      await (c.actif ? financeApi.comptesBancaires.desactiver(c.id) : financeApi.comptesBancaires.activer(c.id));
      toast.success(c.actif ? 'Compte désactivé' : 'Compte activé');
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3">
        <Link href="/finance/comptes-bancaires/historique" className="btn-secondary">
          <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Comptes désactivés
        </Link>
        <button onClick={() => setShowModal(true)} className="btn-primary hidden lg:inline-flex">
          <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nouveau compte
        </button>
      </div>
      <FAB label="Nouveau compte bancaire" onClick={() => setShowModal(true)} />
      <div className="table-container">
        <table className="w-full">
          <thead><tr><th className="table-header">Actions</th><th className="table-header">Code</th><th className="table-header">Libellé</th><th className="table-header">Banque</th><th className="table-header">Devise</th><th className="table-header text-right">Solde</th><th className="table-header">Statut</th></tr></thead>
          <tbody>
            {loading ? <SkeletonRows cols={7} />
            : comptesActifs.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun compte bancaire actif.<br /><button type="button" onClick={() => setShowModal(true)} className="btn-primary mt-3">Nouveau compte bancaire</button></td></tr>
            : paged.map(c => (
              <tr key={c.id} className={`table-row ${onSelectAccount ? 'cursor-pointer' : ''}`} onClick={() => onSelectAccount?.(c.id)}>
                <td className="table-cell" data-label="Actions"><button onClick={(e) => { e.stopPropagation(); toggleActif(c); }} className="text-sm px-2 py-2 text-primary-600 hover:underline">{c.actif ? 'Désactiver' : 'Activer'}</button></td>
                <td className="table-cell font-medium text-primary-600" data-label="Code">{c.code}</td>
                <td className="table-cell" data-label="Libellé">{c.libelle}</td>
                <td className="table-cell" data-label="Banque">{c.banque}</td>
                <td className="table-cell col-opt" data-label="Devise">{c.devise}</td>
                <td className="table-cell text-right font-mono" data-label="Solde">{canSeeMontants ? fmt(c.solde) : MONTANT_MASQUE}</td>
                <td className="table-cell" data-label="Statut">{c.actif ? <span className="badge badge-success">Actif</span> : <span className="badge badge-gray">Inactif</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <Sheet open={showModal} onClose={() => setShowModal(false)} size="lg" closeOnBackdrop={false} title="Nouveau compte bancaire">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Code *</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" required placeholder="BAN001" /></div>
                <div><label className="label">Banque *</label><input type="text" value={form.banque} onChange={e => setForm({ ...form, banque: e.target.value })} className="input-field" required placeholder="BICICI" /></div>
              </div>
              <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">RIB</label><input type="text" value={form.rib} onChange={e => setForm({ ...form, rib: e.target.value })} className="input-field" /></div>
                <div><label className="label">IBAN</label><input type="text" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">SWIFT</label><input type="text" value={form.swift} onChange={e => setForm({ ...form, swift: e.target.value })} className="input-field" /></div>
                <div><label className="label">Devise</label><input type="text" value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })} className="input-field" /></div>
              </div>
              <SheetActions onCancel={() => setShowModal(false)} submitLabel="Créer" />
            </form>
      </Sheet>
    </div>
  );
}
