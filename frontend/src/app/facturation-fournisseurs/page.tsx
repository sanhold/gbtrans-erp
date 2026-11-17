'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api, { financeApi } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import KpiCard from '@/components/dashboard/KpiCard';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeVoir } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import PickerField from '@/components/ui/PickerField';
import { DEFAULT_PAGE_SIZE } from '@/lib/usePagination';
import toast from 'react-hot-toast';

const statutColors: Record<string, string> = {
  BROUILLON: 'badge-gray', VALIDEE: 'badge-info', ENVOYEE: 'badge-info',
  PARTIELLEMENT_PAYEE: 'badge-warning', PAYEE: 'badge-success',
  EN_RETARD: 'badge-danger', ANNULEE: 'badge-danger', CONTENTIEUX: 'badge-danger',
};
const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

export default function FacturationFournisseursPage() {
  const router = useRouter();
  const [factures, setFactures] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [form, setForm] = useState({ fournisseurId: '', dossierId: '', dateEcheance: '', reference: '', objet: '', observations: '' });

  const fournisseurOptions = fournisseurs.map(f => ({ id: f.id, label: f.raisonSociale }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.facturesFournisseurs.list({ page, limit: pageSize });
      setFactures(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { setFactures([]); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const changePageSize = (n: number) => { setPageSize(n); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    api.get('/fournisseurs', { params: { limit: 200 } }).then(r => setFournisseurs(r.data.data || [])).catch(() => setFournisseurs([]));
  }, []);

  const totaux = factures.reduce((acc, f) => ({
    ttc: acc.ttc + Number(f.montantTTC), paye: acc.paye + Number(f.montantPaye), reste: acc.reste + Number(f.resteAPayer),
  }), { ttc: 0, paye: 0, reste: 0 });

  const openDetail = (id: string) => { router.push(`/facturation-fournisseurs/${id}`); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await financeApi.facturesFournisseurs.create({
        fournisseurId: form.fournisseurId, dossierId: form.dossierId || undefined,
        dateEcheance: form.dateEcheance, reference: form.reference || undefined,
        objet: form.objet || undefined, observations: form.observations || undefined,
      });
      toast.success('Facture fournisseur créée');
      setShowModal(false);
      setForm({ fournisseurId: '', dossierId: '', dateEcheance: '', reference: '', objet: '', observations: '' });
      router.push(`/facturation-fournisseurs/${res.data.data.id}`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const date = (f: any) => new Date(f.dateEcheance).toLocaleDateString('fr-FR');
  const statut = (f: any) => (f.statut || '').replace(/_/g, ' ');
  const dossier = (f: any) => f.dossier?.numeroPhysique || f.dossier?.numero || '—';
  const colonnes = [
    { cle: 'numero', libelle: 'N° facture', texte: (f: any) => f.numero, rendu: (f: any) => <Numero>{f.numero}</Numero> },
    { cle: 'date', libelle: 'Échéance', texte: date, rendu: (f: any) => <Discret>{date(f)}</Discret> },
    { cle: 'fournisseur', libelle: 'Fournisseur', texte: (f: any) => f.fournisseur?.raisonSociale || '', rendu: (f: any) => <Tronque texte={f.fournisseur?.raisonSociale} largeur="18rem" /> },
    { cle: 'dossier', libelle: 'Dossier', masquerSous: 'xl' as const, texte: dossier, rendu: (f: any) => <Discret>{dossier(f)}</Discret> },
    { cle: 'ttc', libelle: 'Total TTC', align: 'right' as const, texte: (f: any) => String(f.montantTTC), rendu: (f: any) => <Montant valeur={f.montantTTC} /> },
    { cle: 'paye', libelle: 'Payé', align: 'right' as const, masquerSous: 'xl' as const, texte: (f: any) => String(f.montantPaye), rendu: (f: any) => <Montant valeur={f.montantPaye} ton="positif" /> },
    { cle: 'reste', libelle: 'Reste', align: 'right' as const, texte: (f: any) => String(f.resteAPayer), rendu: (f: any) => <Montant valeur={f.resteAPayer} ton="negatif" /> },
    { cle: 'statut', libelle: 'Statut', texte: statut, rendu: (f: any) => <StatutPastille libelle={statut(f)} ton={tonDepuisBadge(statutColors[f.statut])} /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Facturation fournisseur"
          sousTitre={`${total} facture(s) fournisseur`}
          actions={<button onClick={() => setShowModal(true)} className="btn-primary">+ Nouvelle facture</button>}
        />

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <KpiCard label="Total facturé" value={fmt(totaux.ttc)} unit="F" icon="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          <KpiCard label="Total payé" value={fmt(totaux.paye)} unit="F" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" iconClass="text-green-600" />
          <KpiCard label="Reste à payer" value={fmt(totaux.reste)} unit="F" icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" iconClass="text-red-600" />
        </div>

        <ListeResponsive
          colonnes={colonnes}
          lignes={factures}
          cleLigne={(f: any) => f.id}
          chargement={loading}
          nomExport="factures-fournisseurs"
          onClic={(f: any) => openDetail(f.id)}
          actions={(f: any) => <BoutonIcone titre="Voir" ton="primaire" href={`/facturation-fournisseurs/${f.id}`}><IconeVoir /></BoutonIcone>}
          carte={(f: any) => ({ titre: f.numero, sousTitre: f.fournisseur?.raisonSociale || '—', droite: <Montant valeur={f.resteAPayer} ton="negatif" />, details: <span className="inline-flex flex-wrap items-center gap-2">{date(f)}<StatutPastille libelle={statut(f)} ton={tonDepuisBadge(statutColors[f.statut])} /></span> })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: changePageSize }}
          vide={<EmptyState titre="Aucune facture fournisseur" description="Créez une première facture fournisseur." />}
        />

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
                <h2 className="text-lg font-bold">Nouvelle Facture Fournisseur</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div><label className="label">Fournisseur *</label>
                  <PickerField value={form.fournisseurId} onChange={id => setForm({ ...form, fournisseurId: id })} options={fournisseurOptions} placeholder="Sélectionner..." title="Sélectionner un fournisseur" searchPlaceholder="Raison sociale..." required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Échéance *</label><input type="date" value={form.dateEcheance} onChange={e => setForm({ ...form, dateEcheance: e.target.value })} className="input-field" required /></div>
                  <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
                </div>
                <div><label className="label">Objet</label><input type="text" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} className="input-field" /></div>
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
