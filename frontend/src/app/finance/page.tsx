'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import ListeResponsive from '@/components/tables/ListeResponsive';
import EmptyState from '@/components/ui/EmptyState';
import { Avatar, Numero, Discret, Tronque, Montant, StatutPastille } from '@/components/tables/cellules';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import { useAuthStore } from '@/stores/authStore';
import ComptesBancairesManager from '@/components/finance/ComptesBancairesManager';

const MONTANT_MASQUE = '•••••••';

type TypeKey = 'CAISSE' | 'BANQUE' | 'TIERS' | 'CLIENT' | 'FOURNISSEUR';
type IconKind = 'Caisse' | 'Banque' | 'Tiers' | 'Client' | 'Fournisseur';

const TYPE_LABELS: Record<TypeKey, string> = {
  CAISSE: 'Caisses', BANQUE: 'Comptes Bancaires', TIERS: 'Comptes Tiers', CLIENT: 'Clients', FOURNISSEUR: 'Fournisseurs',
};
const TYPE_ICON: Record<TypeKey, IconKind> = {
  CAISSE: 'Caisse', BANQUE: 'Banque', TIERS: 'Tiers', CLIENT: 'Client', FOURNISSEUR: 'Fournisseur',
};

const ACCOUNT_ICON_BG: Record<IconKind, string> = {
  Caisse: 'bg-primary-600', Banque: 'bg-blue-600', Tiers: 'bg-amber-600', Client: 'bg-green-600', Fournisseur: 'bg-rose-600',
};

