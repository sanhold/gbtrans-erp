'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { vehiculesApi } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPE_LABEL: Record<string, string> = { CAMION: 'Camion', REMORQUE: 'Remorque', CAMIONNETTE: 'Camionnette', VOITURE: 'Voiture', MOTO: 'Moto', AUTRE: 'Autre' };
const STATUT_LABEL: Record<string, string> = { DISPONIBLE: 'Disponible', EN_COURSE: 'En course', EN_MAINTENANCE: 'En maintenance', HORS_SERVICE: 'Hors service' };
const STATUT_BADGE: Record<string, string> = { DISPONIBLE: 'badge-success', EN_COURSE: 'badge-info', EN_MAINTENANCE: 'badge-warning', HORS_SERVICE: 'badge-danger' };
const STATUTS = Object.keys(STATUT_LABEL);

const COURSE_STATUT_LABEL: Record<string, string> = { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' };
const COURSE_STATUT_BADGE: Record<string, string> = { PLANIFIEE: 'badge-info', EN_COURS: 'badge-warning', TERMINEE: 'badge-success', ANNULEE: 'badge-danger' };
const MAINTENANCE_TYPE_LABEL: Record<string, string> = { VIDANGE: 'Vidange', REPARATION: 'Réparation', VISITE_TECHNIQUE: 'Visite technique', ASSURANCE: 'Assurance', PNEUS: 'Pneus', AUTRE: 'Autre' };

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const fmtMontant = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';
const dateProche = (d: any) => d && new Date(d).getTime() < Date.now() + 30 * 86400000;

export default function VehiculeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vehicule, setVehicule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    vehiculesApi.get(params.id as string)
      .then(r => setVehicule(r.data.data))
      .catch(() => toast.error('Véhicule introuvable'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const changerStatut = async (statut: string) => {
    setBusy(true);
    try {
      await vehiculesApi.update(params.id as string, { statut });
      toast.success('Statut mis à jour');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  if (loading) return <AppLayout><div className="text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div></AppLayout>;
  if (!vehicule) return <AppLayout><p className="text-gray-500">Véhicule introuvable</p></AppLayout>;

  const totalFraisMaintenance = (vehicule.maintenances || []).reduce((s: number, m: any) => s + Number(m.cout || 0), 0);
  const totalFraisCourses = (vehicule.courses || []).reduce((s: number, c: any) => s + Number(c.fraisCarburant || 0) + Number(c.fraisPeage || 0) + Number(c.autresFrais || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/transport/vehicules')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{vehicule.immatriculation}</h1>
            <p className="text-sm text-gray-500">{[vehicule.marque, vehicule.modele].filter(Boolean).join(' ') || TYPE_LABEL[vehicule.type]} — {TYPE_LABEL[vehicule.type]}</p>
          </div>
          <span className={`badge ${STATUT_BADGE[vehicule.statut]}`}>{STATUT_LABEL[vehicule.statut]}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card lg:col-span-1 space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white">Informations</h3>
            <InfoLigne label="Type" valeur={TYPE_LABEL[vehicule.type]} />
            <InfoLigne label="Capacité charge" valeur={vehicule.capaciteChargeKg ? `${vehicule.capaciteChargeKg} kg` : '-'} />
            <InfoLigne label="Capacité volume" valeur={vehicule.capaciteVolumeM3 ? `${vehicule.capaciteVolumeM3} m³` : '-'} />
            <InfoLigne label="Kilométrage" valeur={vehicule.kilometrage ? `${new Intl.NumberFormat('fr-FR').format(vehicule.kilometrage)} km` : '-'} />
            <div className="pt-2 border-t border-gray-100 dark:border-surface-700">
              <InfoLigne label="Assurance" valeur={vehicule.compagnieAssurance || '-'} />
              <InfoLigne label="N° police" valeur={vehicule.numeroAssurance || '-'} />
              <InfoLigne label="Expiration assurance" valeur={fmtDate(vehicule.dateExpirationAssurance)} alerte={dateProche(vehicule.dateExpirationAssurance)} />
              <InfoLigne label="Expiration visite technique" valeur={fmtDate(vehicule.dateExpirationVisiteTechnique)} alerte={dateProche(vehicule.dateExpirationVisiteTechnique)} />
            </div>
            {vehicule.observations && (
              <div className="pt-2 border-t border-gray-100 dark:border-surface-700">
                <p className="text-xs text-gray-500 mb-1">Observations</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{vehicule.observations}</p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 dark:border-surface-700">
              <label className="label">Changer le statut</label>
              <select value={vehicule.statut} disabled={busy} onChange={e => changerStatut(e.target.value)} className="input-field !py-1.5 !text-sm">
                {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
              </select>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="card !p-4">
              <p className="text-xs text-gray-500 mb-1">Courses effectuées</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{vehicule._count?.courses ?? vehicule.courses?.length ?? 0}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 mb-1">Interventions maintenance</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{vehicule._count?.maintenances ?? vehicule.maintenances?.length ?? 0}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 mb-1">Frais de maintenance (récents)</p>
              <p className="text-lg font-bold text-amber-600">{fmtMontant(totalFraisMaintenance)}</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-gray-500 mb-1">Frais de route (récents)</p>
              <p className="text-lg font-bold text-amber-600">{fmtMontant(totalFraisCourses)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Historique des courses ({vehicule.courses?.length || 0} récentes)</h3>
          {!vehicule.courses?.length ? (
            <p className="text-sm text-gray-500">Aucune course</p>
          ) : (
            <div className="table-container !shadow-none !border-0">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">N°</th>
                  <th className="table-header">Chauffeur</th>
                  <th className="table-header">Trajet</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Statut</th>
                </tr></thead>
                <tbody>
                  {vehicule.courses.map((c: any) => (
                    <tr key={c.id} className="table-row">
                      <td className="table-cell font-mono text-xs text-primary-600" data-label="N°">{c.numero}</td>
                      <td className="table-cell text-xs" data-label="Chauffeur">{c.chauffeur?.prenom} {c.chauffeur?.nom}</td>
                      <td className="table-cell text-xs" data-label="Trajet">{c.origine} → {c.destination}</td>
                      <td className="table-cell text-xs" data-label="Date">{fmtDate(c.dateDepartPrevue)}</td>
                      <td className="table-cell" data-label="Statut"><span className={`badge ${COURSE_STATUT_BADGE[c.statut]} !text-[10px]`}>{COURSE_STATUT_LABEL[c.statut]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Historique de maintenance ({vehicule.maintenances?.length || 0} récentes)</h3>
          {!vehicule.maintenances?.length ? (
            <p className="text-sm text-gray-500">Aucune maintenance enregistrée</p>
          ) : (
            <div className="table-container !shadow-none !border-0">
              <table className="w-full">
                <thead><tr>
                  <th className="table-header">Type</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Coût</th>
                  <th className="table-header">Prestataire</th>
                  <th className="table-header">Description</th>
                </tr></thead>
                <tbody>
                  {vehicule.maintenances.map((m: any) => (
                    <tr key={m.id} className="table-row">
                      <td className="table-cell" data-label="Type"><span className="badge badge-info !text-[10px]">{MAINTENANCE_TYPE_LABEL[m.type]}</span></td>
                      <td className="table-cell text-xs" data-label="Date">{fmtDate(m.date)}</td>
                      <td className="table-cell text-xs font-mono" data-label="Coût">{fmtMontant(m.cout)}</td>
                      <td className="table-cell text-xs" data-label="Prestataire">{m.prestataire || '-'}</td>
                      <td className="table-cell text-xs" data-label="Description">{m.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function InfoLigne({ label, valeur, alerte }: { label: string; valeur?: string; alerte?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-right ${alerte ? 'text-red-600 font-semibold' : 'text-gray-900 dark:text-white'}`}>{valeur || '-'}</span>
    </div>
  );
}
