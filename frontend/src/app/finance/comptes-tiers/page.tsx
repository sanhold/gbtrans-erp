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

export default function ComptesTiersPage() {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const { tiers, loading, reload } = useComptesFinanciers();
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(tiers);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', type: 'PARTENAIRE', devise: 'XOF', observations: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.comptesTiers.create(form);
      toast.success('Compte tiers créé');
      setShowModal(false);
      setForm({ code: '', libelle: '', type: 'PARTENAIRE', devise: 'XOF', observations: '' });
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const toggleActif = async (c: any) => {
    try {
      await (c.actif ? financeApi.comptesTiers.desactiver(c.id) : financeApi.comptesTiers.activer(c.id));
      toast.success(c.actif ? 'Compte désactivé' : 'Compte activé');
      reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Comptes tiers"
          sousTitre="Comptes Partenaire, Associé et autres tiers financiers"
          icone="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8z"
          actions={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau compte tiers
            </button>
          }
        />
        <ListeResponsive
          colonnes={[
            { cle: 'code', libelle: 'Code', texte: (c: any) => c.code, rendu: (c: any) => <Numero>{c.code}</Numero> },
            { cle: 'libelle', libelle: 'Libellé', texte: (c: any) => c.libelle, rendu: (c: any) => <Tronque texte={c.libelle} largeur="22rem" /> },
            { cle: 'type', libelle: 'Type', texte: (c: any) => c.type, rendu: (c: any) => <StatutPastille libelle={c.type} ton="warning" /> },
            { cle: 'devise', libelle: 'Devise', masquerSous: 'xl' as const, texte: (c: any) => c.devise, rendu: (c: any) => <Discret>{c.devise}</Discret> },
            { cle: 'solde', libelle: 'Solde', align: 'right' as const, texte: (c: any) => String(c.solde), rendu: (c: any) => (canSeeMontants ? <Montant valeur={c.solde} /> : MONTANT_MASQUE) },
            { cle: 'statut', libelle: 'Statut', texte: (c: any) => (c.actif ? 'Actif' : 'Inactif'), rendu: (c: any) => <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} /> },
          ]}
          lignes={paged}
          cleLigne={(c: any) => c.id}
          chargement={loading}
          nomExport="comptes-tiers"
          actions={(c: any) => (
            <BoutonIcone titre={c.actif ? 'Désactiver' : 'Activer'} ton={c.actif ? 'neutre' : 'primaire'} onClick={() => toggleActif(c)}>{c.actif ? <IconeArchiver /> : <IconeValider />}</BoutonIcone>
          )}
          carte={(c: any) => ({ titre: c.libelle, sousTitre: c.type, statut: <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} />, droite: canSeeMontants ? <Montant valeur={c.solde} /> : MONTANT_MASQUE })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre="Aucun compte tiers" description="Utilisez le bouton en haut à droite pour en ajouter un." />}
        />

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">Nouveau Compte Tiers</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div><label className="label">Code *</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" required placeholder="TIE001" /></div>
                <div><label className="label">Libellé *</label><input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field" required /></div>
                <div>
                  <label className="label">Type *</label>
                  <input type="text" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field" required placeholder="PARTENAIRE" list="types-comptes-tiers" />
                  <datalist id="types-comptes-tiers"><option value="PARTENAIRE" /><option value="ASSOCIE" /><option value="AUTRE" /></datalist>
                </div>
                <div><label className="label">Devise</label><input type="text" value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })} className="input-field" /></div>
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
