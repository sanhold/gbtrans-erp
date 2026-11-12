'use client';

import { useEffect, useMemo, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Sheet from '@/components/ui/Sheet';

const CLASSES = [
  { id: '', label: 'Toutes' },
  { id: '1', label: '1 · Capitaux' },
  { id: '2', label: '2 · Immobilisations' },
  { id: '3', label: '3 · Stocks' },
  { id: '4', label: '4 · Tiers' },
  { id: '5', label: '5 · Trésorerie' },
  { id: '6', label: '6 · Charges' },
  { id: '7', label: '7 · Produits' },
];

export default function ImporterSyscohadaModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classe, setClasse] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    comptabiliteApi.syscohadaReference()
      .then(r => setComptes(r.data.data || []))
      .catch(() => { toast.error('Impossible de charger le plan SYSCOHADA de référence'); onClose(); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => comptes.filter(c => {
    if (classe && String(c.classe) !== classe) return false;
    if (search && !c.numero.includes(search) && !c.libelle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [comptes, search, classe]);

  const disponibles = filtered.filter(c => !c.dejaPresent);

  const toggle = (numero: string) => {
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(numero)) next.delete(numero); else next.add(numero);
      return next;
    });
  };

  const toutSelectionner = () => setSelection(prev => { const n = new Set(prev); disponibles.forEach(c => n.add(c.numero)); return n; });
  const toutDeselectionner = () => setSelection(prev => { const n = new Set(prev); disponibles.forEach(c => n.delete(c.numero)); return n; });

  const handleImporter = async () => {
    if (selection.size === 0) { toast.error('Sélectionnez au moins un compte'); return; }
    setImporting(true);
    try {
      const res = await comptabiliteApi.importerSyscohada([...selection]);
      toast.success(res.data.message);
      onImported();
      onClose();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setImporting(false); }
  };

  return (
    <Sheet open onClose={onClose} size="3xl" fullScreen ariaLabel="Importer le plan SYSCOHADA">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700 flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg">Importer le plan SYSCOHADA</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">Cochez les comptes à ajouter à votre plan comptable. Les comptes déjà présents sont grisés.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700 flex-shrink-0"><svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="p-3 border-b border-gray-100 dark:border-surface-700 space-y-2 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="N° ou libellé..." className="input-field md:!py-1.5 md:text-xs w-full md:w-56" aria-label="Rechercher un compte" />
            <button type="button" onClick={toutSelectionner} className="text-sm md:text-xs px-2 py-2 text-primary-600 hover:underline">Tout cocher ({disponibles.length})</button>
            <button type="button" onClick={toutDeselectionner} className="text-sm md:text-xs px-2 py-2 text-gray-600 dark:text-gray-300 hover:underline">Tout décocher</button>
            <span className="ml-auto text-xs font-semibold text-gray-600 dark:text-gray-300">{selection.size} sélectionné(s)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CLASSES.map(c => (
              <button key={c.id} onClick={() => setClasse(c.id)} className={`px-3 py-2 md:px-2.5 md:py-1 rounded-md text-xs font-medium transition-colors ${classe === c.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface-600'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Aucun compte ne correspond</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.numero}
                    onClick={() => !c.dejaPresent && toggle(c.numero)}
                    className={`border-b border-gray-50 dark:border-surface-700/50 ${c.dejaPresent ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-700/40'}`}
                  >
                    <td className="pl-3 py-2.5 md:py-1.5 w-10">
                      <input type="checkbox" className="w-5 h-5" aria-label={`Sélectionner le compte ${c.numero}`} checked={c.dejaPresent || selection.has(c.numero)} disabled={c.dejaPresent} onChange={() => toggle(c.numero)} />
                    </td>
                    <td className="py-2.5 md:py-1.5 font-mono font-semibold text-primary-600 w-20">{c.numero}</td>
                    <td className="py-2.5 md:py-1.5">{c.libelle}</td>
                    <td className="py-2.5 md:py-1.5 pr-3 text-right text-xs text-gray-600 dark:text-gray-300 w-28">{c.dejaPresent ? 'Déjà présent' : c.nature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-gray-200 dark:border-surface-700 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary min-h-[44px] w-full sm:w-auto">Annuler</button>
          <button type="button" onClick={handleImporter} disabled={importing || selection.size === 0} className="btn-primary min-h-[44px] w-full sm:w-auto disabled:opacity-50">
            {importing ? 'Ajout...' : `Ajouter ${selection.size || ''} compte(s)`}
          </button>
        </div>
    </Sheet>
  );
}
