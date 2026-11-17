'use client';

import { useState } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeValider, IconeArchiver } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant, StatutPastille } from '@/components/tables/cellules';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

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
      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/finance/comptes-bancaires/historique" className="btn-secondary">Comptes désactivés</Link>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Nouveau compte</button>
      </div>
      <ListeResponsive
        colonnes={[
          { cle: 'code', libelle: 'Code', texte: (c: any) => c.code, rendu: (c: any) => <Numero>{c.code}</Numero> },
          { cle: 'libelle', libelle: 'Libellé', texte: (c: any) => c.libelle, rendu: (c: any) => <Tronque texte={c.libelle} largeur="20rem" /> },
          { cle: 'banque', libelle: 'Banque', texte: (c: any) => c.banque || '', rendu: (c: any) => <Tronque texte={c.banque} largeur="12rem" /> },
          { cle: 'devise', libelle: 'Devise', masquerSous: 'xl' as const, texte: (c: any) => c.devise, rendu: (c: any) => <Discret>{c.devise}</Discret> },
          { cle: 'solde', libelle: 'Solde', align: 'right' as const, texte: (c: any) => String(c.solde), rendu: (c: any) => (canSeeMontants ? <Montant valeur={c.solde} /> : MONTANT_MASQUE) },
          { cle: 'statut', libelle: 'Statut', texte: (c: any) => (c.actif ? 'Actif' : 'Inactif'), rendu: (c: any) => <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} /> },
        ]}
        lignes={paged}
        cleLigne={(c: any) => c.id}
        chargement={loading}
        nomExport="comptes-bancaires"
        onClic={onSelectAccount ? (c: any) => onSelectAccount(c.id) : undefined}
        actions={(c: any) => (
          <BoutonIcone titre={c.actif ? 'Désactiver' : 'Activer'} ton={c.actif ? 'neutre' : 'primaire'} onClick={() => toggleActif(c)}>{c.actif ? <IconeArchiver /> : <IconeValider />}</BoutonIcone>
        )}
        carte={(c: any) => ({ titre: c.libelle, sousTitre: `${c.code} — ${c.banque || ''}`, statut: <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} />, droite: canSeeMontants ? <Montant valeur={c.solde} /> : MONTANT_MASQUE })}
        pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
        vide={<EmptyState titre="Aucun compte bancaire actif" description="Créez-en un avec « Nouveau compte »." />}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-lg sm:mx-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Nouveau Compte Bancaire</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
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
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Créer</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
