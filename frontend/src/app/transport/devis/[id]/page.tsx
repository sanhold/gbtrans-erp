'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { devisTransportApi, vehiculesApi, chauffeursApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUT_LABEL: Record<string, string> = { BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', ACCEPTE: 'Accepté', REFUSE: 'Refusé' };
const STATUT_BADGE: Record<string, string> = { BROUILLON: 'badge-info', ENVOYE: 'badge-warning', ACCEPTE: 'badge-success', REFUSE: 'badge-danger' };
const fmt = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function DevisTransportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [devis, setDevis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showValider, setShowValider] = useState(false);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [vehiculeId, setVehiculeId] = useState('');
  const [chauffeurId, setChauffeurId] = useState('');

  const load = () => {
    setLoading(true);
    devisTransportApi.get(id).then(r => setDevis(r.data.data)).catch(() => toast.error('Devis introuvable')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const envoyer = async () => {
    setBusy(true);
    try { await devisTransportApi.envoyer(id); toast.success('Devis marqué comme envoyé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const ouvrirValidation = async () => {
    try {
      const [v, c] = await Promise.all([vehiculesApi.list({ actif: 'true' }), chauffeursApi.list({ actif: 'true' })]);
      setVehicules(v.data.data || []);
      setChauffeurs(c.data.data || []);
      setVehiculeId(''); setChauffeurId('');
      setShowValider(true);
    } catch { toast.error('Erreur de chargement des véhicules/chauffeurs'); }
  };

  const valider = async (avecAffectation: boolean) => {
    setBusy(true);
    try {
      const r = await devisTransportApi.valider(id, avecAffectation ? { vehiculeId, chauffeurId } : {});
      toast.success(r.data.message);
      setShowValider(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const refuser = async () => {
    if (!confirm('Refuser ce devis ?')) return;
    setBusy(true);
    try { await devisTransportApi.refuser(id); toast.success('Devis refusé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const supprimer = async () => {
    if (!confirm('Supprimer ce devis ?')) return;
    try { await devisTransportApi.delete(id); toast.success('Devis supprimé'); router.push('/transport/devis'); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div></AppLayout>;
  if (!devis) return <AppLayout><p className="text-gray-500">Devis introuvable</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link href="/transport/devis" className="text-sm text-primary-600 hover:underline">← Retour aux devis</Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{devis.numero}</h1>
            <p className="text-sm text-gray-500">{devis.client?.raisonSociale} — {devis.objet || 'Devis transport'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${STATUT_BADGE[devis.statut]}`}>{STATUT_LABEL[devis.statut]}</span>
            {devis.statut === 'BROUILLON' && <button onClick={envoyer} disabled={busy} className="btn-secondary text-sm disabled:opacity-50">Marquer envoyé</button>}
            {(devis.statut === 'BROUILLON' || devis.statut === 'ENVOYE') && <button onClick={ouvrirValidation} disabled={busy} className="btn-primary text-sm disabled:opacity-50">Accepter le devis</button>}
            {(devis.statut === 'BROUILLON' || devis.statut === 'ENVOYE') && <button onClick={refuser} disabled={busy} className="text-sm text-red-600 hover:underline">Refuser</button>}
            {devis.statut === 'BROUILLON' && <button onClick={supprimer} className="text-sm text-gray-500 hover:underline">Supprimer</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card !py-3"><p className="text-xs text-gray-500">Montant total estimé</p><p className="text-xl font-bold text-primary-600">{fmt(devis.montantTotal)}</p></div>
          <div className="card !py-3"><p className="text-xs text-gray-500">Validité</p><p className="text-xl font-bold">{fmtDate(devis.dateValidite)}</p></div>
          <div className="card !py-3"><p className="text-xs text-gray-500">Créé par</p><p className="text-xl font-bold">{devis.createur?.prenom} {devis.createur?.nom}</p></div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Voyages prévus</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500">
                <th className="py-1">Trajet</th><th>Marchandise</th><th>Départ prévu</th><th className="text-right">Montant estimé</th><th>Course générée</th>
              </tr></thead>
              <tbody>
                {devis.lignes.map((l: any) => (
                  <tr key={l.id} className="border-t border-gray-100 dark:border-surface-700">
                    <td className="py-2">{l.origine} → {l.destination}</td>
                    <td>{l.designationMarchandise || '-'}</td>
                    <td>{fmtDate(l.dateDepartPrevue)}</td>
                    <td className="text-right font-mono">{fmt(l.montantEstime)}</td>
                    <td>{l.course ? <Link href="/transport/courses" className="text-primary-600 hover:underline font-mono text-xs">{l.course.numero}</Link> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showValider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Accepter le devis</h2>
              <button onClick={() => setShowValider(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">Affectez un véhicule et un chauffeur pour générer directement les courses, ou laissez vide pour les affecter plus tard sur chaque course.</p>
              <div>
                <label className="label">Véhicule</label>
                <select value={vehiculeId} onChange={e => setVehiculeId(e.target.value)} className="input-field">
                  <option value="">— À affecter plus tard —</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque ? `(${v.marque})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Chauffeur</label>
                <select value={chauffeurId} onChange={e => setChauffeurId(e.target.value)} className="input-field">
                  <option value="">— À affecter plus tard —</option>
                  {chauffeurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowValider(false)} className="btn-secondary">Annuler</button>
                <button type="button" onClick={() => valider(!!(vehiculeId && chauffeurId))} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Validation...' : 'Confirmer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
