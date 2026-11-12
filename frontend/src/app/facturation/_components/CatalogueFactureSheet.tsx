'use client';

import Sheet from '@/components/ui/Sheet';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

interface Props {
  open: boolean;
  onClose: () => void;
  search: string;
  setSearch: (v: string) => void;
  categories: string[];
  items: any[];
  onAdd: (p: any) => void;
  nbLignes: number;
}

/** Catalogue des prestations pour une facture directe (bottom sheet mobile / modale bureau). */
export default function CatalogueFactureSheet({ open, onClose, search, setSearch, categories, items, onAdd, nbLignes }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter une prestation" description={nbLignes > 0 ? `${nbLignes} ligne(s) dans la facture` : undefined} size="2xl" fullScreen>
      <div className="sticky -top-4 -mt-4 pt-4 pb-3 -mx-4 px-4 z-10 bg-white dark:bg-surface-800">
        <input type="search" data-autofocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." aria-label="Rechercher dans le catalogue" className="input-field" />
      </div>
      <div className="space-y-4">
        {categories.map(cat => {
          const list = items.filter((p: any) => p.categorie === cat);
          if (list.length === 0) return null;
          return (
            <div key={cat}>
              <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1.5">{cat}</p>
              <div className="space-y-1.5">
                {list.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-surface-700 hover:border-primary-300">
                    <div className="min-w-0"><p className="text-sm font-medium">{p.designation}</p><p className="text-xs text-gray-500">{p.code}{p.montantDefaut ? ` • ${fmt(Number(p.montantDefaut))} F` : ''}</p></div>
                    <button type="button" onClick={() => onAdd(p)} aria-label={`Ajouter ${p.designation}`} className="min-h-[44px] px-4 flex-shrink-0 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 active:bg-primary-700">+ Ajouter</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {categories.length > 0 && items.length === 0 && <p className="text-center text-sm text-gray-500 py-6">Aucun résultat</p>}
      </div>
      <div className="sticky -bottom-4 -mb-4 -mx-4 mt-4 px-4 py-3 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} className="btn-primary w-full sm:w-auto sm:ml-auto">Terminer{nbLignes > 0 ? ` (${nbLignes})` : ''}</button>
      </div>
    </Sheet>
  );
}
