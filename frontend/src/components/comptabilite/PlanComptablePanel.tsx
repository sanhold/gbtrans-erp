'use client';

import { useEffect, useMemo, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
import { usePagination } from '@/lib/usePagination';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeModifier, IconeSupprimer } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, StatutPastille } from '@/components/tables/cellules';
import ImporterSyscohadaModal from './ImporterSyscohadaModal';
import toast from 'react-hot-toast';

const TYPES_COMPTE = ['BILAN', 'GESTION', 'HORS_BILAN'];
const NATURES_COMPTE = ['ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT'];
const SENS_COMPTE = ['DEBITEUR', 'CREDITEUR'];
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

function compteVide() {
  return { numero: '', libelle: '', classe: '6', type: 'GESTION', nature: 'CHARGE', sens: 'DEBITEUR', parent: '', collectif: false, lettrable: false, rapprochable: false };
}

export default function PlanComptablePanel({ lectureSeule = false }: { lectureSeule?: boolean }) {
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classe, setClasse] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(compteVide());
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    setLoading(true);
    comptabiliteApi.comptes({ tous: '1' })
      .then(r => setComptes(r.data.data || []))
      .catch(() => setComptes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => comptes.filter(c => !classe || String(c.classe) === classe), [comptes, classe]);
  const { paged, page, setPage, pageSize, setPageSize, total, totalPages } = usePagination(filtered);

  const openCreate = () => { setEditing(null); setForm(compteVide()); setShowForm(true); };
  const openEdit = (c: any) => {
    if (c.verrouille) { toast.error('Ce compte est verrouillé : déverrouillez-le avant de le modifier.'); return; }
    setEditing(c);
    setForm({
      numero: c.numero, libelle: c.libelle, classe: String(c.classe), type: c.type, nature: c.nature,
      sens: c.sens, parent: c.parent || '', collectif: c.collectif, lettrable: c.lettrable, rapprochable: c.rapprochable,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.numero.trim() || !form.libelle.trim()) { toast.error('Numéro et libellé sont requis'); return; }
    setSaving(true);
    try {
      if (editing) {
        await comptabiliteApi.modifierCompte(editing.id, {
          libelle: form.libelle.trim(), classe: form.classe, type: form.type, nature: form.nature, sens: form.sens,
          parent: form.parent || undefined, collectif: form.collectif, lettrable: form.lettrable, rapprochable: form.rapprochable,
        });
        toast.success('Compte modifié');
      } else {
        await comptabiliteApi.creerCompte({
          numero: form.numero.trim(), libelle: form.libelle.trim(), classe: form.classe, type: form.type, nature: form.nature, sens: form.sens,
          parent: form.parent || undefined, collectif: form.collectif, lettrable: form.lettrable, rapprochable: form.rapprochable,
        });
        toast.success('Compte créé');
      }
      setShowForm(false);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: any) => {
    if (c.verrouille) { toast.error('Ce compte est verrouillé : déverrouillez-le avant de le supprimer.'); return; }
    if (!confirm(`Supprimer le compte ${c.numero} — ${c.libelle} ?`)) return;
    try {
      await comptabiliteApi.supprimerCompte(c.id);
      toast.success('Compte supprimé');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleToggleActif = async (c: any) => {
    if (c.verrouille) { toast.error('Ce compte est verrouillé.'); return; }
    try {
      await comptabiliteApi.modifierCompte(c.id, { actif: !c.actif });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleToggleVerrou = async (c: any) => {
    try {
      const res = await (c.verrouille ? comptabiliteApi.deverrouillerCompte(c.id) : comptabiliteApi.verrouillerCompte(c.id));
      toast.success(res.data.message);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  return (
    <>
      <div className="space-y-2">
        {/* Une seule ligne : classes à gauche, compteur et actions à droite (explications dans la bulle « i » de la page). */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="-mx-1 flex w-full min-w-0 gap-1 overflow-x-auto lg:w-auto lg:flex-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CLASSES.map(c => (
              <button key={c.id} onClick={() => setClasse(c.id)} className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${classe === c.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface-600'}`}>
                {c.label}
              </button>
            ))}
          </div>
          {lectureSeule && <span className="text-xs text-gray-400 whitespace-nowrap">Lecture seule</span>}
          {!lectureSeule && (
            <div className="flex gap-2">
              <button onClick={() => setShowImport(true)} className="btn-secondary !py-1.5 text-xs" title="Importer le plan SYSCOHADA">Importer SYSCOHADA</button>
              <button onClick={openCreate} className="btn-primary !py-1.5 text-xs">+ Nouveau compte</button>
            </div>
          )}
        </div>

        <ListeResponsive
          colonnes={[
            { cle: 'num', libelle: 'Numéro', texte: (c: any) => c.numero, rendu: (c: any) => <span className="inline-flex items-center gap-1"><Numero>{c.numero}</Numero>{c.verrouille && <svg className="h-3 w-3 flex-shrink-0 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z" /></svg>}</span> },
            { cle: 'lib', libelle: 'Libellé', texte: (c: any) => c.libelle, rendu: (c: any) => <Tronque texte={c.libelle} largeur="26rem" /> },
            { cle: 'classe', libelle: 'Classe', align: 'right' as const, texte: (c: any) => String(c.classe), rendu: (c: any) => <Discret>{c.classe}</Discret> },
            { cle: 'type', libelle: 'Type', masquerSous: 'xl' as const, texte: (c: any) => c.type, rendu: (c: any) => <Discret>{c.type}</Discret> },
            { cle: 'nature', libelle: 'Nature', masquerSous: 'xl' as const, texte: (c: any) => c.nature, rendu: (c: any) => <Discret>{c.nature}</Discret> },
            { cle: 'sens', libelle: 'Sens', masquerSous: '2xl' as const, texte: (c: any) => c.sens, rendu: (c: any) => <Discret>{c.sens}</Discret> },
            { cle: 'st', libelle: 'Statut', texte: (c: any) => (c.actif ? 'Actif' : 'Inactif'), rendu: (c: any) => lectureSeule ? <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} /> : <button type="button" onClick={e => { e.stopPropagation(); handleToggleActif(c); }} title="Cliquer pour activer ou désactiver"><StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} /></button> },
          ]}
          lignes={paged}
          cleLigne={(c: any) => c.id}
          chargement={loading}
          nomExport="plan-comptable"
          actions={lectureSeule ? undefined : (c: any) => (
            <>
              <BoutonIcone titre={c.verrouille ? 'Déverrouiller' : 'Verrouiller'} ton="neutre" onClick={() => handleToggleVerrou(c)}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={c.verrouille ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' : 'M8 11V7a4 4 0 118 0M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z'} /></svg></BoutonIcone>
              <BoutonIcone titre="Modifier" ton="primaire" disabled={c.verrouille} onClick={() => openEdit(c)}><IconeModifier /></BoutonIcone>
              <BoutonIcone titre="Supprimer" ton="danger" disabled={c.verrouille} onClick={() => handleDelete(c)}><IconeSupprimer /></BoutonIcone>
            </>
          )}
          carte={(c: any) => ({ titre: <span className="inline-flex items-center gap-1.5"><span className="font-mono">{c.numero}</span>{c.verrouille && <span className="text-amber-500" title="Verrouillé">🔒</span>}</span>, sousTitre: c.libelle, statut: <StatutPastille libelle={c.actif ? 'Actif' : 'Inactif'} ton={c.actif ? 'success' : 'gray'} />, details: `Classe ${c.classe} — ${c.type} — ${c.nature} — ${c.sens}` })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          vide={<EmptyState titre="Aucun compte" description="Importez le plan SYSCOHADA ou créez un compte." />}
        />
      </div>

      {showForm && !lectureSeule && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-lg sm:mx-4 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-surface-700">
              <h3 className="font-bold text-lg">{editing ? 'Modifier le compte' : 'Nouveau compte'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Numéro *</label>
                <input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} disabled={!!editing} className="input-field text-sm disabled:opacity-60" placeholder="4111" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Classe *</label>
                <select value={form.classe} onChange={e => setForm({ ...form, classe: e.target.value })} className="input-field text-sm">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => <option key={c} value={c}>Classe {c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Libellé *</label>
                <input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="input-field text-sm" placeholder="Clients - Ventes de biens ou services" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Type *</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field text-sm">
                  {TYPES_COMPTE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nature *</label>
                <select value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value })} className="input-field text-sm">
                  {NATURES_COMPTE.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Sens *</label>
                <select value={form.sens} onChange={e => setForm({ ...form, sens: e.target.value })} className="input-field text-sm">
                  {SENS_COMPTE.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Compte parent</label>
                <input type="text" value={form.parent} onChange={e => setForm({ ...form, parent: e.target.value })} className="input-field text-sm" placeholder="Optionnel" />
              </div>
              <div className="col-span-2 flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={form.collectif} onChange={e => setForm({ ...form, collectif: e.target.checked })} /> Collectif
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={form.lettrable} onChange={e => setForm({ ...form, lettrable: e.target.checked })} /> Lettrable
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={form.rapprochable} onChange={e => setForm({ ...form, rapprochable: e.target.checked })} /> Rapprochable
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-surface-700">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {showImport && <ImporterSyscohadaModal onClose={() => setShowImport(false)} onImported={load} />}
    </>
  );
}
