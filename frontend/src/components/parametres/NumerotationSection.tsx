'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { parametresApi } from '@/lib/api';
import { Spinner } from './EntrepriseSection';

export default function NumerotationSection() {
  const [numerotations, setNumerotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ prefixe: '', longueur: '6' });

  const load = useCallback(() => {
    setLoading(true);
    parametresApi.numerotations.list()
      .then(r => setNumerotations(r.data.data || []))
      .catch(() => toast.error('Erreur de chargement des numérotations'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openEdit = (n: any) => { setEditing(n.module); setForm({ prefixe: n.prefixe, longueur: String(n.longueur) }); };
  const save = async (module: string) => {
    try {
      await parametresApi.numerotations.update(module, { prefixe: form.prefixe, longueur: parseInt(form.longueur) || 6 });
      toast.success('Numérotation mise à jour');
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-1">Numérotation automatique</h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">Préfixe et longueur du compteur pour l&apos;année {new Date().getFullYear()}. Format : PRÉFIXE/ANNÉE/COMPTEUR.</p>
      {loading ? <Spinner /> : (
        <ul className="space-y-2">
          {numerotations.map(n => (
            <li key={n.module} className="flex flex-wrap items-center justify-between p-3 bg-gray-50 dark:bg-surface-700 rounded-lg gap-x-3 gap-y-2">
              <span className="text-sm font-medium flex-1 min-w-[140px]">{n.label}</span>
              {editing === n.module ? (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input type="text" aria-label="Préfixe" autoCapitalize="characters" value={form.prefixe} onChange={e => setForm({ ...form, prefixe: e.target.value.toUpperCase() })} className="input-field !w-28" />
                  <input type="number" inputMode="numeric" aria-label="Longueur du compteur" value={form.longueur} onChange={e => setForm({ ...form, longueur: e.target.value })} className="input-field !w-20" min="3" max="10" />
                  <button type="button" onClick={() => save(n.module)} className="min-h-[44px] px-2 text-sm text-primary-600 font-medium hover:underline">Enregistrer</button>
                  <button type="button" onClick={() => setEditing(null)} className="min-h-[44px] px-2 text-sm text-gray-600 dark:text-gray-400 hover:underline">Annuler</button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3">
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{n.prefixe}/{n.annee}/{String(n.compteur + 1).padStart(n.longueur, '0')}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{n.enUsage ? `${n.compteur} émis` : 'jamais utilisé'}</span>
                  <button type="button" onClick={() => openEdit(n)} className="min-h-[44px] px-2 text-sm text-primary-600 font-medium hover:underline">Modifier</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
