'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PaginationControls from '@/components/tables/PaginationControls';
import { financeApi } from '@/lib/api';
import { fmt, useComptesFinanciers } from '@/lib/financeHelpers';
import { usePagination } from '@/lib/usePagination';
import ComptesBancairesManager from '@/components/finance/ComptesBancairesManager';

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

function AccountGrid({ items }: { items: AccountCardItem[] }) {
  if (items.length === 0) return <div className="card text-center text-gray-500 py-8">Aucun compte dans cette catégorie</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(c => (
        <div key={c.id} onClick={c.onClick} className="card relative cursor-pointer hover:shadow-elevated hover:border-primary-300 transition-all">
          <span className="absolute top-4 right-4 text-gray-300 dark:text-gray-600">→</span>
          <AccountIcon kind={c.kind} />
          <h3 className="font-semibold text-gray-900 dark:text-white mt-3 truncate">{c.libelle}</h3>
          <p className="text-xs text-gray-500 truncate">{c.sub}</p>
          <p className={`text-xl font-bold mt-3 ${(c.kind === 'Client' || c.kind === 'Fournisseur') ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{fmt(c.solde)} <span className="text-xs font-normal text-gray-500">{c.devise}</span></p>
        </div>
      ))}
    </div>
  );
}

export default function ComptesPage() {
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
            <button onClick={() => setSelectedType(null)} className="text-sm text-primary-600 hover:underline mb-2">← Tous les types de compte</button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{TYPE_LABELS[selectedType]}</h1>
            <p className="text-sm text-gray-500">{selectedType === 'BANQUE' ? 'Gestion des comptes bancaires. Cliquez sur un compte pour voir son historique.' : 'Sélectionnez un compte pour voir ses transactions.'}</p>
          </div>
          {selectedType === 'BANQUE' ? (
            <ComptesBancairesManager onSelectAccount={(id) => setSelectedAccount({ type: 'BANQUE', id })} />
          ) : loading ? (
            <div className="card text-center text-gray-500 py-8">Chargement...</div>
          ) : (
            <AccountGrid items={ITEMS_BY_TYPE[selectedType]} />
          )}
        </div>
      </AppLayout>
    );
  }

  // Vue 1 — types de compte
  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comptes</h1><p className="text-sm text-gray-500">Vue consolidée de la trésorerie : comptes de caisse et banque, plus les comptes tiers (clients à recevoir, fournisseurs à payer). Ouvrez un type de compte pour voir ses comptes.</p></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Trésorerie disponible</p><p className="text-lg font-bold text-green-600">{fmt(tresorerie)} F</p><p className="text-xs text-gray-400 mt-0.5">{caissesItems.length + banquesItems.length} comptes</p></div>
          <Link href="/finance/creances-clients" className="stat-card !p-4 block cursor-pointer hover:shadow-elevated hover:border-primary-300 transition-all"><p className="text-[10px] text-gray-500 uppercase">Créances clients</p><p className="text-lg font-bold text-green-600">{fmt(totalCreances)} F</p><p className="text-xs text-gray-400 mt-0.5">à recevoir</p></Link>
          <Link href="/finance/dettes-fournisseurs" className="stat-card !p-4 block cursor-pointer hover:shadow-elevated hover:border-primary-300 transition-all"><p className="text-[10px] text-gray-500 uppercase">Dettes fournisseurs</p><p className="text-lg font-bold text-amber-600">{fmt(totalDettes)} F</p><p className="text-xs text-gray-400 mt-0.5">à payer</p></Link>
          <div className="stat-card !p-4"><p className="text-[10px] text-gray-500 uppercase">Position nette</p><p className={`text-lg font-bold ${positionNette >= 0 ? 'text-primary-600' : 'text-red-600'}`}>{fmt(positionNette)} F</p><p className="text-xs text-gray-400 mt-0.5">dispo + créances − dettes</p></div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Types de compte</h3>
          {loading ? <div className="card text-center text-gray-500 py-8">Chargement...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {typeTiles.map(t => (
                <div key={t.type} onClick={() => setSelectedType(t.type)} className="card relative cursor-pointer hover:shadow-elevated hover:border-primary-300 transition-all">
                  <span className="absolute top-4 right-4 text-gray-300 dark:text-gray-600">→</span>
                  <AccountIcon kind={TYPE_ICON[t.type]} />
                  <h3 className="font-semibold text-gray-900 dark:text-white mt-3">{TYPE_LABELS[t.type]}</h3>
                  <p className="text-xs text-gray-500">{t.count} compte{t.count > 1 ? 's' : ''}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-3">{fmt(t.total)} <span className="text-xs font-normal text-gray-500">XOF</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CompteDetailView({ compte, comptesActifs, onBack }: { compte: { type: 'CAISSE' | 'BANQUE' | 'TIERS'; id: string }; comptesActifs: any[]; onBack: () => void }) {
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
        <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-2">← {TYPE_LABELS[compte.type]}</button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{c.kind === 'Banque' ? `${c.libelle} (${c.banque})` : c.libelle}</h2>
        <p className="text-sm text-gray-500">{c.kind} · Solde courant : <span className="font-bold text-gray-900 dark:text-white">{fmt(c.solde)} {c.devise}</span></p>
      </div>

      <div className="card">
        <div className="flex items-end justify-between flex-wrap gap-3 p-4 border-b border-gray-200 dark:border-surface-700">
          <h3 className="text-sm font-semibold">Transactions du compte</h3>
          <div className="flex items-end flex-wrap gap-3">
            <div><label className="label !mb-1">Du</label><input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field !w-auto" /></div>
            <div><label className="label !mb-1">Au</label><input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field !w-auto" /></div>
            <button onClick={load} className="btn-primary">Afficher</button>
          </div>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Date</th><th className="table-header">Sens</th><th className="table-header">Origine</th><th className="table-header">Réf.</th><th className="table-header text-right">Montant</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">Chargement...</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">Aucune transaction sur cette période</td></tr>
              : paged.map(op => (
                <tr key={op.id} className="table-row">
                  <td className="table-cell text-xs" data-label="Date">{new Date(op.dateOperation).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell" data-label="Sens">{op.sens === 'ENTREE' ? <span className="text-green-600 font-medium">↘ Entrée</span> : <span className="text-red-600 font-medium">↗ Sortie</span>}</td>
                  <td className="table-cell" data-label="Origine">{op.libelle}</td>
                  <td className="table-cell font-mono text-xs text-primary-600" data-label="Réf.">{op.reference || op.numero}</td>
                  <td className={`table-cell text-right font-mono font-semibold ${op.sens === 'ENTREE' ? 'text-green-600' : 'text-red-600'}`} data-label="Montant">{op.sens === 'ENTREE' ? '+' : '-'}{fmt(op.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </div>
  );
}

function TiersDetailView({ type, id, onBack }: { type: 'CLIENT' | 'FOURNISSEUR'; id: string; onBack: () => void }) {
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

  return (
    <div className="space-y-4">
      <div>
        <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-2">← {TYPE_LABELS[type]}</button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tiers?.raisonSociale}</h2>
        <p className="text-sm text-gray-500">{type === 'CLIENT' ? 'Client' : 'Fournisseur'} · Solde dû : <span className="font-bold text-red-600">{fmt(resteAPayer)} XOF</span></p>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-surface-700"><h3 className="text-sm font-semibold">Transactions (paiements)</h3></div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Date</th><th className="table-header">N° Transaction</th><th className="table-header">Facture(s)</th><th className="table-header text-right">Montant</th></tr></thead>
            <tbody>
              {paiements.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-500">Aucun paiement enregistré</td></tr>
              : paged.map((p: any) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell text-xs" data-label="Date">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell font-mono text-xs text-primary-600" data-label="N° Transaction">{p.numero}</td>
                  <td className="table-cell text-xs" data-label="Facture(s)">{(p.affectations || []).map((a: any) => a.facture?.numero || a.factureFournisseur?.numero).join(', ') || '-'}</td>
                  <td className="table-cell text-right font-mono font-semibold text-green-600" data-label="Montant">{fmt(p.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-surface-700"><h3 className="text-sm font-semibold">Factures</h3></div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">N°</th><th className="table-header">Date</th><th className="table-header text-right">TTC</th><th className="table-header text-right">Payé</th><th className="table-header text-right">Reste</th><th className="table-header">Statut</th></tr></thead>
            <tbody>
              {factures.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucune facture</td></tr>
              : factures.map((f: any) => (
                <tr key={f.id} className="table-row">
                  <td className="table-cell font-mono text-xs text-primary-600" data-label="N°">{f.numero}</td>
                  <td className="table-cell text-xs" data-label="Date">{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell text-right font-mono" data-label="TTC">{fmt(f.montantTTC)}</td>
                  <td className="table-cell text-right font-mono text-green-600" data-label="Payé">{fmt(f.montantPaye)}</td>
                  <td className="table-cell text-right font-mono text-red-600" data-label="Reste">{fmt(f.resteAPayer)}</td>
                  <td className="table-cell" data-label="Statut"><span className="badge badge-info">{f.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
