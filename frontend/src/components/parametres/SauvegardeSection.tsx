'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { parametresApi } from '@/lib/api';

const fmtOctets = (o: number) => {
  if (!o) return '0 Mo';
  const mo = o / (1024 * 1024);
  if (mo < 1) return `${(o / 1024).toFixed(0)} Ko`;
  if (mo < 1024) return `${mo.toFixed(1)} Mo`;
  return `${(mo / 1024).toFixed(2)} Go`;
};
const fmtDateHeure = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais';

const FREQUENCES = [
  { jours: 1, label: 'Chaque jour' },
  { jours: 3, label: 'Tous les 3 jours' },
  { jours: 7, label: 'Chaque semaine' },
];

const GRIS = 'text-gray-600 dark:text-gray-400';

export default function SauvegardeSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [emailDestination, setEmailDestination] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    parametresApi.sauvegarde.get().then(r => {
      setData(r.data.data);
      setEmailDestination(r.data.data.backupEmailDestination || '');
    }).catch(() => toast.error('Erreur de chargement')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const maj = async (payload: any, ok: string) => {
    setSaving(true);
    try { await parametresApi.sauvegarde.update(payload); toast.success(ok); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const executerMaintenant = async () => {
    setExecuting(true);
    try {
      const r = await parametresApi.sauvegarde.executer();
      toast.success(r.data.message);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur lors de la sauvegarde'); }
    finally { setExecuting(false); }
  };

  if (loading || !data) return <div className="text-center py-10" role="status" aria-label="Chargement"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Sauvegarde automatique</h3>
      <p className={`text-sm ${GRIS} -mt-3`}>
        Un export de vos données (dossiers, clients, factures, etc.) est envoyé par email selon la fréquence choisie ci-dessous.
        Les fichiers joints aux dossiers ne sont pas inclus, uniquement les données structurées.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card !p-4">
          <p className={`text-xs ${GRIS} mb-1`}>Volume de données estimé</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{fmtOctets(data.estimationTailleOctets)}</p>
        </div>
        <div className="card !p-4">
          <p className={`text-xs ${GRIS} mb-1`}>Dernière sauvegarde</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtDateHeure(data.derniereSauvegardeAt)}</p>
        </div>
      </div>

      <div className="card !p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white">Sauvegardes automatiques</p>
            <p className={`text-xs ${GRIS}`}>Formule {data.formuleNom} — fréquence minimale autorisée : {data.frequenceMinJours === 1 ? 'quotidienne' : `tous les ${data.frequenceMinJours} jours`}</p>
          </div>
          <button
            type="button" disabled={saving}
            onClick={() => maj({ backupActif: !data.backupActif }, data.backupActif ? 'Sauvegardes désactivées' : 'Sauvegardes activées')}
            className={`btn-secondary disabled:opacity-50 ${data.backupActif ? '!text-red-600' : '!text-accent-600'}`}
          >
            {data.backupActif ? 'Désactiver' : 'Activer'}
          </button>
        </div>

        <div>
          <p className="label">Fréquence</p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCES.map(f => {
              const verrou = f.jours < data.frequenceMinJours;
              return (
                <button
                  key={f.jours} type="button" aria-pressed={data.backupFrequenceJours === f.jours}
                  onClick={() => maj({ backupFrequenceJours: f.jours }, 'Fréquence mise à jour')}
                  disabled={saving || verrou}
                  title={verrou ? 'Nécessite une formule supérieure' : undefined}
                  className={`min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${data.backupFrequenceJours === f.jours ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-gray-300'}`}
                >
                  {f.label}{verrou ? ' (formule supérieure)' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="backup-email" className="label">Email de destination</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="backup-email" type="email" inputMode="email" autoComplete="email" value={emailDestination} onChange={e => setEmailDestination(e.target.value)} className="input-field flex-1" placeholder="votre-email@gmail.com" />
            <button type="button" onClick={() => maj({ backupEmailDestination: emailDestination }, 'Email de destination enregistré')} disabled={saving} className="btn-secondary disabled:opacity-50">Enregistrer</button>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-surface-700">
          <button type="button" onClick={executerMaintenant} disabled={executing} className="btn-primary w-full sm:w-auto disabled:opacity-50">
            {executing ? 'Envoi en cours...' : 'Sauvegarder maintenant'}
          </button>
        </div>
      </div>

      <div className="card !p-4">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Historique</h4>
        {!data.historique?.length ? (
          <p className={`text-sm ${GRIS}`}>Aucune sauvegarde effectuée</p>
        ) : (
          <ul className="space-y-2">
            {data.historique.map((h: any) => (
              <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <span className={`badge ${h.statut === 'REUSSI' ? 'badge-success' : 'badge-danger'} mr-2`}>{h.statut === 'REUSSI' ? 'Réussie' : 'Échec'}</span>
                  <span className={`${GRIS} text-xs`}>{fmtDateHeure(h.createdAt)}</span>
                </div>
                <span className={`text-xs ${GRIS}`}>{h.tailleOctets ? fmtOctets(h.tailleOctets) : h.message || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
