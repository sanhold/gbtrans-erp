'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeValider, IconeArchiver } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant, StatutPastille } from '@/components/tables/cellules';
import { financeApi } from '@/lib/api';
import { useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

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
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Caisses"
          sousTitre="Gestion des caisses espèces"
          icone="M3 7h18v10H3zM12 14a2 2 0 100-4 2 2 0 000 4z"
          actions={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouvelle caisse
            </button>
          }
        />
        <ListeResponsive
          colonnes={[
            { cle: 'code', libelle: 'Code', texte: (c: any) => c.code, rendu: (c: any) => <Numero>{c.code}</Numero> },
            { cle: 'libelle', libelle: 'Libellé', texte: (c: any) => c.libelle, rendu: (c: any) => <Tronque texte={c.libelle} largeur="22rem" /> },
            { cle: 'devise', libelle: 'Devise', masquerSous: 'xl' as const, texte: (c: any) => c.devise, rendu: (c: any) => <Discret>{c.devise}</Discret> },
            { cle: 'plafond', libelle: 'Plafond', align: 'right' as const, masquerSous: 'xl' as const, texte: (c: any) => String(c.plafond ?? ''), rendu: (c: any) => (canSeeMontants ? (c.plafond ? <Montant valeur={c.plafond} /> : <span className="text-gray-300">—</span>) : MONTANT_MASQUE) },
            { cle: 'solde', libelle: 'Solde', align: 'right' as const, texte: (c: any) => String(c.solde), rendu: (c: any) => (canSeeMontants ? <Montant valeur={c.solde} /> : MONTANT_MASQUE) },
            { cle: 'statut', libelle: 'Statut', texte: (c: any) => (c.actif ? 'Actif' : 'Inactif'), rendu: (c: any) => <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} /> },
          ]}
          lignes={paged}
          cleLigne={(c: any) => c.id}
          chargement={loading}
          nomExport="caisses"
          actions={(c: any) => (
            <BoutonIcone titre={c.actif ? 'Désactiver' : 'Activer'} ton={c.actif ? 'neutre' : 'primaire'} onClick={() => toggleActif(c)}>{c.actif ? <IconeArchiver /> : <IconeValider />}</BoutonIcone>
          )}
          carte={(c: any) => ({ titre: c.libelle, sousTitre: c.code, statut: <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} />, droite: canSeeMontants ? <Montant valeur={c.solde} /> : MONTANT_MASQUE })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre="Aucune caisse" description="Utilisez le bouton en haut à droite pour en ajouter un." />}
        />

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">Nouvelle Caisse</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div><label className="label">Code *</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" required placeholder="CAI001" /></div>
                <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Devise</label><input type="text" value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })} className="input-field" /></div>
                  <div><label className="label">Plafond</label><input type="number" value={form.plafond} onChange={e => setForm({ ...form, plafond: e.target.value })} className="input-field" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Créer</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
