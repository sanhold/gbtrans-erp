'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { utilisateursApi } from '@/lib/api';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Sheet from '@/components/ui/Sheet';
import FAB from '@/components/ui/FAB';
import FormSheet from '@/components/forms/FormSheet';
import TextField from '@/components/forms/TextField';
import { Spinner } from './EntrepriseSection';

const emptyProfilForm = { code: '', nom: '', description: '' };

export default function ProfilsSection() {
  const confirmer = useConfirm();
  const [profils, setProfils] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showProfilModal, setShowProfilModal] = useState(false);
  const [profilForm, setProfilForm] = useState(emptyProfilForm);
  const [savingProfil, setSavingProfil] = useState(false);

  const [permProfil, setPermProfil] = useState<any>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([utilisateursApi.profils.list(), utilisateursApi.permissions.list()])
      .then(([pRes, permRes]) => {
        setProfils(pRes.data.data || []);
        setPermissions(permRes.data.data || []);
      })
      .catch(() => toast.error('Erreur de chargement des profils'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreateProfil = () => { setProfilForm(emptyProfilForm); setShowProfilModal(true); };
  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilForm.code.trim() || !profilForm.nom.trim()) { toast.error('Code et nom requis'); return; }
    setSavingProfil(true);
    try {
      await utilisateursApi.profils.create(profilForm);
      toast.success('Profil créé');
      setShowProfilModal(false);
      loadAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingProfil(false); }
  };

  const handleDeleteProfil = async (p: any) => {
    if (!(await confirmer({ titre: 'Supprimer ce profil ?', message: `Profil « ${p.nom} »`, danger: true, confirmer: 'Supprimer' }))) return;
    try { await utilisateursApi.profils.delete(p.id); toast.success('Profil supprimé'); loadAll(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const openPermissions = (p: any) => { setPermProfil(p); setSelectedPerms(new Set(p.permissionIds)); };
  const togglePerm = (id: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleModuleAll = (modulePerms: any[], checked: boolean) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => { if (checked) next.add(p.id); else next.delete(p.id); });
      return next;
    });
  };
  const handleSavePermissions = async () => {
    setSavingPerms(true);
    try {
      await utilisateursApi.profils.setPermissions(permProfil.id, [...selectedPerms]);
      toast.success('Permissions mises à jour');
      setPermProfil(null);
      loadAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingPerms(false); }
  };

  const permissionsByModule: Record<string, any[]> = {};
  for (const p of permissions) { (permissionsByModule[p.module] ||= []).push(p); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Profils et permissions</h3>
        <button type="button" onClick={openCreateProfil} className="btn-primary hidden lg:inline-flex">+ Nouveau Profil</button>
      </div>
      {loading ? <Spinner /> : profils.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <p>Aucun profil</p>
          <button type="button" onClick={openCreateProfil} className="btn-primary mt-3">Créer un profil</button>
        </div>
      ) : (
        <ul className="space-y-2">
          {profils.map(p => (
            <li key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
              <div className="min-w-0">
                <span className="font-medium text-sm">{p.nom}</span>
                {p.estAdmin && <span className="badge badge-info ml-2">Accès total</span>}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{p.description || 'Aucune description'} — {p.nbUtilisateurs} utilisateur(s){!p.estAdmin && ` — ${p.permissionIds.length} permission(s)`}</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                {!p.estAdmin && <button type="button" onClick={() => openPermissions(p)} className="min-h-[44px] px-2 text-primary-600 hover:underline font-medium">Gérer les permissions</button>}
                {!p.estAdmin && p.nbUtilisateurs === 0 && <button type="button" onClick={() => handleDeleteProfil(p)} className="min-h-[44px] px-2 text-red-600 hover:underline font-medium">Supprimer</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FAB label="Nouveau profil" onClick={openCreateProfil} />

      <FormSheet
        open={showProfilModal} onClose={() => setShowProfilModal(false)} size="sm" onSubmit={handleSaveProfil} saving={savingProfil}
        title="Nouveau Profil" submitLabel="Créer"
      >
        <TextField label="Code *" value={profilForm.code} onChange={v => setProfilForm({ ...profilForm, code: v.toUpperCase() })} placeholder="CAISSIER" autoCapitalize="characters" required />
        <TextField label="Nom *" value={profilForm.nom} onChange={v => setProfilForm({ ...profilForm, nom: v })} placeholder="Caissier" required />
        <div><label htmlFor="prof-desc" className="label">Description</label><textarea id="prof-desc" value={profilForm.description} onChange={e => setProfilForm({ ...profilForm, description: e.target.value })} className="input-field" rows={2} /></div>
      </FormSheet>

      <Sheet
        open={!!permProfil} onClose={() => setPermProfil(null)} size="3xl"
        title={permProfil ? `Permissions — ${permProfil.nom}` : 'Permissions'} description={`${selectedPerms.size} permission(s) sélectionnée(s)`}
      >
        <div className="space-y-3">
          {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
            const allChecked = modulePerms.every(p => selectedPerms.has(p.id));
            return (
              <div key={module} className="border border-gray-100 dark:border-surface-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1 bg-gray-50 dark:bg-surface-700">
                  <span className="text-xs font-bold uppercase tracking-wide">{module}</span>
                  <label className="flex items-center gap-2 min-h-[44px] text-sm cursor-pointer">
                    <input type="checkbox" checked={allChecked} onChange={e => toggleModuleAll(modulePerms, e.target.checked)} className="w-5 h-5 rounded" />
                    Tout
                  </label>
                </div>
                <div className="p-2.5 flex flex-wrap gap-2">
                  {modulePerms.map(p => (
                    <label key={p.id} className={`inline-flex items-center min-h-[40px] px-3 rounded-full text-xs font-medium cursor-pointer border transition-colors focus-within:ring-2 focus-within:ring-primary-500 ${selectedPerms.has(p.id) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white dark:bg-surface-800 border-gray-300 dark:border-surface-600 text-gray-700 dark:text-gray-300'}`}>
                      <input type="checkbox" checked={selectedPerms.has(p.id)} onChange={() => togglePerm(p.id)} className="sr-only" />
                      {p.action}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700">
            <button type="button" onClick={() => setPermProfil(null)} className="btn-secondary">Annuler</button>
            <button type="button" onClick={handleSavePermissions} disabled={savingPerms} className="btn-primary disabled:opacity-50">{savingPerms ? 'Enregistrement...' : 'Enregistrer les permissions'}</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
