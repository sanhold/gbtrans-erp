'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeValider } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant } from '@/components/tables/cellules';
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
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Comptes bancaires désactivés"
          sousTitre="Touchez un compte pour consulter son historique de transactions"
          actions={<Link href="/finance/comptes-bancaires" className="btn-secondary">← Comptes bancaires</Link>}
        />
        <ListeResponsive
          colonnes={[
            { cle: 'code', libelle: 'Code', texte: (c: any) => c.code, rendu: (c: any) => <Numero>{c.code}</Numero> },
            { cle: 'libelle', libelle: 'Libellé', texte: (c: any) => c.libelle, rendu: (c: any) => <Tronque texte={c.libelle} largeur="20rem" /> },
            { cle: 'banque', libelle: 'Banque', texte: (c: any) => c.banque || '', rendu: (c: any) => <Tronque texte={c.banque} largeur="12rem" /> },
            { cle: 'devise', libelle: 'Devise', masquerSous: 'xl' as const, texte: (c: any) => c.devise, rendu: (c: any) => <Discret>{c.devise}</Discret> },
            { cle: 'solde', libelle: 'Solde', align: 'right' as const, texte: (c: any) => String(c.solde), rendu: (c: any) => <Montant valeur={c.solde} /> },
          ]}
          lignes={paged}
          cleLigne={(c: any) => c.id}
          chargement={loading}
          nomExport="comptes-desactives"
          onClic={(c: any) => setSelectedId(c.id)}
          actions={(c: any) => <BoutonIcone titre="Réactiver" ton="primaire" onClick={() => reactiver(c.id)}><IconeValider /></BoutonIcone>}
          carte={(c: any) => ({ titre: c.libelle, sousTitre: `${c.code} — ${c.banque || ''}`, droite: <Montant valeur={c.solde} /> })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre="Aucun compte désactivé" description="Les comptes désactivés apparaîtront ici." />}
        />
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
    <div className="space-y-3 sm:space-y-4">
      <PageHeader
        titre={compte.libelle}
        sousTitre={`${compte.banque} — solde à la désactivation : ${fmt(compte.solde)} ${compte.devise}`}
        actions={
          <>
            <button onClick={onBack} className="btn-secondary">← Comptes désactivés</button>
            <button onClick={() => onReactiver(compte.id)} className="btn-primary">Réactiver ce compte</button>
          </>
        }
      />

      <div className="card !p-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
        <div><label className="label !mb-1">Du</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field sm:!w-auto" /></div>
        <div><label className="label !mb-1">Au</label><input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field sm:!w-auto" /></div>
        <button onClick={load} className="btn-primary col-span-2 sm:col-span-1">Afficher</button>
      </div>

      <ListeResponsive
        colonnes={[
          { cle: 'd', libelle: 'Date', texte: (op: any) => new Date(op.dateOperation).toLocaleDateString('fr-FR'), rendu: (op: any) => <Discret>{new Date(op.dateOperation).toLocaleDateString('fr-FR')}</Discret> },
          { cle: 's', libelle: 'Sens', texte: (op: any) => (op.sens === 'ENTREE' ? 'Entrée' : 'Sortie'), rendu: (op: any) => op.sens === 'ENTREE' ? <span className="text-[13px] font-medium text-green-600">↘ Entrée</span> : <span className="text-[13px] font-medium text-red-600">↗ Sortie</span> },
          { cle: 'o', libelle: 'Origine', texte: (op: any) => op.libelle || '', rendu: (op: any) => <Tronque texte={op.libelle} largeur="22rem" /> },
          { cle: 'r', libelle: 'Réf.', texte: (op: any) => op.reference || op.numero || '', rendu: (op: any) => <Numero>{op.reference || op.numero}</Numero> },
          { cle: 'm', libelle: 'Montant', align: 'right' as const, texte: (op: any) => String(op.montant), rendu: (op: any) => <Montant valeur={op.montant} ton={op.sens === 'ENTREE' ? 'positif' : 'negatif'} /> },
        ]}
        lignes={paged}
        cleLigne={(op: any) => op.id}
        chargement={loading}
        nomExport="transactions-compte"
        carte={(op: any) => ({ titre: op.libelle || op.numero, sousTitre: `${new Date(op.dateOperation).toLocaleDateString('fr-FR')} — ${op.reference || op.numero || ''}`, droite: <Montant valeur={op.montant} ton={op.sens === 'ENTREE' ? 'positif' : 'negatif'} />, details: op.sens === 'ENTREE' ? '↘ Entrée' : '↗ Sortie' })}
        pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
        vide={<EmptyState titre="Aucune transaction" description="Aucune transaction sur cette période." />}
      />
    </div>
  );
}
