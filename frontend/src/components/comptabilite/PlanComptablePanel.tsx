'use client';

import { useEffect, useMemo, useState } from 'react';
import { comptabiliteApi } from '@/lib/api';
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
  const [search, setSearch] = useState('');
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

  const filtered = useMemo(() => comptes.filter(c => {
    if (classe && String(c.classe) !== classe) return false;
    if (search && !c.numero.includes(search) && !c.libelle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [comptes, search, classe]);

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
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Plan comptable</h2>
              <p className="text-sm text-gray-500">{comptes.length} compte(s) {lectureSeule ? '· lecture seule ici — à gérer depuis Plan comptable' : '· partagé par Compta Auto et Compta Manuelle'}</p>
            </div>
            {!lectureSeule && (
              <div className="flex gap-2">
                <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">Importer le plan SYSCOHADA</button>
                <button onClick={openCreate} className="btn-primary text-sm">+ Nouveau compte</button>
              </div>
            )}
          </div>
        </div>

        {!lectureSeule && (
          <div className="card !p-3 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            Le plan SYSCOHADA importable ici est une base de référence courante (comptes usuels d&apos;un bureau de transit), pas la nomenclature officielle exhaustive certifiée — à compléter et valider avec votre expert-comptable. Verrouillez les comptes sensibles (411, 401, 512, 571...) pour empêcher toute modification accidentelle.
          </div>
        )}

        <div className="card !p-3 space-y-2">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="N° ou libellé..." className="input-field !py-1.5 text-xs w-48 flex-shrink-0" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CLASSES.map(c => (
              <button key={c.id} onClick={() => setClasse(c.id)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${classe === c.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface-600'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead><tr>
              <th className="table-header !text-[10px] !px-1.5 truncate">Numéro</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Libellé</th>
              <th className="table-header !text-[10px] !px-1.5 truncate text-center">Classe</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Type</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Nature</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Sens</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Statut</th>
              <th className="table-header !text-[10px] !px-1.5 truncate">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Aucun compte</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-mono font-semibold !px-1.5 !text-[11px]" data-label="Numéro">
                    <span className="inline-flex items-center gap-1">
                      {c.verrouille && <svg className="w-3 h-3 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" /></svg>}
                      {c.numero}
                    </span>
                  </td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Libellé" title={c.libelle}>{c.libelle}</td>
                  <td className="table-cell !px-1.5 !text-[11px] text-center" data-label="Classe">{c.classe}</td>
                  <td className="table-cell !px-1.5 !text-[10.5px] truncate" data-label="Type">{c.type}</td>
                  <td className="table-cell !px-1.5 !text-[10.5px] truncate" data-label="Nature">{c.nature}</td>
                  <td className="table-cell !px-1.5 !text-[10.5px] truncate" data-label="Sens">{c.sens}</td>
                  <td className="table-cell !px-1.5" data-label="Statut">
                    {lectureSeule
                      ? <span className={`badge ${c.actif ? 'badge-success' : 'badge-gray'} !text-[10px]`}>{c.actif ? 'Actif' : 'Inactif'}</span>
                      : <button onClick={() => handleToggleActif(c)} className={`badge ${c.actif ? 'badge-success' : 'badge-gray'} !text-[10px]`}>{c.actif ? 'Actif' : 'Inactif'}</button>}
                  </td>
                  <td className="table-cell !px-1" data-label="Actions">
                    {!lectureSeule && (
                      <div className="flex gap-0.5">
                        <button onClick={() => handleToggleVerrou(c)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title={c.verrouille ? 'Déverrouiller' : 'Verrouiller'}>
                          {c.verrouille ? (
                            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6-6h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1zm2-4a4 4 0 118 0v4H8V7z" /></svg>
                          )}
                        </button>
                        <button onClick={() => openEdit(c)} disabled={c.verrouille} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700 disabled:opacity-30" title="Modifier">
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(c)} disabled={c.verrouille} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700 disabled:opacity-30" title="Supprimer">
                          <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && !lectureSeule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
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
