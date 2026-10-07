'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { platformApi, platformAuth } from '@/lib/platformApi';
import toast from 'react-hot-toast';

const ONGLETS = [
  { id: 'comptes', label: 'Comptes super-admin' },
  { id: 'fournisseurs', label: 'Fournisseurs de paiement' },
  { id: 'vitrine', label: 'Contenu vitrine' },
  { id: 'bdd', label: 'Base de données' },
];

export default function AdminConfigurationPage() {
  const [onglet, setOnglet] = useState('comptes');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { setIsSuperAdmin(!!platformAuth.getAdmin()?.superAdmin); }, []);

  return (
    <AdminShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration</h1>
          <p className="text-sm text-gray-500">Réglages de la plateforme SaaS</p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-surface-700">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === o.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {onglet === 'comptes' && <SectionComptes isSuperAdmin={isSuperAdmin} />}
        {onglet === 'fournisseurs' && <SectionFournisseurs isSuperAdmin={isSuperAdmin} />}
        {onglet === 'vitrine' && <SectionVitrine isSuperAdmin={isSuperAdmin} />}
        {onglet === 'bdd' && <SectionBaseDeDonnees />}
      </div>
    </AdminShell>
  );
}

function SectionComptes({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', motDePasse: '', nom: '', prenom: '', superAdmin: true });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformApi.admins().then(r => setAdmins(r.data.data || [])).catch(() => toast.error('Erreur de chargement')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await platformApi.creerAdmin(form);
      toast.success('Compte créé');
      setShowForm(false);
      setForm({ email: '', motDePasse: '', nom: '', prenom: '', superAdmin: true });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const toggleStatut = async (id: string) => {
    setBusyId(id);
    try {
      await platformApi.toggleAdminStatut(id);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyId(null); }
  };

  const supprimerAdmin = async (id: string) => {
    if (!confirm('Supprimer définitivement ce compte administrateur ? Cette action est irréversible.')) return;
    setBusyId(id);
    try {
      await platformApi.supprimerAdmin(id);
      toast.success('Compte supprimé');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-10"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
      ) : (
        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Nom</th>
              <th className="table-header">Email</th>
              <th className="table-header">Rôle</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id} className="table-row">
                  <td className="table-cell font-medium" data-label="Nom">{a.prenom} {a.nom}</td>
                  <td className="table-cell text-xs" data-label="Email">{a.email}</td>
                  <td className="table-cell" data-label="Rôle"><span className={`badge ${a.superAdmin ? 'badge-success' : 'badge-gray'} !text-[10px]`}>{a.superAdmin ? 'Super-admin' : 'Lecture seule'}</span></td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${a.actif ? 'badge-success' : 'badge-danger'} !text-[10px]`}>{a.actif ? 'Actif' : 'Désactivé'}</span></td>
                  <td className="table-cell" data-label="Actions">
                    {isSuperAdmin && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleStatut(a.id)} disabled={busyId === a.id} className="text-xs text-primary-600 hover:underline disabled:opacity-50">
                          {a.actif ? 'Désactiver' : 'Activer'}
                        </button>
                        <button onClick={() => supprimerAdmin(a.id)} disabled={busyId === a.id} className="text-xs text-red-600 hover:underline disabled:opacity-50">
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isSuperAdmin && (
        showForm ? (
          <form onSubmit={handleCreate} className="card space-y-3 !p-5 max-w-md">
            <h3 className="font-bold text-gray-900 dark:text-white">Nouveau compte administrateur</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Prénom</label><input required value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input-field" /></div>
              <div><label className="label">Nom</label><input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input-field" /></div>
            </div>
            <div><label className="label">Email</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
            <div><label className="label">Mot de passe</label><input type="password" required minLength={8} value={form.motDePasse} onChange={e => setForm({ ...form, motDePasse: e.target.value })} className="input-field" /></div>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.superAdmin} onChange={e => setForm({ ...form, superAdmin: e.target.checked })} /> Super-admin (accès complet)</label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn-secondary text-sm">+ Nouveau compte</button>
        )
      )}
    </div>
  );
}

function SectionFournisseurs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [valeurs, setValeurs] = useState<Record<string, Record<string, string>>>({});
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformApi.fournisseursPaiement().then(r => setFournisseurs(r.data.data || [])).catch(() => toast.error('Erreur de chargement')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const champVal = (code: string, cle: string) => valeurs[code]?.[cle] ?? '';
  const setChampVal = (code: string, cle: string, v: string) => setValeurs(prev => ({ ...prev, [code]: { ...prev[code], [cle]: v } }));

  const enregistrer = async (code: string) => {
    setBusyCode(code);
    try {
      await platformApi.majFournisseurPaiement(code, { champs: valeurs[code] || {} });
      toast.success('Identifiants enregistrés');
      setValeurs(prev => ({ ...prev, [code]: {} }));
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyCode(null); }
  };

  const activer = async (code: string) => {
    setBusyCode(code);
    try {
      await platformApi.majFournisseurPaiement(code, { actif: true });
      toast.success(`${code} activé — c'est désormais lui qui traite les paiements`);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyCode(null); }
  };

  const desactiver = async (code: string) => {
    setBusyCode(code);
    try {
      await platformApi.majFournisseurPaiement(code, { actif: false });
      toast.success(`${code} désactivé`);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusyCode(null); }
  };

  if (loading) return <div className="text-center py-10"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-xs text-gray-500">
        Un seul fournisseur peut être actif à la fois : c&apos;est lui qui traite les paiements d&apos;abonnement de toutes les sociétés clientes.
        Les clés saisies sont chiffrées avant d&apos;être enregistrées et ne sont jamais réaffichées en clair.
      </p>
      {fournisseurs.map(f => (
        <div key={f.code} className={`card space-y-3 ${f.actif ? '!border-2 !border-primary-500' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white">{f.nom}</h3>
              {f.actif && <span className="badge badge-success !text-[10px]">Actif</span>}
              <span className={`badge ${f.configure ? 'badge-success' : 'badge-gray'} !text-[10px]`}>{f.configure ? 'Configuré' : 'Non configuré'}</span>
            </div>
            {isSuperAdmin && (
              f.actif ? (
                <button onClick={() => desactiver(f.code)} disabled={busyCode === f.code} className="text-xs text-gray-500 hover:underline disabled:opacity-50">Désactiver</button>
              ) : (
                <button onClick={() => activer(f.code)} disabled={busyCode === f.code || !f.configure} title={!f.configure ? 'Renseignez et enregistrez les identifiants requis avant de l\'activer' : undefined} className="text-xs text-primary-600 hover:underline disabled:opacity-50">Activer ce fournisseur</button>
              )
            )}
          </div>

          {f.correspondants?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {f.correspondants.map((c: any) => <span key={c.code} className="badge badge-gray !text-[10px]">{c.label}</span>)}
            </div>
          )}

          {isSuperAdmin && f.champs?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-surface-700">
              {f.champs.map((c: any) => (
                <div key={c.cle}>
                  <label className="label">{c.label}{c.obligatoire && ' *'}</label>
                  <input
                    type={c.secret ? 'password' : 'text'}
                    value={champVal(f.code, c.cle)}
                    onChange={e => setChampVal(f.code, c.cle, e.target.value)}
                    placeholder={c.renseigne ? '••••••••• (déjà enregistré)' : c.placeholder || ''}
                    className="input-field text-sm"
                  />
                </div>
              ))}
              <div className="sm:col-span-2 flex justify-end">
                <button onClick={() => enregistrer(f.code)} disabled={busyCode === f.code} className="btn-secondary !text-sm disabled:opacity-50">
                  {busyCode === f.code ? 'Enregistrement...' : 'Enregistrer les identifiants'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const VITRINE_VIDE = { heroBadge: '', heroTitre: '', heroSousTitre: '', tarifsTitre: '', tarifsSousTitre: '' };

function SectionVitrine({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [form, setForm] = useState<any>(VITRINE_VIDE);
  const [faqText, setFaqText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    platformApi.contenuVitrine().then(r => {
      const c = r.data.data || {};
      setForm({ heroBadge: c.heroBadge || '', heroTitre: c.heroTitre || '', heroSousTitre: c.heroSousTitre || '', tarifsTitre: c.tarifsTitre || '', tarifsSousTitre: c.tarifsSousTitre || '' });
      setFaqText((c.faq || []).map((f: any) => `${f.q}\n${f.r}`).join('\n\n'));
    }).catch(() => toast.error('Erreur de chargement — formulaire vide affiché')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const faq = faqText.split(/\n\s*\n/).map(bloc => {
        const [q, ...reste] = bloc.split('\n');
        return { q: (q || '').trim(), r: reste.join(' ').trim() };
      }).filter(f => f.q && f.r);
      await platformApi.majContenuVitrine({ ...form, faq });
      toast.success('Contenu mis à jour');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  if (loading || !form) return <div className="text-center py-10"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="card max-w-2xl space-y-4">
      <div>
        <label className="label">Badge d&apos;accroche (page d&apos;accueil)</label>
        <input disabled={!isSuperAdmin} value={form.heroBadge} onChange={e => setForm({ ...form, heroBadge: e.target.value })} className="input-field disabled:opacity-60" />
      </div>
      <div>
        <label className="label">Titre principal</label>
        <input disabled={!isSuperAdmin} value={form.heroTitre} onChange={e => setForm({ ...form, heroTitre: e.target.value })} className="input-field disabled:opacity-60" />
      </div>
      <div>
        <label className="label">Sous-titre</label>
        <textarea disabled={!isSuperAdmin} value={form.heroSousTitre} onChange={e => setForm({ ...form, heroSousTitre: e.target.value })} className="input-field disabled:opacity-60" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Titre page Tarifs</label><input disabled={!isSuperAdmin} value={form.tarifsTitre} onChange={e => setForm({ ...form, tarifsTitre: e.target.value })} className="input-field disabled:opacity-60" /></div>
        <div><label className="label">Sous-titre page Tarifs</label><input disabled={!isSuperAdmin} value={form.tarifsSousTitre} onChange={e => setForm({ ...form, tarifsSousTitre: e.target.value })} className="input-field disabled:opacity-60" /></div>
      </div>
      <div>
        <label className="label">FAQ (question puis réponse, une ligne chacune, séparées par une ligne vide entre chaque question)</label>
        <textarea disabled={!isSuperAdmin} value={faqText} onChange={e => setFaqText(e.target.value)} className="input-field disabled:opacity-60 font-mono text-xs" rows={10} />
      </div>
      {isSuperAdmin && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      )}
    </div>
  );
}

const fmtOctetsAdmin = (o: number) => {
  if (!o) return '0 Mo';
  const mo = o / (1024 * 1024);
  if (mo < 1) return `${(o / 1024).toFixed(0)} Ko`;
  if (mo < 1024) return `${mo.toFixed(1)} Mo`;
  return `${(mo / 1024).toFixed(2)} Go`;
};

function SectionBaseDeDonnees() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.dbTaille().then(r => setData(r.data.data)).catch(() => toast.error('Erreur de chargement')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card !p-5">
        <p className="text-xs text-gray-500 mb-1">Taille totale de la base de données (toutes sociétés)</p>
        <p className="text-3xl font-extrabold text-primary-600">{fmtOctetsAdmin(data.totalOctets)}</p>
        <p className="text-[11px] text-gray-400 mt-1">Mesure exacte PostgreSQL — base unique partagée par toutes les sociétés clientes.</p>
      </div>

      <div className="card !p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Répartition par société</h3>
        <p className="text-xs text-gray-500 mb-3">Estimation basée sur le poids des données des principales tables (hors index, hors fichiers joints).</p>
        {!data.parSociete?.length ? (
          <p className="text-sm text-gray-500">Aucune société</p>
        ) : (
          <div className="space-y-2">
            {data.parSociete.map((s: any) => (
              <div key={s.societeId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{s.raisonSociale}</span>
                <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white">{fmtOctetsAdmin(s.octetsEstimes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