function AccountIcon({ kind }: { kind: IconKind }) {
  const bg = ACCOUNT_ICON_BG[kind] || 'bg-gray-500';
  if (kind === 'Caisse') {
    return (
      <div className={`w-10 h-10 rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}>
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
      </div>
    );
  }
  if (kind === 'Banque') {
    return (
      <div className={`w-10 h-10 rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}>
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6" /></svg>
      </div>
    );
  }
  if (kind === 'Client' || kind === 'Fournisseur') {
    return (
      <div className={`w-10 h-10 rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}>
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
      </div>
    );
  }
  return (
    <div className={`w-10 h-10 rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}>
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-2.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 10-3-6.65" /></svg>
    </div>
  );
}

interface AccountCardItem {
  id: string;
  kind: IconKind;
  libelle: string;
  sub: string;
  solde: number;
  devise: string;
  onClick: () => void;
}

function AccountGrid({ items, canSeeMontants }: { items: AccountCardItem[]; canSeeMontants: boolean }) {
  if (items.length === 0) return <div className="card text-center text-gray-500 py-8">Aucun compte dans cette catégorie</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
      {items.map(c => {
        const tiers = c.kind === 'Client' || c.kind === 'Fournisseur';
        return (
          <button key={c.id} type="button" onClick={c.onClick}
            className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-card transition-all hover:border-azure hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-azure dark:border-surface-700 dark:bg-surface-800">
            {tiers ? <Avatar nom={c.libelle} /> : <AccountIcon kind={c.kind} />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-gray-900 dark:text-white" title={c.libelle}>{c.libelle}</span>
              <span className="block truncate text-[12px] text-gray-500">{c.sub}</span>
            </span>
            <span className="flex-shrink-0 text-right">
              <span className={`block text-[15px] font-bold tabular-nums leading-tight ${tiers ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{canSeeMontants ? fmt(c.solde) : MONTANT_MASQUE}</span>
              <span className="block text-[11px] text-gray-400">{c.devise}</span>
            </span>
            <svg aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-azure" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        );
      })}
    </div>
  );
}

export default function ComptesPage() {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const { caisses, comptes, tiers, loading } = useComptesFinanciers();
  const [comptesClients, setComptesClients] = useState<any[]>([]);
  const [comptesFournisseurs, setComptesFournisseurs] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<TypeKey | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<{ type: TypeKey; id: string } | null>(null);

  useEffect(() => {
    financeApi.comptesClients.list().then(r => setComptesClients(r.data.data || [])).catch(() => setComptesClients([]));
    financeApi.comptesFournisseurs.list().then(r => setComptesFournisseurs(r.data.data || [])).catch(() => setComptesFournisseurs([]));
  }, []);

  const comptesActifs = [
    ...caisses.map(c => ({ ...c, kind: 'Caisse', compteType: 'CAISSE' as const })),
    ...comptes.map(c => ({ ...c, kind: 'Banque', compteType: 'BANQUE' as const })),
    ...tiers.map(c => ({ ...c, kind: c.type, compteType: 'TIERS' as const })),
  ].filter(c => c.actif);

  const caissesItems: AccountCardItem[] = caisses.filter(c => c.actif).map(c => ({ id: c.id, kind: 'Caisse', libelle: c.libelle, sub: 'Espèces', solde: Number(c.solde), devise: c.devise, onClick: () => setSelectedAccount({ type: 'CAISSE', id: c.id }) }));
  const banquesItems: AccountCardItem[] = comptes.filter(c => c.actif).map(c => ({ id: c.id, kind: 'Banque', libelle: c.libelle, sub: c.banque, solde: Number(c.solde), devise: c.devise, onClick: () => setSelectedAccount({ type: 'BANQUE', id: c.id }) }));
  const tiersItems: AccountCardItem[] = tiers.filter(c => c.actif).map(c => ({ id: c.id, kind: 'Tiers', libelle: c.libelle, sub: c.type, solde: Number(c.solde), devise: c.devise, onClick: () => setSelectedAccount({ type: 'TIERS', id: c.id }) }));
  const clientsItems: AccountCardItem[] = comptesClients.filter(c => Number(c.resteAPayer) > 0).map(c => ({ id: c.id, kind: 'Client', libelle: c.raisonSociale, sub: c.code, solde: Number(c.resteAPayer), devise: 'XOF', onClick: () => setSelectedAccount({ type: 'CLIENT', id: c.id }) }));
  const fournisseursItems: AccountCardItem[] = comptesFournisseurs.filter(c => Number(c.resteAPayer) > 0).map(c => ({ id: c.id, kind: 'Fournisseur', libelle: c.raisonSociale, sub: c.code, solde: Number(c.resteAPayer), devise: 'XOF', onClick: () => setSelectedAccount({ type: 'FOURNISSEUR', id: c.id }) }));

  const ITEMS_BY_TYPE: Record<TypeKey, AccountCardItem[]> = { CAISSE: caissesItems, BANQUE: banquesItems, TIERS: tiersItems, CLIENT: clientsItems, FOURNISSEUR: fournisseursItems };

  const tresorerie = [...caisses, ...comptes].reduce((s, c) => s + Number(c.solde), 0);
  const totalCreances = clientsItems.reduce((s, c) => s + c.solde, 0);
  const totalDettes = fournisseursItems.reduce((s, c) => s + c.solde, 0);
  const positionNette = tresorerie + totalCreances - totalDettes;

  const typeTiles: { type: TypeKey; count: number; total: number }[] = [
    { type: 'CAISSE' as TypeKey, count: caissesItems.length, total: caissesItems.reduce((s, c) => s + c.solde, 0) },
    { type: 'BANQUE' as TypeKey, count: banquesItems.length, total: banquesItems.reduce((s, c) => s + c.solde, 0) },
    { type: 'TIERS' as TypeKey, count: tiersItems.length, total: tiersItems.reduce((s, c) => s + c.solde, 0) },
    { type: 'CLIENT' as TypeKey, count: clientsItems.length, total: totalCreances },
    { type: 'FOURNISSEUR' as TypeKey, count: fournisseursItems.length, total: totalDettes },
  ];

  // Vue 3 — transactions d'un compte
  if (selectedAccount) {
    if (selectedAccount.type === 'CLIENT' || selectedAccount.type === 'FOURNISSEUR') {
      return (
        <AppLayout>
          <div className="space-y-6">
            <TiersDetailView type={selectedAccount.type} id={selectedAccount.id} onBack={() => setSelectedAccount(null)} />
          </div>
        </AppLayout>
      );
    }
    return (
      <AppLayout>
        <div className="space-y-6">
          <CompteDetailView compte={{ type: selectedAccount.type as 'CAISSE' | 'BANQUE' | 'TIERS', id: selectedAccount.id }} comptesActifs={comptesActifs} onBack={() => setSelectedAccount(null)} />
        </div>
      </AppLayout>
    );
  }

  // Vue 2 — comptes d'un type
  if (selectedType) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <button onClick={() => setSelectedType(null)} className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[13px] font-medium text-primary-600 shadow-sm transition-colors hover:border-azure focus:outline-none focus-visible:ring-2 focus-visible:ring-azure dark:border-surface-600 dark:bg-surface-800 dark:text-primary-300">← Tous les types de compte</button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{TYPE_LABELS[selectedType]}</h1>
            <p className="text-sm text-gray-500">{selectedType === 'BANQUE' ? 'Gestion des comptes bancaires. Cliquez sur un compte pour voir son historique.' : 'Sélectionnez un compte pour voir ses transactions.'}</p>
          </div>
          {selectedType === 'BANQUE' ? (
            <ComptesBancairesManager onSelectAccount={(id) => setSelectedAccount({ type: 'BANQUE', id })} />
          ) : loading ? (
            <div className="card text-center text-gray-500 py-8">Chargement...</div>
          ) : (
            <AccountGrid items={ITEMS_BY_TYPE[selectedType]} canSeeMontants={canSeeMontants} />
          )}
        </div>
      </AppLayout>
    );
  }

  // Vue 1 — types de compte
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader titre="Comptes" sousTitre="Vue consolidée de la trésorerie : caisses, banques et comptes tiers. Ouvrez un type de compte pour voir ses comptes." sousTitreMasqueMobile />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <KpiCard label="Trésorerie disponible" value={canSeeMontants ? fmt(tresorerie) : MONTANT_MASQUE} unit="F" icon="M3 7h16a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l2-3h12M16 13h3" iconClass="text-blue-600" context={`${caissesItems.length + banquesItems.length} comptes`} />
          <Link href="/finance/creances-clients" className="block min-w-0 hover:opacity-90 transition-opacity"><KpiCard label="Créances clients" value={canSeeMontants ? fmt(totalCreances) : MONTANT_MASQUE} unit="F" icon="M7 17l10-10M7 7h10v10" iconClass="text-green-600" context="à recevoir" /></Link>
          <Link href="/finance/dettes-fournisseurs" className="block min-w-0 hover:opacity-90 transition-opacity"><KpiCard label="Dettes fournisseurs" value={canSeeMontants ? fmt(totalDettes) : MONTANT_MASQUE} unit="F" icon="M17 7L7 17M17 17H7V7" iconClass="text-orange-500" context="à payer" /></Link>
          <KpiCard label="Position nette" value={canSeeMontants ? fmt(positionNette) : MONTANT_MASQUE} unit="F" icon="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" iconClass={positionNette >= 0 ? 'text-primary-600' : 'text-red-600'} context="dispo + créances − dettes" />
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Types de compte</h3>
          {loading ? <div className="card text-center text-gray-500 py-8">Chargement...</div> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {typeTiles.map(t => (
                <button key={t.type} type="button" onClick={() => setSelectedType(t.type)}
                  className="group flex min-w-0 flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-card transition-all hover:border-azure hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-azure dark:border-surface-700 dark:bg-surface-800 sm:p-4">
                  <span className="flex items-center justify-between">
                    <AccountIcon kind={TYPE_ICON[t.type]} />
                    <svg aria-hidden="true" className="h-4 w-4 text-gray-300 transition-colors group-hover:text-azure" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-gray-900 dark:text-white">{TYPE_LABELS[t.type]}</span>
                    <span className="block text-[12px] text-gray-500">{t.count} compte{t.count > 1 ? 's' : ''}</span>
                  </span>
                  <span className="block truncate text-[17px] font-extrabold tabular-nums text-primary-600 dark:text-white sm:text-[19px]">{canSeeMontants ? fmt(t.total) : MONTANT_MASQUE} <span className="text-[11px] font-medium text-gray-400">XOF</span></span>
                </button>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CompteDetailView({ compte, comptesActifs, onBack }: { compte: { type: 'CAISSE' | 'BANQUE' | 'TIERS'; id: string }; comptesActifs: any[]; onBack: () => void }) {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const c = comptesActifs.find(x => x.id === compte.id);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(rows);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 100, dateDebut: dateDebut || undefined, dateFin: dateFin || undefined };
      if (compte.type === 'CAISSE') params.caisseId = compte.id;
      else if (compte.type === 'BANQUE') params.compteBancaireId = compte.id;
      else params.compteTiersId = compte.id;
      const res = await financeApi.operations.list(params);
      setRows(res.data.data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [compte, dateDebut, dateFin]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  if (!c) return <div className="card text-center text-gray-500 py-8"><button onClick={onBack} className="btn-secondary mb-4">← Retour</button><p>Compte introuvable</p></div>;

  return (
    <div className="space-y-4">
      <div>
        <button onClick={onBack} className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[13px] font-medium text-primary-600 shadow-sm transition-colors hover:border-azure focus:outline-none focus-visible:ring-2 focus-visible:ring-azure dark:border-surface-600 dark:bg-surface-800 dark:text-primary-300">← {TYPE_LABELS[compte.type]}</button>
        <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-primary-600 dark:text-white">{c.kind === 'Banque' ? `${c.libelle} (${c.banque})` : c.libelle}</h2>
        <p className="text-sm text-gray-500">{c.kind} · Solde courant : <span className="font-bold text-gray-900 dark:text-white">{canSeeMontants ? `${fmt(c.solde)} ${c.devise}` : MONTANT_MASQUE}</span></p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800">
        <div><label className="label !mb-1" htmlFor="compte-du">Du</label><input id="compte-du" type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field !w-auto" /></div>
        <div><label className="label !mb-1" htmlFor="compte-au">Au</label><input id="compte-au" type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field !w-auto" /></div>
        <button onClick={load} className="btn-primary">Afficher</button>
      </div>
      <ListeResponsive
        colonnes={[
          { cle: 'date', libelle: 'Date', texte: (op: any) => new Date(op.dateOperation).toLocaleDateString('fr-FR'), rendu: (op: any) => <Discret>{new Date(op.dateOperation).toLocaleDateString('fr-FR')}</Discret> },
          { cle: 'sens', libelle: 'Sens', texte: (op: any) => (op.sens === 'ENTREE' ? 'Entrée' : 'Sortie'), rendu: (op: any) => <StatutPastille libelle={op.sens === 'ENTREE' ? 'Entrée' : 'Sortie'} ton={op.sens === 'ENTREE' ? 'success' : 'danger'} /> },
          { cle: 'origine', libelle: 'Origine', texte: (op: any) => op.libelle || '', rendu: (op: any) => <Tronque texte={op.libelle} largeur="26rem" /> },
          { cle: 'ref', libelle: 'Réf.', masquerSous: 'xl' as const, texte: (op: any) => op.reference || op.numero || '', rendu: (op: any) => <Numero>{op.reference || op.numero}</Numero> },
          { cle: 'montant', libelle: 'Montant', align: 'right' as const, texte: (op: any) => String(op.montant), rendu: (op: any) => (canSeeMontants ? <Montant valeur={op.montant} ton={op.sens === 'ENTREE' ? 'positif' : 'negatif'} /> : MONTANT_MASQUE) },
        ]}
        lignes={paged}
        cleLigne={(op: any) => op.id}
        chargement={loading}
        nomExport="transactions-compte"
        carte={(op: any) => ({ titre: op.libelle || op.numero, sousTitre: new Date(op.dateOperation).toLocaleDateString('fr-FR'), statut: <StatutPastille libelle={op.sens === 'ENTREE' ? 'Entrée' : 'Sortie'} ton={op.sens === 'ENTREE' ? 'success' : 'danger'} />, droite: canSeeMontants ? <Montant valeur={op.montant} ton={op.sens === 'ENTREE' ? 'positif' : 'negatif'} /> : MONTANT_MASQUE, details: op.reference || op.numero })}
        pagination={total > 10 ? { page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize } : undefined}
        vide={<EmptyState titre="Aucune transaction sur cette période" description="Élargissez les dates ou retirez le filtre." />}
      />
    </div>
  );
}

function TiersDetailView({ type, id, onBack }: { type: 'CLIENT' | 'FOURNISSEUR'; id: string; onBack: () => void }) {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('FINANCE:VOIR_MONTANTS');
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination((detail?.paiements || []) as any[]);

  useEffect(() => {
    setLoading(true);
    const api = type === 'CLIENT' ? financeApi.comptesClients : financeApi.comptesFournisseurs;
    api.get(id).then(r => setDetail(r.data.data)).catch(() => setDetail(null)).finally(() => setLoading(false));
  }, [type, id]);

  if (loading) return <div className="card text-center text-gray-500 py-8">Chargement...</div>;
  if (!detail) return <div className="card text-center text-gray-500 py-8"><button onClick={onBack} className="btn-secondary mb-4">← Retour</button><p>Compte introuvable</p></div>;

  const tiers = type === 'CLIENT' ? detail.client : detail.fournisseur;
  const factures = detail.factures || [];
  const paiements = detail.paiements || [];
  const resteAPayer = factures.reduce((s: number, f: any) => s + Number(f.resteAPayer), 0);
  const facturesDe = (p: any) => (p.affectations || []).map((a: any) => a.facture?.numero || a.factureFournisseur?.numero).filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      <div>
        <button onClick={onBack} className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[13px] font-medium text-primary-600 shadow-sm transition-colors hover:border-azure focus:outline-none focus-visible:ring-2 focus-visible:ring-azure dark:border-surface-600 dark:bg-surface-800 dark:text-primary-300">← {TYPE_LABELS[type]}</button>
        <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-primary-600 dark:text-white">{tiers?.raisonSociale}</h2>
        <p className="text-sm text-gray-500">{type === 'CLIENT' ? 'Client' : 'Fournisseur'} · Solde dû : <span className="font-bold text-red-600">{canSeeMontants ? `${fmt(resteAPayer)} XOF` : MONTANT_MASQUE}</span></p>
      </div>

      <section aria-labelledby="titre-paiements" className="space-y-2">
        <h3 id="titre-paiements" className="text-[15px] font-extrabold text-primary-600 dark:text-white">Transactions (paiements)</h3>
        <ListeResponsive
          colonnes={[
            { cle: 'date', libelle: 'Date', texte: (p: any) => new Date(p.datePaiement).toLocaleDateString('fr-FR'), rendu: (p: any) => <Discret>{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</Discret> },
            { cle: 'num', libelle: 'N° transaction', texte: (p: any) => p.numero, rendu: (p: any) => <Numero>{p.numero}</Numero> },
            { cle: 'fact', libelle: 'Facture(s)', masquerSous: 'xl' as const, texte: (p: any) => facturesDe(p), rendu: (p: any) => <span className="font-mono text-[13px]">{facturesDe(p) || '—'}</span> },
            { cle: 'montant', libelle: 'Montant', align: 'right' as const, texte: (p: any) => String(p.montant), rendu: (p: any) => (canSeeMontants ? <Montant valeur={p.montant} ton="positif" /> : MONTANT_MASQUE) },
          ]}
          lignes={paged}
          cleLigne={(p: any) => p.id}
          nomExport="paiements-compte"
          carte={(p: any) => ({ titre: p.numero, sousTitre: new Date(p.datePaiement).toLocaleDateString('fr-FR'), droite: canSeeMontants ? <Montant valeur={p.montant} ton="positif" /> : MONTANT_MASQUE, details: facturesDe(p) || undefined })}
          pagination={total > 10 ? { page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize } : undefined}
          vide={<EmptyState titre="Aucun paiement enregistré" description="Les paiements apparaissent ici dès qu'ils sont saisis." />}
        />
      </section>

      <section aria-labelledby="titre-factures" className="space-y-2">
        <h3 id="titre-factures" className="text-[15px] font-extrabold text-primary-600 dark:text-white">Factures</h3>
        <ListeResponsive
          colonnes={[
            { cle: 'num', libelle: 'N°', texte: (f: any) => f.numero, rendu: (f: any) => <Numero>{f.numero}</Numero> },
            { cle: 'date', libelle: 'Date', texte: (f: any) => new Date(f.dateFacture).toLocaleDateString('fr-FR'), rendu: (f: any) => <Discret>{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</Discret> },
            { cle: 'ttc', libelle: 'TTC', align: 'right' as const, texte: (f: any) => String(f.montantTTC), rendu: (f: any) => (canSeeMontants ? <Montant valeur={f.montantTTC} /> : MONTANT_MASQUE) },
            { cle: 'paye', libelle: 'Payé', align: 'right' as const, masquerSous: 'xl' as const, texte: (f: any) => String(f.montantPaye), rendu: (f: any) => (canSeeMontants ? <Montant valeur={f.montantPaye} ton="positif" /> : MONTANT_MASQUE) },
            { cle: 'reste', libelle: 'Reste', align: 'right' as const, texte: (f: any) => String(f.resteAPayer), rendu: (f: any) => (canSeeMontants ? <Montant valeur={f.resteAPayer} ton="negatif" /> : MONTANT_MASQUE) },
            { cle: 'statut', libelle: 'Statut', texte: (f: any) => String(f.statut || '').replace(/_/g, ' '), rendu: (f: any) => <StatutPastille libelle={String(f.statut || '').replace(/_/g, ' ')} ton="info" /> },
          ]}
          lignes={factures}
          cleLigne={(f: any) => f.id}
          nomExport="factures-compte"
          carte={(f: any) => ({ titre: f.numero, sousTitre: new Date(f.dateFacture).toLocaleDateString('fr-FR'), droite: canSeeMontants ? <Montant valeur={f.resteAPayer} ton="negatif" /> : MONTANT_MASQUE, details: <span className="flex flex-col gap-1"><StatutPastille libelle={String(f.statut || '').replace(/_/g, ' ')} ton="info" />{canSeeMontants && <span>{`TTC ${fmt(f.montantTTC)} · payé ${fmt(f.montantPaye)}`}</span>}</span> })}
          vide={<EmptyState titre="Aucune facture" description="Aucune facture n'est rattachée à ce compte." />}
        />
      </section>
    </div>
  );
}
