'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';

const REGLES = [
  { source: 'Facture validée', journal: 'VENTE', debit: '411 Clients (montant TTC)', credit: '706 Prestations (HT) + 443 TVA facturée' },
  { source: 'Avoir validé', journal: 'VENTE', debit: '706 Prestations + 443 TVA facturée', credit: '411 Clients (écriture miroir)' },
  { source: 'Paiement client', journal: 'BQ / CA', debit: '512 Banques ou 571 Caisse', credit: '411 Clients' },
  { source: 'Facture fournisseur validée', journal: 'ACHAT', debit: '6xx Charge + 445 TVA récupérable', credit: '401 Fournisseurs' },
  { source: 'Paiement fournisseur', journal: 'BQ / CA', debit: '401 Fournisseurs', credit: '512 Banques ou 571 Caisse' },
  { source: 'Dépense', journal: 'OD / BQ / CA', debit: '6x Charge (par défaut 63 Services extérieurs)', credit: '512 / 571 / 401 selon le mode de paiement' },
];

const SOURCES = [
  { id: 'FACTURE', label: 'Factures & avoirs' },
  { id: 'FACTURE_FOURNISSEUR', label: 'Factures fournisseurs' },
  { id: 'PAIEMENT', label: 'Paiements clients' },
  { id: 'PAIEMENT_FOURNISSEUR', label: 'Paiements fournisseurs' },
  { id: 'DEPENSE', label: 'Dépenses' },
];

export default function ComptaAutoPage() {
  const today = new Date();
  const debutAnnee = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [dateDebut, setDateDebut] = useState(debutAnnee);
  const [dateFin, setDateFin] = useState(today.toISOString().slice(0, 10));
  const [sources, setSources] = useState<string[]>(SOURCES.map(s => s.id));
  const [generating, setGenerating] = useState(false);
  const [dernierResultat, setDernierResultat] = useState<number | null>(null);

  const toggleSource = (id: string) => {
    setSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleGenerer = async () => {
    if (sources.length === 0) { toast.error('Sélectionnez au moins un type de document'); return; }
    setGenerating(true);
    try {
      const res = await comptabiliteApi.genererComptaAuto({ dateDebut, dateFin, sources });
      setDernierResultat(res.data.data.suggerees);
      toast.success(res.data.message);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setGenerating(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <Link href="/comptabilite" className="text-[11px] text-primary-600 hover:underline block mb-1">← Comptabilité</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compta Auto</h1>
          <p className="text-sm text-gray-500">Génère des suggestions d&apos;écritures à partir des documents validés — rien n&apos;est jamais posté directement au grand livre.</p>
        </div>

        <div className="card !p-3 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
          Les règles ci-dessous sont un point de départ standard SYSCOHADA, pas un paramétrage validé par votre expert-comptable. Chaque suggestion générée atterrit dans la file <Link href="/compta-reel" className="underline font-medium">« En attente de comptabilisation »</Link> de Compta Réel : un humain doit la relire, choisir les comptes exacts et cliquer « Comptabiliser » avant qu&apos;elle n&apos;affecte le grand livre.
        </div>

        <div className="card">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Règles débit / crédit par défaut</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] text-gray-500 uppercase border-b border-gray-100 dark:border-surface-700">
                <th className="p-2">Document source</th><th className="p-2">Journal</th><th className="p-2">Débit</th><th className="p-2">Crédit</th>
              </tr></thead>
              <tbody>
                {REGLES.map(r => (
                  <tr key={r.source} className="border-b border-gray-50 dark:border-surface-700/50">
                    <td className="p-2 font-medium">{r.source}</td>
                    <td className="p-2"><span className="badge badge-gray !text-[10px]">{r.journal}</span></td>
                    <td className="p-2 text-xs text-gray-600 dark:text-gray-300">{r.debit}</td>
                    <td className="p-2 text-xs text-gray-600 dark:text-gray-300">{r.credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card !p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Générer des suggestions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Date de début</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Date de fin</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Types de documents à scanner</label>
            <div className="flex flex-wrap gap-3">
              {SOURCES.map(s => (
                <label key={s.id} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={sources.includes(s.id)} onChange={() => toggleSource(s.id)} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-surface-700">
            {dernierResultat !== null && (
              <p className="text-xs text-gray-500">Dernière génération : {dernierResultat} suggestion(s) ajoutée(s).</p>
            )}
            <button onClick={handleGenerer} disabled={generating} className="btn-primary text-sm disabled:opacity-50 ml-auto">
              {generating ? 'Génération...' : 'Générer les suggestions'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
