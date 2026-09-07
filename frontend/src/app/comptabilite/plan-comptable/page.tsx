'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { comptabiliteApi } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPES_COMPTE = ['BILAN', 'GESTION', 'HORS_BILAN'];
const NATURES_COMPTE = ['ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT'];
const SENS_COMPTE = ['DEBITEUR', 'CREDITEUR'];

function compteVide() {
  return { numero: '', libelle: '', classe: '6', type: 'GESTION', nature: 'CHARGE', sens: 'DEBITEUR', parent: '', collectif: false, lettrable: false, rapprochable: false };
}

export default function PlanComptablePage() {
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classe, setClasse] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(compteVide());
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

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
    if (!confirm(`Supprimer le compte ${c.numero} — ${c.libelle} ?`)) return;
    try {
      await comptabiliteApi.supprimerCompte(c.id);
      toast.success('Compte supprimé');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleToggleActif = async (c: any) => {
    try {
      await comptabiliteApi.modifierCompte(c.id, { actif: !c.actif });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleImporterSyscohada = async () => {
    if (!confirm("Importer le plan comptable SYSCOHADA de référence ? Les comptes déjà existants (même numéro) ne seront pas dupliqués.")) return;
    setImporting(true);
    try {
      const res = await comptabiliteApi.importerSyscohada();
      toast.success(res.data.message);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setImporting(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <Link href="/comptabilite" className="text-[11px] text-primary-600 hover:underline block mb-1">← Comptabilité</Link>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plan comptable</h1>
              <p className="text-sm text-gray-500">{comptes.length} compte(s)</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleImporterSyscohada} disabled={importing} className="btn-secondary text-sm disabled:opacity-50">
                {importing ? 'Import...' : 'Importer le plan SYSCOHADA'}
              </button>
              <button onClick={openCreate} className="btn-primary text-sm">+ Nouveau compte</button>
            </div>
          </div>
        </div>

        <div className="card !p-3 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
          Le plan SYSCOHADA importable ici est une base de référence courante (comptes usuels d&apos;un bureau de transit), pas la nomenclature officielle exhaustive certifiée — à compléter et valider avec votre expert-comptable.
        </div>

        <div className="card !p-3 flex flex-nowrap items-center gap-2 overflow-x-auto">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="N° ou libellé..." className="input-field !py-1.5 text-xs w-48 flex-shrink-0" />
          <select value={classe} onChange={e => setClasse(e.target.value)} className="input-field !py-1.5 text-xs w-32 flex-shrink-0">
            <option value="">Toutes classes</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => <option key={c} value={c}>Classe {c}</option>)}
          </select>
        </div>

        <div className="table-container">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '11%' }} />
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
                  <td className="table-cell font-mono font-semibold !px-1.5 !text-[11px]" data-label="Numéro">{c.numero}</td>
                  <td className="table-cell !px-1.5 !text-[11px] truncate" data-label="Libellé" title={c.libelle}>{c.libelle}</td>
                  <td className="table-cell !px-1.5 !text-[11px] text-center" data-label="Classe">{c.classe}</td>
                  <td className="table-cell !px-1.5 !text-[10.5px] truncate" data-label="Type">{c.type}</td>
                  <td className="table-cell !px-1.5 !text-[10.5px] truncate" data-label="Nature">{c.nature}</td>
                  <td className="table-cell !px-1.5 !text-[10.5px] truncate" data-label="Sens">{c.sens}</td>
                  <td className="table-cell !px-1.5" data-label="Statut">
                    <button onClick={() => handleToggleActif(c)} className={`badge ${c.actif ? 'badge-success' : 'badge-gray'} !text-[10px]`}>{c.actif ? 'Actif' : 'Inactif'}</button>
                  </td>
                  <td className="table-cell !px-1" data-label="Actions">
                    <div className="flex gap-0.5">
                      <button onClick={() => openEdit(c)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Modifier">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-surface-700" title="Supprimer">
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
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
    </AppLayout>
  );
}
