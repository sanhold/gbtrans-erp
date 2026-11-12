'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import PickerField from '@/components/ui/PickerField';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';
import SheetActions from '@/components/forms/SheetActions';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';

export default function RapprochementPage() {
  const { comptes } = useComptesFinanciers();
  const [compteId, setCompteId] = useState('');
  const [rapprochements, setRapprochements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(rapprochements);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ dateBancaire: '', dateComptable: '', soldeReleve: '', soldeComptable: '', observations: '' });

  const load = useCallback(async () => {
    if (!compteId) { setRapprochements([]); return; }
    setLoading(true);
    try {
      const res = await financeApi.rapprochements.list({ compteBancaireId: compteId });
      setRapprochements(res.data.data || []);
    } catch { setRapprochements([]); }
    finally { setLoading(false); }
  }, [compteId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!compteId && comptes.length > 0) setCompteId(comptes[0].id);
  }, [comptes, compteId]);

  const ecartPreview = form.soldeReleve && form.soldeComptable ? Number(form.soldeReleve) - Number(form.soldeComptable) : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.rapprochements.create({
        compteBancaireId: compteId, dateBancaire: form.dateBancaire, dateComptable: form.dateComptable,
        soldeReleve: Number(form.soldeReleve), soldeComptable: Number(form.soldeComptable), observations: form.observations || undefined,
      });
      toast.success('Rapprochement créé');
      setShowModal(false);
      setForm({ dateBancaire: '', dateComptable: '', soldeReleve: '', soldeComptable: '', observations: '' });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const updateStatut = async (id: string, statut: string) => {
    try {
      await financeApi.rapprochements.updateStatut(id, statut);
      toast.success('Statut mis à jour');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Rapprochement bancaire"
          subtitle="Comparez le solde relevé bancaire au solde comptable"
          actions={<button onClick={() => setShowModal(true)} disabled={!compteId} className="btn-primary hidden lg:inline-flex disabled:opacity-50">
            <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau rapprochement
          </button>}
        />
        <PickerField value={compteId} onChange={setCompteId} options={comptes.map(c => ({ id: c.id, label: c.libelle, sublabel: c.banque }))} placeholder="Sélectionner un compte bancaire..." title="Sélectionner un compte bancaire" searchPlaceholder="Compte, banque..." className="md:!w-64" />
        {compteId && <FAB label="Nouveau rapprochement" onClick={() => setShowModal(true)} />}
        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              </colgroup>
            <thead><tr><th className="table-header !text-[10px] !px-1.5 truncate">Actions</th><th className="table-header !text-[10px] !px-1.5 truncate">Date bancaire</th><th className="table-header !text-[10px] !px-1.5 truncate">Date comptable</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Solde relevé</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Solde comptable</th><th className="table-header !text-[10px] !px-1.5 truncate text-right">Écart</th><th className="table-header !text-[10px] !px-1.5 truncate">Statut</th></tr></thead>
            <tbody>
              {!compteId ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Sélectionnez un compte bancaire pour afficher ses rapprochements</td></tr>
              : loading ? <SkeletonRows cols={7} />
              : rapprochements.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucun rapprochement en cours</td></tr>
              : paged.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell !px-1.5" data-label="Actions">
                    {r.statut === 'EN_COURS' && <button onClick={() => updateStatut(r.id, 'VALIDE')} className="text-xs px-2 py-2 text-primary-600 hover:underline">Valider</button>}
                  </td>
                  <td className="table-cell !text-[10.5px] !px-1.5 truncate" data-label="Date bancaire">{new Date(r.dateBancaire).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell col-opt !text-[10.5px] !px-1.5 truncate" data-label="Date comptable">{new Date(r.dateComptable).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Solde relevé">{fmt(r.soldeReleve)}</td>
                  <td className="table-cell text-right font-mono !px-1.5 !text-[10.5px] truncate" data-label="Solde comptable">{fmt(r.soldeComptable)}</td>
                  <td className={`table-cell text-right font-mono font-semibold !px-1.5 !text-[10.5px] truncate ${Number(r.ecart) === 0 ? 'text-green-600' : 'text-red-600'}`} data-label="Écart">{fmt(r.ecart)}</td>
                  <td className="table-cell !px-1.5" data-label="Statut"><span className={`badge ${r.statut === 'VALIDE' || r.statut === 'CLOTURE' ? 'badge-success' : 'badge-warning'} !text-[10px] !px-1.5 !py-0`}>{r.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>

        <Sheet open={showModal} onClose={() => setShowModal(false)} title="Nouveau Rapprochement" size="lg">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Date bancaire *</label><input type="date" value={form.dateBancaire} onChange={e => setForm({ ...form, dateBancaire: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Date comptable *</label><input type="date" value={form.dateComptable} onChange={e => setForm({ ...form, dateComptable: e.target.value })} className="input-field" required /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Solde relevé *</label><input type="number" inputMode="decimal" value={form.soldeReleve} onChange={e => setForm({ ...form, soldeReleve: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Solde comptable *</label><input type="number" inputMode="decimal" value={form.soldeComptable} onChange={e => setForm({ ...form, soldeComptable: e.target.value })} className="input-field" required /></div>
                </div>
                {ecartPreview !== null && (
                  <p className={`text-sm font-semibold ${ecartPreview === 0 ? 'text-green-600' : 'text-red-600'}`}>Écart prévisionnel : {fmt(ecartPreview)}</p>
                )}
                <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
                <SheetActions onCancel={() => setShowModal(false)} cancelLabel="Annuler" submitLabel="Créer" />
              </form>
            
        </Sheet>
      </div>
    </AppLayout>
  );
}
