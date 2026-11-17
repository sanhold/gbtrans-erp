'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeValider } from '@/components/tables/BoutonIcone';
import { Discret, Montant, StatutPastille } from '@/components/tables/cellules';
import PickerField from '@/components/ui/PickerField';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import toast from 'react-hot-toast';

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

  const dateFr = (d: any) => new Date(d).toLocaleDateString('fr-FR');
  const ok = (r: any) => r.statut === 'VALIDE' || r.statut === 'CLOTURE';
  const ton = (r: any) => (Number(r.ecart) === 0 ? 'positif' : 'negatif') as 'positif' | 'negatif';
  const colonnes = [
    { cle: 'db', libelle: 'Date bancaire', texte: (r: any) => dateFr(r.dateBancaire), rendu: (r: any) => <Discret>{dateFr(r.dateBancaire)}</Discret> },
    { cle: 'dc', libelle: 'Date comptable', texte: (r: any) => dateFr(r.dateComptable), rendu: (r: any) => <Discret>{dateFr(r.dateComptable)}</Discret> },
    { cle: 'sr', libelle: 'Solde relevé', align: 'right' as const, texte: (r: any) => String(r.soldeReleve), rendu: (r: any) => <Montant valeur={r.soldeReleve} /> },
    { cle: 'sc', libelle: 'Solde comptable', align: 'right' as const, texte: (r: any) => String(r.soldeComptable), rendu: (r: any) => <Montant valeur={r.soldeComptable} /> },
    { cle: 'ec', libelle: 'Écart', align: 'right' as const, texte: (r: any) => String(r.ecart), rendu: (r: any) => <Montant valeur={r.ecart} ton={ton(r)} /> },
    { cle: 'st', libelle: 'Statut', texte: (r: any) => r.statut, rendu: (r: any) => <StatutPastille libelle={(r.statut || '').replace(/_/g, ' ')} ton={ok(r) ? 'success' : 'warning'} /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Rapprochement bancaire"
          sousTitre="Comparez le solde du relevé au solde comptable"
          actions={<button onClick={() => setShowModal(true)} disabled={!compteId} className="btn-primary disabled:opacity-50">+ Nouveau rapprochement</button>}
        />
        <div className="card !p-3 sm:max-w-md">
          <PickerField value={compteId} onChange={setCompteId} options={comptes.map(c => ({ id: c.id, label: c.libelle, sublabel: c.banque }))} placeholder="Sélectionner un compte bancaire..." title="Sélectionner un compte bancaire" searchPlaceholder="Compte..." />
        </div>
        <ListeResponsive
          colonnes={colonnes}
          lignes={compteId ? paged : []}
          cleLigne={(r: any) => r.id}
          chargement={loading}
          nomExport="rapprochements"
          actions={(r: any) => r.statut === 'EN_COURS' ? <BoutonIcone titre="Valider" ton="primaire" onClick={() => updateStatut(r.id, 'VALIDE')}><IconeValider /></BoutonIcone> : null}
          carte={(r: any) => ({
            titre: dateFr(r.dateBancaire),
            sousTitre: `Écart de rapprochement — compta ${dateFr(r.dateComptable)}`,
            statut: <StatutPastille libelle={(r.statut || '').replace(/_/g, ' ')} ton={ok(r) ? 'success' : 'warning'} />,
            droite: <Montant valeur={r.ecart} ton={ton(r)} />,
            details: `Relevé ${fmt(r.soldeReleve)} F · Comptable ${fmt(r.soldeComptable)} F`,
          })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre={compteId ? 'Aucun rapprochement' : 'Sélectionnez un compte'} description={compteId ? 'Créez un rapprochement pour ce compte.' : 'Choisissez un compte bancaire pour voir ses rapprochements.'} />}
        />

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-lg sm:mx-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">Nouveau Rapprochement</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Date bancaire *</label><input type="date" value={form.dateBancaire} onChange={e => setForm({ ...form, dateBancaire: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Date comptable *</label><input type="date" value={form.dateComptable} onChange={e => setForm({ ...form, dateComptable: e.target.value })} className="input-field" required /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Solde relevé *</label><input type="number" value={form.soldeReleve} onChange={e => setForm({ ...form, soldeReleve: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Solde comptable *</label><input type="number" value={form.soldeComptable} onChange={e => setForm({ ...form, soldeComptable: e.target.value })} className="input-field" required /></div>
                </div>
                {ecartPreview !== null && (
                  <p className={`text-sm font-semibold ${ecartPreview === 0 ? 'text-green-600' : 'text-red-600'}`}>Écart prévisionnel : {fmt(ecartPreview)}</p>
                )}
                <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
                <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Créer</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
