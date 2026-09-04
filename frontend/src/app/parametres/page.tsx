'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { utilisateursApi, parametresApi } from '@/lib/api';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'entreprise', label: 'Entreprise' },
  { id: 'utilisateurs', label: 'Utilisateurs' },
  { id: 'profils', label: 'Profils & Permissions' },
  { id: 'numerotation', label: 'Numérotation' },
  { id: 'email', label: 'Email / SMTP' },
  { id: 'sms', label: 'SMS' },
  { id: 'sauvegarde', label: 'Sauvegarde' },
];

const linkTabs = [
  { href: '/parametres/catalogue-prestations', label: 'Catalogue des prestations' },
  { href: '/parametres/modeles-courrier', label: 'Modèles de courrier' },
  { href: '/parametres/processus', label: 'Processus de suivi' },
];

const emptyUserForm = { matricule: '', nom: '', prenom: '', email: '', telephone: '', motDePasse: '', profilId: '' };
const emptyProfilForm = { code: '', nom: '', description: '' };
const emptySocieteForm = {
  raisonSociale: '', formeJuridique: '', ncc: '', rccm: '', regime: '', adresse: '', ville: '', pays: '',
  telephone: '', mobile: '', email: '', siteWeb: '', devise: 'XOF', tauxTVA: '18', timbreFiscal: '0',
  smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', smtpSecure: true,
};
const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState('entreprise');

  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [profils, setProfils] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [societe, setSociete] = useState<any>(null);
  const [societeForm, setSocieteForm] = useState(emptySocieteForm);
  const [loadingSociete, setLoadingSociete] = useState(true);
  const [savingSociete, setSavingSociete] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const [numerotations, setNumerotations] = useState<any[]>([]);
  const [loadingNumerotations, setLoadingNumerotations] = useState(true);
  const [editingNumerotation, setEditingNumerotation] = useState<string | null>(null);
  const [numerotationForm, setNumerotationForm] = useState({ prefixe: '', longueur: '6' });

  const loadSociete = () => {
    setLoadingSociete(true);
    parametresApi.societe.get().then(r => {
      const s = r.data.data;
      setSociete(s);
      setSocieteForm({
        raisonSociale: s.raisonSociale || '', formeJuridique: s.formeJuridique || '', ncc: s.ncc || '',
        rccm: s.rccm || '', regime: s.regime || '', adresse: s.adresse || '', ville: s.ville || '', pays: s.pays || '',
        telephone: s.telephone || '', mobile: s.mobile || '', email: s.email || '', siteWeb: s.siteWeb || '',
        devise: s.devise || 'XOF', tauxTVA: String(s.tauxTVA ?? 18), timbreFiscal: String(s.timbreFiscal ?? 0),
        smtpHost: s.smtpHost || '', smtpPort: s.smtpPort ? String(s.smtpPort) : '', smtpUser: s.smtpUser || '',
        smtpPass: '', smtpSecure: s.smtpSecure !== false,
      });
    }).catch(() => toast.error('Erreur de chargement des informations société'))
      .finally(() => setLoadingSociete(false));
  };

  const loadNumerotations = () => {
    setLoadingNumerotations(true);
    parametresApi.numerotations.list()
      .then(r => setNumerotations(r.data.data || []))
      .catch(() => toast.error('Erreur de chargement des numérotations'))
      .finally(() => setLoadingNumerotations(false));
  };

  useEffect(() => { loadSociete(); loadNumerotations(); }, []);

  const handleSaveSociete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSociete(true);
    try {
      const payload: any = { ...societeForm };
      if (!payload.smtpPass) delete payload.smtpPass;
      await parametresApi.societe.update(payload);
      toast.success('Informations société enregistrées');
      loadSociete();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingSociete(false); }
  };

  const handleLogoChange = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.error('Image trop volumineuse (2 Mo max)'); return; }
    setUploadingLogo(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await parametresApi.societe.setLogo(dataUrl);
      setSociete(res.data.data);
      toast.success('Logo mis à jour');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setUploadingLogo(false); }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try { const res = await parametresApi.societe.setLogo(null); setSociete(res.data.data); toast.success('Logo supprimé'); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setUploadingLogo(false); }
  };

  const handleSignatureChange = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.error('Image trop volumineuse (2 Mo max)'); return; }
    setUploadingSignature(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await parametresApi.societe.setSignature(dataUrl);
      setSociete(res.data.data);
      toast.success('Signature mise à jour');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setUploadingSignature(false); }
  };

  const handleRemoveSignature = async () => {
    setUploadingSignature(true);
    try { const res = await parametresApi.societe.setSignature(null); setSociete(res.data.data); toast.success('Signature supprimée'); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setUploadingSignature(false); }
  };

  const openEditNumerotation = (n: any) => { setEditingNumerotation(n.module); setNumerotationForm({ prefixe: n.prefixe, longueur: String(n.longueur) }); };
  const handleSaveNumerotation = async (module: string) => {
    try {
      await parametresApi.numerotations.update(module, { prefixe: numerotationForm.prefixe, longueur: parseInt(numerotationForm.longueur) || 6 });
      toast.success('Numérotation mise à jour');
      setEditingNumerotation(null);
      loadNumerotations();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);

  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');

  const [showProfilModal, setShowProfilModal] = useState(false);
  const [profilForm, setProfilForm] = useState(emptyProfilForm);
  const [savingProfil, setSavingProfil] = useState(false);

  const [permProfil, setPermProfil] = useState<any>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  const loadAll = () => {
    setLoadingUsers(true);
    Promise.all([utilisateursApi.list(), utilisateursApi.profils.list(), utilisateursApi.permissions.list()])
      .then(([uRes, pRes, permRes]) => {
        setUtilisateurs(uRes.data.data || []);
        setProfils(pRes.data.data || []);
        setPermissions(permRes.data.data || []);
      })
      .catch(() => toast.error('Erreur de chargement des utilisateurs/profils'))
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => { loadAll(); }, []);

  const openCreateUser = () => { setEditingUser(null); setUserForm(emptyUserForm); setShowUserModal(true); };
  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({ matricule: u.matricule, nom: u.nom, prenom: u.prenom, email: u.email, telephone: u.telephone || '', motDePasse: '', profilId: u.profilId || '' });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      if (editingUser) {
        await utilisateursApi.update(editingUser.id, {
          nom: userForm.nom, prenom: userForm.prenom, telephone: userForm.telephone, profilId: userForm.profilId || null,
        });
        toast.success('Utilisateur modifié');
      } else {
        if (!userForm.motDePasse || userForm.motDePasse.length < 8) { toast.error('Mot de passe : 8 caractères minimum'); setSavingUser(false); return; }
        await utilisateursApi.create(userForm);
        toast.success('Utilisateur créé');
      }
      setShowUserModal(false);
      loadAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingUser(false); }
  };

  const handleToggleStatut = async (u: any) => {
    if (!confirm(`${u.actif ? 'Désactiver' : 'Activer'} le compte de ${u.prenom} ${u.nom} ?`)) return;
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
    if (!confirm(`Supprimer le profil "${p.nom}" ?`)) return;
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
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1><p className="text-sm text-gray-500">Configuration générale de l&apos;application</p></div>

        <div className="flex gap-6">
          <div className="w-56 space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-surface-700'}`}>
                {tab.label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-surface-700 space-y-1">
              {linkTabs.map(tab => (
                <Link key={tab.href} href={tab.href}
                  className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-surface-700 transition-all">
                  {tab.label}
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 card">
            {activeTab === 'entreprise' && (
              loadingSociete ? (
                <div className="text-center py-8 text-gray-500"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
              ) : (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Logo & Signature</h3>
                  <p className="text-xs text-gray-500 mb-4">Affichés sur les documents générés (proforma, facture...). Image, 2 Mo maximum.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="label">Logo de l&apos;entreprise</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {societe?.logo ? <img src={societe.logo} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400">Aucun</span>}
                        </div>
                        <div className="space-y-2">
                          <label className="btn-secondary text-xs cursor-pointer inline-block">
                            {uploadingLogo ? 'Envoi...' : 'Choisir un fichier'}
                            <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={e => handleLogoChange(e.target.files?.[0] || null)} />
                          </label>
                          {societe?.logo && <button onClick={handleRemoveLogo} disabled={uploadingLogo} className="block text-xs text-red-500 hover:underline">Supprimer</button>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="label">Signature (cachet du responsable)</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {societe?.signature ? <img src={societe.signature} alt="Signature" className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400">Aucune</span>}
                        </div>
                        <div className="space-y-2">
                          <label className="btn-secondary text-xs cursor-pointer inline-block">
                            {uploadingSignature ? 'Envoi...' : 'Choisir un fichier'}
                            <input type="file" accept="image/*" className="hidden" disabled={uploadingSignature} onChange={e => handleSignatureChange(e.target.files?.[0] || null)} />
                          </label>
                          {societe?.signature && <button onClick={handleRemoveSignature} disabled={uploadingSignature} className="block text-xs text-red-500 hover:underline">Supprimer</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveSociete} className="space-y-4">
                  <h3 className="text-lg font-semibold">Informations Société</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="label">Raison Sociale</label><input type="text" value={societeForm.raisonSociale} onChange={e => setSocieteForm({ ...societeForm, raisonSociale: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Forme Juridique</label><input type="text" value={societeForm.formeJuridique} onChange={e => setSocieteForm({ ...societeForm, formeJuridique: e.target.value })} className="input-field" /></div>
                    <div><label className="label">NCC</label><input type="text" value={societeForm.ncc} onChange={e => setSocieteForm({ ...societeForm, ncc: e.target.value })} className="input-field" /></div>
                    <div><label className="label">RCCM</label><input type="text" value={societeForm.rccm} onChange={e => setSocieteForm({ ...societeForm, rccm: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Régime fiscal</label><input type="text" value={societeForm.regime} onChange={e => setSocieteForm({ ...societeForm, regime: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Taux TVA (%)</label><input type="number" value={societeForm.tauxTVA} onChange={e => setSocieteForm({ ...societeForm, tauxTVA: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Devise</label>
                      <select value={societeForm.devise} onChange={e => setSocieteForm({ ...societeForm, devise: e.target.value })} className="input-field">
                        <option value="XOF">XOF</option><option value="EUR">EUR</option><option value="USD">USD</option>
                      </select>
                    </div>
                    <div><label className="label">Timbre fiscal</label><input type="number" value={societeForm.timbreFiscal} onChange={e => setSocieteForm({ ...societeForm, timbreFiscal: e.target.value })} className="input-field" /></div>
                    <div className="sm:col-span-2"><label className="label">Adresse</label><input type="text" value={societeForm.adresse} onChange={e => setSocieteForm({ ...societeForm, adresse: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Ville</label><input type="text" value={societeForm.ville} onChange={e => setSocieteForm({ ...societeForm, ville: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Pays</label><input type="text" value={societeForm.pays} onChange={e => setSocieteForm({ ...societeForm, pays: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Téléphone</label><input type="text" value={societeForm.telephone} onChange={e => setSocieteForm({ ...societeForm, telephone: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Mobile</label><input type="text" value={societeForm.mobile} onChange={e => setSocieteForm({ ...societeForm, mobile: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Email</label><input type="email" value={societeForm.email} onChange={e => setSocieteForm({ ...societeForm, email: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Site web</label><input type="text" value={societeForm.siteWeb} onChange={e => setSocieteForm({ ...societeForm, siteWeb: e.target.value })} className="input-field" /></div>
                  </div>
                  <div className="flex justify-end"><button type="submit" disabled={savingSociete} className="btn-primary disabled:opacity-50">{savingSociete ? 'Enregistrement...' : 'Enregistrer'}</button></div>
                </form>
              </div>
              )
            )}

            {activeTab === 'utilisateurs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Utilisateurs ({utilisateurs.length})</h3>
                  <button onClick={openCreateUser} className="btn-primary text-sm">+ Nouvel Utilisateur</button>
                </div>
                <div className="table-container !shadow-none !border-0">
                  <table className="w-full">
                    <thead><tr>
                      <th className="table-header">Matricule</th><th className="table-header">Nom</th><th className="table-header">Email</th>
                      <th className="table-header">Profil</th><th className="table-header">Statut</th><th className="table-header">Actions</th>
                    </tr></thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
                      ) : utilisateurs.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucun utilisateur</td></tr>
                      ) : utilisateurs.map(u => (
                        <tr key={u.id} className="table-row">
                          <td className="table-cell font-medium" data-label="Matricule">{u.matricule}</td>
                          <td className="table-cell" data-label="Nom">{u.prenom} {u.nom}</td>
                          <td className="table-cell text-xs" data-label="Email">{u.email}</td>
                          <td className="table-cell" data-label="Profil">
                            {u.profil ? <span className={`badge ${u.profil.estAdmin ? 'badge-info' : 'badge-gray'}`}>{u.profil.nom}</span> : <span className="text-xs text-gray-400">Aucun</span>}
                          </td>
                          <td className="table-cell" data-label="Statut">
                            <div className="flex items-center gap-1.5">
                              <span className={`badge ${u.actif ? 'badge-success' : 'badge-danger'}`}>{u.actif ? 'Actif' : 'Désactivé'}</span>
                              {u.verrouille && <span className="badge badge-warning">Verrouillé</span>}
                            </div>
                          </td>
                          <td className="table-cell" data-label="Actions">
                            <div className="flex items-center gap-2 text-xs">
                              <button onClick={() => openEditUser(u)} className="text-primary-500 hover:underline">Modifier</button>
                              <button onClick={() => handleToggleStatut(u)} className={u.actif ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'}>{u.actif ? 'Désactiver' : 'Activer'}</button>
                              {u.verrouille && <button onClick={() => handleDeverrouiller(u)} className="text-amber-600 hover:underline">Déverrouiller</button>}
                              <button onClick={() => { setResetUser(u); setResetPassword(''); }} className="text-gray-500 hover:underline">Mot de passe</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'profils' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Profils & Permissions</h3>
                  <button onClick={openCreateProfil} className="btn-primary text-sm">+ Nouveau Profil</button>
                </div>
                {loadingUsers ? (
                  <div className="text-center py-8 text-gray-500"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                ) : (
                  <div className="space-y-2">
                    {profils.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
                        <div>
                          <span className="font-medium text-sm">{p.nom}</span>
                          {p.estAdmin && <span className="badge badge-info ml-2">Accès total</span>}
                          <p className="text-xs text-gray-500 mt-0.5">{p.description || 'Aucune description'} — {p.nbUtilisateurs} utilisateur(s){!p.estAdmin && ` — ${p.permissionIds.length} permission(s)`}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {!p.estAdmin && <button onClick={() => openPermissions(p)} className="text-primary-500 hover:underline font-medium">Gérer les permissions</button>}
                          {!p.estAdmin && p.nbUtilisateurs === 0 && <button onClick={() => handleDeleteProfil(p)} className="text-red-500 hover:underline">Supprimer</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'numerotation' && (
              <div>
                <h3 className="text-lg font-semibold mb-1">Numérotation automatique</h3>
                <p className="text-xs text-gray-500 mb-4">Préfixe et longueur du compteur pour l&apos;année {new Date().getFullYear()}. Format : PRÉFIXE/ANNÉE/COMPTEUR.</p>
                {loadingNumerotations ? (
                  <div className="text-center py-8 text-gray-500"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
                ) : (
                  <div className="space-y-2">
                    {numerotations.map(n => (
                      <div key={n.module} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-700 rounded-lg gap-3">
                        <span className="text-sm font-medium flex-1">{n.label}</span>
                        {editingNumerotation === n.module ? (
                          <>
                            <input type="text" value={numerotationForm.prefixe} onChange={e => setNumerotationForm({ ...numerotationForm, prefixe: e.target.value.toUpperCase() })} className="input-field !w-24 !py-1 text-xs" />
                            <input type="number" value={numerotationForm.longueur} onChange={e => setNumerotationForm({ ...numerotationForm, longueur: e.target.value })} className="input-field !w-16 !py-1 text-xs" min="3" max="10" />
                            <button onClick={() => handleSaveNumerotation(n.module)} className="text-xs text-primary-600 font-medium hover:underline">Enregistrer</button>
                            <button onClick={() => setEditingNumerotation(null)} className="text-xs text-gray-400 hover:underline">Annuler</button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-gray-500 font-mono">{n.prefixe}/{n.annee}/{String(n.compteur + 1).padStart(n.longueur, '0')}</span>
                            <span className="text-[10px] text-gray-400">{n.enUsage ? `${n.compteur} émis` : 'jamais utilisé'}</span>
                            <button onClick={() => openEditNumerotation(n)} className="text-xs text-primary-500 hover:underline">Modifier</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'email' && (
              loadingSociete ? (
                <div className="text-center py-8 text-gray-500"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
              ) : (
                <form onSubmit={handleSaveSociete}>
                  <h3 className="text-lg font-semibold mb-4">Configuration SMTP</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="label">Serveur SMTP</label><input type="text" value={societeForm.smtpHost} onChange={e => setSocieteForm({ ...societeForm, smtpHost: e.target.value })} className="input-field" placeholder="smtp.gmail.com" /></div>
                    <div><label className="label">Port</label><input type="number" value={societeForm.smtpPort} onChange={e => setSocieteForm({ ...societeForm, smtpPort: e.target.value })} className="input-field" placeholder="587" /></div>
                    <div><label className="label">Utilisateur</label><input type="text" value={societeForm.smtpUser} onChange={e => setSocieteForm({ ...societeForm, smtpUser: e.target.value })} className="input-field" /></div>
                    <div><label className="label">Mot de passe</label><input type="password" value={societeForm.smtpPass} onChange={e => setSocieteForm({ ...societeForm, smtpPass: e.target.value })} className="input-field" placeholder={societe?.smtpHost ? '••••••••' : ''} /></div>
                    <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
                      <input type="checkbox" checked={societeForm.smtpSecure} onChange={e => setSocieteForm({ ...societeForm, smtpSecure: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-sm">Connexion sécurisée (TLS/SSL)</span>
                    </label>
                  </div>
                  <div className="flex justify-end mt-4"><button type="submit" disabled={savingSociete} className="btn-primary disabled:opacity-50">{savingSociete ? 'Enregistrement...' : 'Enregistrer'}</button></div>
                </form>
              )
            )}
            {activeTab === 'sms' && <div><h3 className="text-lg font-semibold mb-4">Configuration SMS</h3><p className="text-gray-500 text-sm">Configurez l&apos;API Orange pour l&apos;envoi de SMS automatiques.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"><div><label className="label">Clé API Orange</label><input type="text" className="input-field" /></div><div><label className="label">Secret API</label><input type="password" className="input-field" /></div></div></div>}
            {activeTab === 'sauvegarde' && <div><h3 className="text-lg font-semibold mb-4">Sauvegarde & Restauration</h3><div className="space-y-4"><button className="btn-primary">Sauvegarder maintenant</button><p className="text-sm text-gray-500">Dernière sauvegarde : Aucune</p></div></div>}
          </div>
        </div>
      </div>

      {/* Modal Nouvel/Modifier Utilisateur */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}</h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Matricule *</label><input type="text" value={userForm.matricule} onChange={e => setUserForm({ ...userForm, matricule: e.target.value.toUpperCase() })} className="input-field" disabled={!!editingUser} required /></div>
                <div><label className="label">Profil</label>
                  <select value={userForm.profilId} onChange={e => setUserForm({ ...userForm, profilId: e.target.value })} className="input-field">
                    <option value="">— Aucun —</option>
                    {profils.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Prénom *</label><input type="text" value={userForm.prenom} onChange={e => setUserForm({ ...userForm, prenom: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Nom *</label><input type="text" value={userForm.nom} onChange={e => setUserForm({ ...userForm, nom: e.target.value })} className="input-field" required /></div>
              </div>
              <div><label className="label">Email *</label><input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="input-field" disabled={!!editingUser} required /></div>
              <div><label className="label">Téléphone</label><input type="text" value={userForm.telephone} onChange={e => setUserForm({ ...userForm, telephone: e.target.value })} className="input-field" /></div>
              {!editingUser && (
                <div><label className="label">Mot de passe initial * <span className="text-gray-400 font-normal">(8 caractères min.)</span></label><input type="password" value={userForm.motDePasse} onChange={e => setUserForm({ ...userForm, motDePasse: e.target.value })} className="input-field" required /></div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" disabled={savingUser} className="btn-primary text-sm disabled:opacity-50">{savingUser ? 'Enregistrement...' : editingUser ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Réinitialiser mot de passe */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Réinitialiser le mot de passe</h3>
              <button onClick={() => setResetUser(null)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-4 space-y-3">
              <p className="text-sm text-gray-500">{resetUser.prenom} {resetUser.nom} devra changer ce mot de passe à sa prochaine connexion.</p>
              <div><label className="label">Nouveau mot de passe *</label><input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="input-field" required /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setResetUser(null)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" className="btn-primary text-sm">Réinitialiser</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nouveau Profil */}
      {showProfilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Nouveau Profil</h3>
              <button onClick={() => setShowProfilModal(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSaveProfil} className="p-4 space-y-3">
              <div><label className="label">Code *</label><input type="text" value={profilForm.code} onChange={e => setProfilForm({ ...profilForm, code: e.target.value.toUpperCase() })} className="input-field" placeholder="CAISSIER" required /></div>
              <div><label className="label">Nom *</label><input type="text" value={profilForm.nom} onChange={e => setProfilForm({ ...profilForm, nom: e.target.value })} className="input-field" placeholder="Caissier" required /></div>
              <div><label className="label">Description</label><textarea value={profilForm.description} onChange={e => setProfilForm({ ...profilForm, description: e.target.value })} className="input-field" rows={2} /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setShowProfilModal(false)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" disabled={savingProfil} className="btn-primary text-sm disabled:opacity-50">{savingProfil ? 'Création...' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gérer les permissions */}
      {permProfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <div>
                <h3 className="font-bold text-lg">Permissions — {permProfil.nom}</h3>
                <p className="text-xs text-gray-500">{selectedPerms.size} permission(s) sélectionnée(s)</p>
              </div>
              <button onClick={() => setPermProfil(null)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
                const allChecked = modulePerms.every(p => selectedPerms.has(p.id));
                return (
                  <div key={module} className="border border-gray-100 dark:border-surface-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-surface-700">
                      <span className="text-xs font-bold uppercase tracking-wide">{module}</span>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={allChecked} onChange={e => toggleModuleAll(modulePerms, e.target.checked)} className="w-3.5 h-3.5 rounded" />
                        Tout
                      </label>
                    </div>
                    <div className="p-2.5 flex flex-wrap gap-1.5">
                      {modulePerms.map(p => (
                        <label key={p.id} className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer border transition-colors ${selectedPerms.has(p.id) ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white dark:bg-surface-800 border-gray-200 dark:border-surface-600 text-gray-600 dark:text-gray-300'}`}>
                          <input type="checkbox" checked={selectedPerms.has(p.id)} onChange={() => togglePerm(p.id)} className="hidden" />
                          {p.action}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-surface-700 flex justify-end gap-2">
              <button onClick={() => setPermProfil(null)} className="btn-secondary text-sm">Annuler</button>
              <button onClick={handleSavePermissions} disabled={savingPerms} className="btn-primary text-sm disabled:opacity-50">{savingPerms ? 'Enregistrement...' : 'Enregistrer les permissions'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
