'use client';

import Sheet from '@/components/ui/Sheet';
import PickerField from '@/components/ui/PickerField';
import { CAT_COLORS, fmt, MODE_PAIEMENT_LABELS } from './factureHelpers';

const footer = 'sticky -bottom-4 -mb-4 -mx-4 mt-4 px-4 py-3 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]';

/* ---------- Catalogue (ajout de lignes) ---------- */
export function CatalogueLignesSheet({ open, onClose, catalogue, lignes, search, setSearch, selectedCat, setSelectedCat, onAdd }: {
  open: boolean; onClose: () => void; catalogue: any[]; lignes: any[];
  search: string; setSearch: (v: string) => void; selectedCat: string; setSelectedCat: (v: string) => void;
  onAdd: (p: any) => void;
}) {
  const items = catalogue.filter(p => (!selectedCat || p.categorie === selectedCat) && (!search || p.designation.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())));
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter une prestation" size="2xl" fullScreen>
      <div className="sticky -top-4 -mt-4 pt-4 pb-3 -mx-4 px-4 z-10 bg-white dark:bg-surface-800 space-y-2">
        <input type="search" data-autofocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." aria-label="Rechercher dans le catalogue" className="input-field" />
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button type="button" onClick={() => setSelectedCat('')} className={`flex-shrink-0 min-h-[36px] px-3 rounded-full text-xs font-medium ${!selectedCat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'}`}>Toutes</button>
          {Object.entries(CAT_COLORS).map(([cat, color]) => (
            <button type="button" key={cat} onClick={() => setSelectedCat(cat)} className={`flex-shrink-0 min-h-[36px] px-3 rounded-full text-xs font-medium whitespace-nowrap ${selectedCat === cat ? 'text-white' : 'bg-gray-100'}`} style={selectedCat === cat ? { backgroundColor: color } : { color }}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map(p => {
          const exists = lignes.some((l: any) => l.codePrestation === p.code);
          return (
            <div key={p.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${exists ? 'bg-green-50 border-green-200 dark:bg-green-900/10' : 'bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-700 hover:border-primary-300'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[40px] text-center flex-shrink-0" style={{ backgroundColor: CAT_COLORS[p.categorie] || '#6B7280' }}>{p.code}</span>
                <div className="min-w-0"><p className="text-sm font-medium">{p.designation}</p><p className="text-xs text-gray-500">{p.categorie}{p.montantDefaut ? ` • ${fmt(Number(p.montantDefaut))} F` : ''}</p></div>
              </div>
              {exists ? <span className="text-green-700 text-xs font-medium flex-shrink-0">Ajouté</span> : (
                <button type="button" onClick={() => onAdd(p)} aria-label={`Ajouter ${p.designation}`} className="min-h-[44px] px-4 flex-shrink-0 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">+ Ajouter</button>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p className="text-center text-sm text-gray-500 py-6">Aucun résultat</p>}
      </div>
      <div className={footer}><button type="button" onClick={onClose} className="btn-primary">Fermer</button></div>
    </Sheet>
  );
}

/* ---------- Avoir ---------- */
export function AvoirSheet({ open, onClose, facture, motif, setMotif, creating, onCreate }: {
  open: boolean; onClose: () => void; facture: any; motif: string; setMotif: (v: string) => void; creating: boolean; onCreate: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Créer un avoir" size="md">
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">Un avoir de {fmt(Number(facture.montantTTC))} F sera créé pour la facture {facture.numero}, avec les mêmes lignes.</p>
        <div>
          <label htmlFor="motif-avoir" className="label">Motif de l&apos;avoir *</label>
          <textarea id="motif-avoir" value={motif} onChange={e => setMotif(e.target.value)} rows={3} className="input-field" placeholder="Ex : Erreur de facturation, remise commerciale, marchandise retournée..." data-autofocus />
        </div>
        <div className={footer}>
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="button" onClick={onCreate} disabled={creating} className="btn-primary disabled:opacity-50">{creating ? 'Création...' : "Créer l'avoir"}</button>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- Paiement ---------- */
export interface PaiementForm { montant: string; modePaiement: string; reference: string; banque: string; compte: string }

export function PaiementSheet({ open, onClose, facture, form, setForm, comptesOptions, paying, onSubmit }: {
  open: boolean; onClose: () => void; facture: any; form: PaiementForm; setForm: (f: PaiementForm) => void;
  comptesOptions: { value: string; label: string }[]; paying: boolean; onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Enregistrer un paiement" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-gray-600 dark:text-gray-400">Reste à payer : <span className="font-mono font-semibold text-gray-900 dark:text-white">{fmt(facture.resteAPayer)} XOF</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Montant *</label><input type="text" inputMode="decimal" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value.replace(',', '.') })} className="input-field" pattern="[0-9]+([.][0-9]+)?" title="Montant en chiffres" required /></div>
          <div><label className="label">Mode de paiement</label>
            <select value={form.modePaiement} onChange={e => setForm({ ...form, modePaiement: e.target.value })} className="input-field">
              {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div><label className="label">Compte de destination *</label>
          <PickerField value={form.compte} onChange={id => setForm({ ...form, compte: id })} options={comptesOptions.map(o => ({ id: o.value, label: o.label }))} placeholder="Sélectionner..." title="Sélectionner un compte" searchPlaceholder="Compte, caisse..." required />
        </div>
        {(form.modePaiement === 'CHEQUE' || form.modePaiement === 'VIREMENT') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Référence</label><input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" /></div>
            <div><label className="label">Banque</label><input type="text" value={form.banque} onChange={e => setForm({ ...form, banque: e.target.value })} className="input-field" /></div>
          </div>
        )}
        <div className={footer}>
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={paying} className="btn-primary disabled:opacity-50">{paying ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </form>
    </Sheet>
  );
}
