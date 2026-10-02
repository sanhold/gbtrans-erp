'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';

const REGLES = [
  { source: 'Facture validée', journal: 'VENTE', debit: '411 Clients (montant TTC)', credit: '706 Prestations (HT) + 443 TVA facturée' },
  { source: 'Avoir validé', journal: 'VENTE', debit: '706 Prestations + 443 TVA facturée', credit: '411 Clients (écriture miroir)' },
  { source: 'Paiement client', journal: 'BANQUE / CAISSE', debit: '512 Banques ou 571 Caisse', credit: '411 Clients' },
  { source: 'Facture fournisseur validée', journal: 'ACHAT', debit: '605 Achats + 445 TVA récupérable', credit: '401 Fournisseurs' },
  { source: 'Paiement fournisseur', journal: 'BANQUE / CAISSE', debit: '401 Fournisseurs', credit: '512 Banques ou 571 Caisse' },
  { source: 'Dépense', journal: 'OD / BANQUE / CAISSE', debit: '63 Services extérieurs (ou 628 / 605 selon le plan)', credit: '571 Caisse, 512 Banque, ou 401 sans compte de trésorerie' },
];

const SOURCES = [
  { id: 'FACTURE', label: 'Factures & avoirs' },
  { id: 'FACTURE_FOURNISSEUR', label: 'Factures fournisseurs' },
  { id: 'PAIEMENT', label: 'Paiements clients' },
  { id: 'PAIEMENT_FOURNISSEUR', label: 'Paiements fournisseurs' },
  { id: 'DEPENSE', label: 'Dépenses' },
];

const jour = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

export default function GenerationAutoTab({ exercice, onGenerated }: { exercice: any; onGenerated: () => void }) {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [sources, setSources] = useState<string[]>(SOURCES.map(s => s.id));
  const [generating, setGenerating] = useState(false);
  const [dernier, setDernier] = useState<{ generees: number; ignorees: number; restantes: number } | null>(null);

  useEffect(() => {
    if (exercice) { setDateDebut(jour(exercice.dateDebut)); setDateFin(jour(exercice.dateFin)); setDernier(null); }
  }, [exercice]);

  const toggleSource = (id: string) => setSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleGenerer = async () => {
    if (!exercice) { toast.error('Créez ou choisissez un exercice Compta Auto'); return; }
    if (sources.length === 0) { toast.error('Sélectionnez au moins un type de document'); return; }
    setGenerating(true);
    try {
      const res = await comptabiliteApi.genererComptaAuto({ dateDebut, dateFin, sources, exerciceId: exercice.id });
      setDernier(res.data.data);
      toast.success(res.data.message, { duration: 6000 });
      onGenerated();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur', { duration: 8000 }); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card !p-3 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
Compta Auto génère et <strong>valide directement</strong> les écritures dans le grand livre partagé (même plan comptable et mêmes journaux que Compta Manuelle). Une même facture, un même paiement ou une même dépense n&apos;est jamais comptabilisé deux fois, qu&apos;il ait été saisi automatiquement ou à la main. Les règles ci-dessous sont un standard SYSCOHADA à faire valider par votre expert-comptable ;
        les comptes utilisés se règlent dans <Link href="/comptabilite/plan-comptable" className="underline font-medium">Plan comptable</Link>.
      </div>

      <div className="card !p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Générer les écritures{exercice ? ` — ${exercice.libelle}` : ''}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Date de début</label>
            <input type="date" value={dateDebut} min={exercice ? jour(exercice.dateDebut) : undefined} max={exercice ? jour(exercice.dateFin) : undefined} onChange={e => setDateDebut(e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Date de fin</label>
            <input type="date" value={dateFin} min={exercice ? jour(exercice.dateDebut) : undefined} max={exercice ? jour(exercice.dateFin) : undefined} onChange={e => setDateFin(e.target.value)} className="input-field text-sm" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Types de documents à comptabiliser</label>
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
          {dernier !== null ? (
            <p className="text-xs text-gray-500">
              Dernière génération : {dernier.generees} écriture(s) créée(s){dernier.ignorees > 0 ? `, ${dernier.ignorees} ignorée(s)` : ''}{dernier.restantes > 0 ? ` — ${dernier.restantes} restante(s) : relancez la génération` : ''}.
            </p>
          ) : <span />}
          <button onClick={handleGenerer} disabled={generating || !exercice} className="btn-primary text-sm disabled:opacity-50">
            {generating ? 'Génération...' : 'Générer les écritures'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Règles débit / crédit appliquées</h2>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">Document source</th><th className="table-header">Journal</th><th className="table-header">Débit</th><th className="table-header">Crédit</th></tr></thead>
            <tbody>
              {REGLES.map(r => (
                <tr key={r.source} className="table-row">
                  <td className="table-cell font-medium" data-label="Document source">{r.source}</td>
                  <td className="table-cell" data-label="Journal"><span className="badge badge-gray !text-[10px]">{r.journal}</span></td>
                  <td className="table-cell !whitespace-normal" data-label="Débit">{r.debit}</td>
                  <td className="table-cell !whitespace-normal" data-label="Crédit">{r.credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
