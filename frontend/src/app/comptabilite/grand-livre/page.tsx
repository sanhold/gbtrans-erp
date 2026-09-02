'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { comptabiliteApi } from '@/lib/api';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

export default function GrandLivrePage() {
  const [exercices, setExercices] = useState<any[]>([]);
  const [exerciceId, setExerciceId] = useState('');
  const [classe, setClasse] = useState('');
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    comptabiliteApi.exercices().then(r => {
      const data = r.data.data || [];
      setExercices(data);
      // Par défaut : exercice le plus récent seulement (évite de charger tout
      // l'historique multi-exercices d'un coup, nettement plus lourd/lent).
      if (data.length > 0) setExerciceId(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!exerciceId) return;
    setLoading(true);
    const params: any = {};
    if (exerciceId !== 'TOUS') params.exerciceId = exerciceId;
    if (classe) params.classe = classe;
    comptabiliteApi.grandLivre(params)
      .then(r => setComptes(r.data.data || []))
      .catch(() => setComptes([]))
      .finally(() => setLoading(false));
  }, [exerciceId, classe]);

  const toggle = (id: string) => setOuverts(o => ({ ...o, [id]: !o[id] }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/comptabilite" className="text-sm text-primary-600 hover:underline mb-2 inline-block">← Comptabilité</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grand Livre</h1>
          <p className="text-sm text-gray-500">{comptes.length} compte(s) mouvementé(s)</p>
        </div>

        <div className="card !p-4 flex flex-wrap gap-3">
          <select value={exerciceId} onChange={e => setExerciceId(e.target.value)} className="input-field w-40">
            {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.code}</option>)}
            <option value="TOUS">Tous exercices (lent)</option>
          </select>
          <select value={classe} onChange={e => setClasse(e.target.value)} className="input-field w-56">
            <option value="">Toutes classes</option>
            {[1, 2, 3, 4, 5, 6, 7].map(c => <option key={c} value={c}>Classe {c}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</div>
        ) : comptes.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">Aucun mouvement</div>
        ) : (
          <div className="space-y-3">
            {comptes.map((c: any) => (
              <div key={c.compte.id} className="card !p-0 overflow-hidden">
                <button onClick={() => toggle(c.compte.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-surface-700">
                  <div className="flex items-center gap-3">
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${ouverts[c.compte.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="font-mono font-semibold text-primary-600">{c.compte.numero}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{c.compte.libelle}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-gray-500">Débit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalDebit)}</span></span>
                    <span className="text-gray-500">Crédit <span className="font-mono text-gray-900 dark:text-white">{fmt(c.totalCredit)}</span></span>
                    <span className={`font-mono font-bold ${c.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(Math.abs(c.solde))} {c.solde >= 0 ? 'D' : 'C'}</span>
                  </div>
                </button>
                {ouverts[c.compte.id] && (
                  <div className="table-container !shadow-none !border-0 !rounded-none border-t border-gray-200 dark:border-surface-700">
                    <table className="w-full">
                      <thead><tr><th className="table-header">Date</th><th className="table-header">Journal</th><th className="table-header">N° Écriture</th><th className="table-header">Libellé</th><th className="table-header text-right">Débit</th><th className="table-header text-right">Crédit</th></tr></thead>
                      <tbody>
                        {c.mouvements.map((m: any) => (
                          <tr key={m.id} className="table-row">
                            <td className="table-cell text-xs" data-label="Date">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                            <td className="table-cell" data-label="Journal">{m.journal}</td>
                            <td className="table-cell font-mono text-xs" data-label="N° Écriture">{m.numeroEcriture}</td>
                            <td className="table-cell" data-label="Libellé">{m.libelle}</td>
                            <td className="table-cell text-right font-mono" data-label="Débit">{Number(m.debit) > 0 ? fmt(m.debit) : ''}</td>
                            <td className="table-cell text-right font-mono" data-label="Crédit">{Number(m.credit) > 0 ? fmt(m.credit) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
