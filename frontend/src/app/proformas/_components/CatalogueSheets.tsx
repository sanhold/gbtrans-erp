'use client';

import Sheet from '@/components/ui/Sheet';
import { CAT_COLORS, fmt, nettoyerNombre, type LigneProforma } from './proformaUtils';
import { IconCheck, IconPlus } from './icons';

export interface NewPrestation { categorie: string; code: string; designation: string; montantDefaut: string; estTVA: boolean }

interface CatalogueProps {
  open: boolean;
  onClose: () => void;
  catalogue: any[];
  categoriesWithItems: string[];
  lignes: LigneProforma[];
  search: string;
  setSearch: (v: string) => void;
  openCat: string;
  setOpenCat: (v: string) => void;
  onAdd: (prestation: any) => void;
  onNewPrestation: () => void;
}

/** Catalogue des prestations : bottom sheet plein écran sur mobile, modale sur bureau. */
export function CatalogueSheet({ open, onClose, catalogue, categoriesWithItems, lignes, search, setSearch, openCat, setOpenCat, onAdd, onNewPrestation }: CatalogueProps) {
  const filtered = (cat: string) => catalogue
    .filter(p => p.categorie === cat)
    .filter(p => !search || p.designation.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <Sheet open={open} onClose={onClose} title="Catalogue des prestations" description={lignes.length > 0 ? `${lignes.length} ligne(s) dans la proforma` : undefined} size="lg" fullScreen zIndexClass="z-[58]">
      <div className="sticky -top-4 -mt-4 pt-4 pb-3 -mx-4 px-4 z-10 bg-white dark:bg-surface-800">
        <input type="search" data-autofocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une prestation ou un code..." aria-label="Rechercher dans le catalogue" className="input-field" />
      </div>
      <div className="space-y-2">
        {categoriesWithItems.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8">Chargement du catalogue…</p>
        ) : categoriesWithItems.map(cat => {
          const items = filtered(cat);
          if (search && items.length === 0) return null;
          const isOpen = openCat === cat || !!search;
          return (
            <div key={cat} className="border border-gray-200 dark:border-surface-600 rounded-lg overflow-hidden">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpenCat(openCat === cat ? '' : cat)} className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-wide bg-gray-50 dark:bg-surface-700 text-gray-700 dark:text-gray-200" style={{ borderLeft: `3px solid ${CAT_COLORS[cat] || '#6b7280'}` }}>
                <span>{cat}</span>
                <svg aria-hidden="true" className={`w-3.5 h-3.5 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
              {isOpen && (
                <div className="divide-y divide-gray-100 dark:divide-surface-700">
                  {items.map(p => {
                    const already = lignes.some(l => l.codePrestation === p.code);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{p.designation}</p>
                          <p className="text-xs text-gray-500">{p.code}{p.montantDefaut ? ` · ${fmt(Number(p.montantDefaut))} F` : ''}{p.estTVA ? ' · TVA' : ''}</p>
                        </div>
                        {already ? (
                          <span className="w-11 h-11 flex items-center justify-center text-green-600 flex-shrink-0" role="img" aria-label="Déjà ajoutée"><IconCheck className="w-5 h-5" /></span>
                        ) : (
                          <button type="button" onClick={() => onAdd(p)} className="w-11 h-11 flex items-center justify-center flex-shrink-0 rounded-full border border-primary-400 text-primary-600 hover:bg-primary-500 hover:text-white transition-colors" title="Ajouter" aria-label={`Ajouter ${p.designation}`}><IconPlus className="w-5 h-5" /></button>
                        )}
                      </div>
                    );
                  })}
                  {items.length === 0 && <p className="text-center text-xs text-gray-500 py-4">Aucun résultat</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="sticky -bottom-4 -mb-4 -mx-4 mt-4 px-4 py-3 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex flex-col sm:flex-row sm:justify-between gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onNewPrestation} className="btn-secondary">+ Nouvelle prestation au catalogue</button>
        <button type="button" onClick={onClose} className="btn-primary">Terminer{lignes.length > 0 ? ` (${lignes.length})` : ''}</button>
      </div>
    </Sheet>
  );
}

interface AddProps {
  open: boolean;
  onClose: () => void;
  value: NewPrestation;
  setValue: (v: NewPrestation) => void;
  allCategories: string[];
  customCategorie: string;
  onCustomCategorie: (v: string) => void;
  onCategorieChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onSubmit: () => void;
}

/** Création d'une prestation de catalogue. */
export function AddPrestationSheet({ open, onClose, value, setValue, allCategories, customCategorie, onCustomCategorie, onCategorieChange, onCodeChange, onSubmit }: AddProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle prestation" size="md" zIndexClass="z-[65]">
      <div className="space-y-3">
        <div>
          <label className="label">Catégorie *</label>
          {value.categorie === '__new__' ? (
            <div className="flex gap-2">
              <input type="text" autoFocus value={customCategorie} onChange={e => onCustomCategorie(e.target.value.toUpperCase())} className="input-field" placeholder="NOM DE LA NOUVELLE CATEGORIE" />
              <button type="button" onClick={() => onCategorieChange(allCategories[0] || 'DOUANE & COMPAGNIE')} className="btn-secondary text-sm px-3 whitespace-nowrap">Annuler</button>
            </div>
          ) : (
            <select value={value.categorie} onChange={e => onCategorieChange(e.target.value)} className="input-field">
              {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              <option value="__new__">+ Nouvelle catégorie…</option>
            </select>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Code * <span className="text-gray-500 font-normal">(généré, modifiable)</span></label>
            <input type="text" value={value.code} onChange={e => onCodeChange(e.target.value.toUpperCase())} className="input-field" placeholder="AF09" />
          </div>
          <div>
            <label className="label">Montant par défaut</label>
            <input type="text" inputMode="decimal" value={value.montantDefaut} onChange={e => setValue({ ...value, montantDefaut: nettoyerNombre(e.target.value) })} className="input-field" placeholder="0" />
          </div>
        </div>
        <div>
          <label className="label">Désignation *</label>
          <input type="text" value={value.designation} onChange={e => setValue({ ...value, designation: e.target.value })} className="input-field" placeholder="Nom de la prestation" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={value.estTVA} onChange={e => setValue({ ...value, estTVA: e.target.checked })} className="w-5 h-5 rounded" />
          <span className="text-sm">Ligne de TVA</span>
        </label>
        <div className="sticky -bottom-4 -mb-4 -mx-4 px-4 py-3 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="button" onClick={onSubmit} className="btn-primary">Ajouter au catalogue</button>
        </div>
      </div>
    </Sheet>
  );
}
