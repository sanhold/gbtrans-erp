'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { utilisateursApi } from '@/lib/api';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import FormSheet, { FormSection } from '@/components/forms/FormSheet';
import TextField from '@/components/forms/TextField';
import EmptyRow from '@/components/tables/EmptyRow';
import FAB from '@/components/ui/FAB';

const emptyUserForm = { matricule: '', nom: '', prenom: '', email: '', telephone: '', motDePasse: '', profilId: '' };

export default function UtilisateursSection() {
  const confirmer = useConfirm();
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [profils, setProfils] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [userErreur, setUserErreur] = useState('');

  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([utilisateursApi.list(), utilisateursApi.profils.list()])
      .then(([uRes, pRes]) => {
        setUtilisateurs(uRes.data.data || []);
        setProfils(pRes.data.data || []);
      })
      .catch(() => toast.error('Erreur de chargement des utilisateurs/profils'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreateUser = () => { setEditingUser(null); setUserForm(emptyUserForm); setUserErreur(''); setShowUserModal(true); };
  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({ matricule: u.matricule, nom: u.nom, prenom: u.prenom, email: u.email, telephone: u.telephone || '', motDePasse: '', profilId: u.profilId || '' });
    setUserErreur('');
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserErreur('');
    if (!editingUser && (!userForm.motDePasse || userForm.motDePasse.length < 8)) {
      setUserErreur('Mot de passe : 8 caractères minimum'); toast.error('Mot de passe : 8 caractères minimum'); return;
    }
    setSavingUser(true);
    try {
      if (editingUser) {
        await utilisateursApi.update(editingUser.id, {
          nom: userForm.nom, prenom: userForm.prenom, telephone: userForm.telephone, profilId: userForm.profilId || null,
        });
        toast.success('Utilisateur modifié');
      } else {
        await utilisateursApi.create(userForm);
        toast.success('Utilisateur créé');
      }
      setShowUserModal(false);
      loadAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingUser(false); }
  };

  const handleToggleStatut = async (u: any) => {
    if (!(await confirmer({ titre: `${u.actif ? 'Désactiver' : 'Activer'} ce compte ?`, message: `${u.prenom} ${u.nom}`, danger: u.actif, confirmer: u.actif ? 'Désactiver' : 'Activer' }))) return;
    try { await utilisateursApi.toggleStatut(u.id); toast.success(u.actif ? 'Utilisateur désactivé' : 'Utilisateur activé'); loadAll(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleDeverrouiller = async (u: any) => {
    try { await utilisateursApi.deverrouiller(u.id); toast.success('Compte déverrouillé'); loadAll(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword || resetPassword.length < 8) { toast.error('8 caractères minimum'); return; }
    try {
      await utilisateursApi.resetPassword(resetUser.id, resetPassword);
      toast.success('Mot de passe réinitialisé');
      setResetUser(null);
      setResetPassword('');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const lien = 'text-sm font-medium hover:underline px-2 py-1.5';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Utilisateurs ({utilisateurs.length})</h3>
        <button type="button" onClick={openCreateUser} className="btn-primary hidden lg:inline-flex">+ Nouvel Utilisateur</button>
      </div>
      <div className="table-container !shadow-none !border-0">
        <table className="w-full">
          <thead><tr>
            <th className="table-header">Actions</th>
            <th className="table-header">Matricule</th>
            <th className="table-header">Nom</th>
            <th className="table-header">Email</th>
            <th className="table-header">Profil</th>
            <th className="table-header">Statut</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={6} />
            ) : utilisateurs.length === 0 ? (
              <EmptyRow colSpan={6} message="Aucun utilisateur" ctaLabel="Créer un utilisateur" onCta={openCreateUser} />
            ) : utilisateurs.map(u => {
              const verrouille = !!u.verrouilleJusqua && new Date(u.verrouilleJusqua) > new Date();
              return (
                <tr key={u.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex flex-wrap items-center gap-x-1">
                      <button type="button" onClick={() => openEditUser(u)} className={`${lien} text-primary-600`}>Modifier</button>
                      <button type="button" onClick={() => handleToggleStatut(u)} className={`${lien} ${u.actif ? 'text-red-600' : 'text-green-700'}`}>{u.actif ? 'Désactiver' : 'Activer'}</button>
                      {verrouille && <button type="button" onClick={() => handleDeverrouiller(u)} className={`${lien} text-amber-700`}>Déverrouiller</button>}
                      <button type="button" onClick={() => { setResetUser(u); setResetPassword(''); }} className={`${lien} text-gray-700 dark:text-gray-300`}>Mot de passe</button>
                    </div>
                  </td>
                  <td className="table-cell font-medium" data-label="Matricule">{u.matricule}</td>
                  <td className="table-cell" data-label="Nom">{u.prenom} {u.nom}</td>
                  <td className="table-cell text-xs col-opt" data-label="Email">{u.email}</td>
                  <td className="table-cell" data-label="Profil">
                    {u.profil ? <span className={`badge ${u.profil.estAdmin ? 'badge-info' : 'badge-gray'}`}>{u.profil.nom}</span> : <span className="text-xs text-gray-600 dark:text-gray-400">Aucun</span>}
                  </td>
                  <td className="table-cell" data-label="Statut">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`badge ${u.actif ? 'badge-success' : 'badge-danger'}`}>{u.actif ? 'Actif' : 'Désactivé'}</span>
                      {verrouille && <span className="badge badge-warning" title={`Jusqu'au ${new Date(u.verrouilleJusqua).toLocaleString('fr-FR')}`}>Verrouillé</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FAB label="Nouvel utilisateur" onClick={openCreateUser} />

      <FormSheet
        open={showUserModal} onClose={() => setShowUserModal(false)} size="md" onSubmit={handleSaveUser} saving={savingUser}
        title={editingUser ? "Modifier l'utilisateur" : 'Nouvel Utilisateur'} submitLabel={editingUser ? 'Modifier' : 'Créer'}
      >
        <FormSection title="Identité">
          <TextField label="Matricule *" value={userForm.matricule} onChange={v => setUserForm({ ...userForm, matricule: v.toUpperCase() })} autoCapitalize="characters" disabled={!!editingUser} required />
          <div>
            <label htmlFor="usr-profil" className="label">Profil</label>
            <select id="usr-profil" value={userForm.profilId} onChange={e => setUserForm({ ...userForm, profilId: e.target.value })} className="input-field">
              <option value="">— Aucun —</option>
              {profils.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <TextField label="Prénom *" value={userForm.prenom} onChange={v => setUserForm({ ...userForm, prenom: v })} autoComplete="off" required />
          <TextField label="Nom *" value={userForm.nom} onChange={v => setUserForm({ ...userForm, nom: v })} autoComplete="off" required />
        </FormSection>
        <FormSection title="Contact et accès" cols={1}>
          <TextField label="Email *" type="email" inputMode="email" value={userForm.email} onChange={v => setUserForm({ ...userForm, email: v })} autoComplete="off" disabled={!!editingUser} required />
          <TextField label="Téléphone" type="tel" inputMode="tel" value={userForm.telephone} onChange={v => setUserForm({ ...userForm, telephone: v })} />
          {!editingUser && (
            <TextField
              label="Mot de passe initial *" type="password" autoComplete="new-password" value={userForm.motDePasse}
              onChange={v => setUserForm({ ...userForm, motDePasse: v })} hint="8 caractères minimum" error={userErreur} required
            />
          )}
        </FormSection>
      </FormSheet>

      <FormSheet
        open={!!resetUser} onClose={() => setResetUser(null)} size="sm" onSubmit={handleResetPassword}
        title="Réinitialiser le mot de passe" submitLabel="Réinitialiser"
      >
        {resetUser && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">{resetUser.prenom} {resetUser.nom} devra changer ce mot de passe à sa prochaine connexion.</p>
            <TextField label="Nouveau mot de passe *" type="password" autoComplete="new-password" value={resetPassword} onChange={setResetPassword} hint="8 caractères minimum" required />
          </>
        )}
      </FormSheet>
    </div>
  );
}
