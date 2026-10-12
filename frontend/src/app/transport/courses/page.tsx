'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { coursesApi, vehiculesApi, chauffeursApi, clientsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUT_LABEL: Record<string, string> = { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' };
const STATUT_BADGE: Record<string, string> = { PLANIFIEE: 'badge-info', EN_COURS: 'badge-warning', TERMINEE: 'badge-success', ANNULEE: 'badge-danger' };
const STATUTS = Object.keys(STATUT_LABEL);

const FORM_VIDE = {
  vehiculeId: '', chauffeurId: '', clientId: '', montantFacturable: '', origine: '', destination: '', designationMarchandise: '',
  poidsChargeKg: '', distanceKm: '', dateDepartPrevue: '', dateArriveePrevue: '', observations: '',
};

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const fmtMontant = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';

export default function CoursesPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statutFiltre, setStatutFiltre] = useState('');
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [facturation, setFacturation] = useState<{ id: string; clientId: string; montantFacturable: string; fraisCarburant: string; fraisPeage: string; autresFrais: string } | null>(null);
  const [facturantSelection, setFacturantSelection] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await coursesApi.list({ page, limit: 20, statut: statutFiltre || undefined });
      setData(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setSelection([]);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, statutFiltre]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { clientsApi.list({ limit: 500 }).then(r => setClients(r.data.data || [])).catch(() => {}); }, []);

  const ouvrirCreation = async () => {
    setForm(FORM_VIDE);
    try {
      const [v, c] = await Promise.all([vehiculesApi.list({ actif: 'true' }), chauffeursApi.list({ actif: 'true' })]);
      setVehicules(v.data.data || []);
      setChauffeurs(c.data.data || []);
      setShowModal(true);
    } catch { toast.error('Erreur de chargement des véhicules/chauffeurs'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await coursesApi.create(form);
      toast.success('Course créée');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const changerStatut = async (id: string, statut: string) => {
    setBusyId(id);
    try { await coursesApi.changerStatut(id, statut); toast.success('Statut mis à jour'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusyId(null); }
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cette course ?')) return;
    try { await coursesApi.delete(id); toast.success('Course supprimée'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const enregistrerFacturation = async () => {
    if (!facturation) return;
    try {
      await coursesApi.update(facturation.id, {
        clientId: facturation.clientId || null,
        montantFacturable: facturation.montantFacturable || null,
        fraisCarburant: facturation.fraisCarburant || null,
        fraisPeage: facturation.fraisPeage || null,
        autresFrais: facturation.autresFrais || null,
      });
      toast.success('Informations enregistrées');
      setFacturation(null);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const depensesCourse = (c: any) => Number(c.fraisCarburant || 0) + Number(c.fraisPeage || 0) + Number(c.autresFrais || 0);
  const resultatCourse = (c: any) => c.montantFacturable != null ? Number(c.montantFacturable) - depensesCourse(c) : null;

  const facturable = (c: any) => c.statut === 'TERMINEE' && !c.factureId && c.clientId && c.montantFacturable != null && Number(c.montantFacturable) > 0;

  const toggleSelection = (id: string) => setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const clientsSelection = new Set(data.filter(c => selection.includes(c.id)).map(c => c.clientId));
  const selectionValide = selection.length > 0 && clientsSelection.size === 1;

  const facturerSelection = async () => {
    if (!selectionValide) { toast.error('Sélectionnez des courses du même client'); return; }
    setFacturantSelection(true);
    try {
      const r = await coursesApi.facturer(selection);
      toast.success(r.data.message);
      setSelection([]);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setFacturantSelection(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
            <p className="text-sm text-gray-500">{total} course(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={statutFiltre} onChange={e => { setPage(1); setStatutFiltre(e.target.value); }} className="input-field !w-48 text-sm">
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
            </select>
            {selection.length > 0 && (
              <button onClick={facturerSelection} disabled={!selectionValide || facturantSelection} title={!selectionValide ? 'Les courses sélectionnées doivent être du même client' : undefined} className="btn-secondary !text-sm !text-accent-600 disabled:opacity-50">
                {facturantSelection ? 'Facturation...' : `Facturer la sélection (${selection.length})`}
              </button>
            )}
            <button onClick={ouvrirCreation} className="btn-primary text-sm">+ Nouvelle course</button>
          </div>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header w-8"></th>
              <th className="table-header">N°</th>
              <th className="table-header">Véhicule</th>
              <th className="table-header">Chauffeur</th>
              <th className="table-header">Trajet</th>
              <th className="table-header">Client</th>
              <th className="table-header text-right">Montant</th>
              <th className="table-header">Statut</th>
              <th className="table-header text-right">Résultat</th>
              <th className="table-header">Facturation</th>
              <th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-500">Aucune course</td></tr>
              ) : data.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell">
                    {facturable(c) && <input type="checkbox" checked={selection.includes(c.id)} onChange={() => toggleSelection(c.id)} className="w-4 h-4 rounded" />}
                  </td>
                  <td className="table-cell font-mono text-xs text-primary-600" data-label="N°">{c.numero}</td>
                  <td className="table-cell text-xs" data-label="Véhicule">{c.vehicule?.immatriculation}</td>
                  <td className="table-cell text-xs" data-label="Chauffeur">{c.chauffeur?.prenom} {c.chauffeur?.nom}</td>
                  <td className="table-cell text-xs" data-label="Trajet">{c.origine} → {c.destination}</td>
                  <td className="table-cell text-xs" data-label="Client">{c.client?.raisonSociale || '-'}</td>
                  <td className="table-cell text-right text-xs font-mono" data-label="Montant">{fmtMontant(c.montantFacturable)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[c.statut]} !text-[10px]`}>{STATUT_LABEL[c.statut]}</span></td>
                  <td className="table-cell text-right text-xs font-mono" data-label="Résultat">
                    {resultatCourse(c) != null ? <span className={resultatCourse(c)! >= 0 ? 'text-accent-600' : 'text-red-600'}>{fmtMontant(resultatCourse(c))}</span> : '-'}
                  </td>
                  <td className="table-cell" data-label="Facturation">
                    {c.facture ? (
                      <Link href={`/facturation/${c.facture.id}`} className="text-xs text-primary-600 hover:underline font-mono">{c.facture.numero}</Link>
                    ) : c.statut === 'TERMINEE' ? (
                      <button onClick={() => setFacturation({ id: c.id, clientId: c.clientId || '', montantFacturable: c.montantFacturable || '', fraisCarburant: c.fraisCarburant || '', fraisPeage: c.fraisPeage || '', autresFrais: c.autresFrais || '' })} className="text-xs text-amber-600 hover:underline">
                        {c.clientId && c.montantFacturable ? 'Modifier' : 'À renseigner'}
                      </button>
                    ) : <span className="text-xs text-gray-400">-</span>}
                  </td>
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.statut === 'PLANIFIEE' && <button onClick={() => changerStatut(c.id, 'EN_COURS')} disabled={busyId === c.id} className="text-xs text-primary-600 hover:underline disabled:opacity-50">Démarrer</button>}
                      {c.statut === 'EN_COURS' && <button onClick={() => changerStatut(c.id, 'TERMINEE')} disabled={busyId === c.id} className="text-xs text-accent-600 hover:underline disabled:opacity-50">Terminer</button>}
                      {(c.statut === 'PLANIFIEE' || c.statut === 'EN_COURS') && <button onClick={() => changerStatut(c.id, 'ANNULEE')} disabled={busyId === c.id} className="text-xs text-red-600 hover:underline disabled:opacity-50">Annuler</button>}
                      {c.statut === 'PLANIFIEE' && <button onClick={() => supprimer(c.id)} className="text-xs text-gray-500 hover:underline">Supprimer</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Précédent</button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Suivant</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Nouvelle course</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Véhicule *</label>
                  <select value={form.vehiculeId} onChange={e => setForm({ ...form, vehiculeId: e.target.value })} className="input-field" required>
                    <option value="">Sélectionner...</option>
                    {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque ? `(${v.marque})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Chauffeur *</label>
                  <select value={form.chauffeurId} onChange={e => setForm({ ...form, chauffeurId: e.target.value })} className="input-field" required>
                    <option value="">Sélectionner...</option>
                    {chauffeurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Origine *</label><input type="text" value={form.origine} onChange={e => setForm({ ...form, origine: e.target.value })} className="input-field" required /></div>
                <div><label className="label">Destination *</label><input type="text" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Client à facturer</label>
                  <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="input-field">
                    <option value="">— Aucun pour l&apos;instant —</option>
                    {clients.map((cl: any) => <option key={cl.id} value={cl.id}>{cl.raisonSociale}</option>)}
                  </select>
                </div>
                <div><label className="label">Montant facturable (FCFA)</label><input type="number" value={form.montantFacturable} onChange={e => setForm({ ...form, montantFacturable: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Marchandise</label><input type="text" value={form.designationMarchandise} onChange={e => setForm({ ...form, designationMarchandise: e.target.value })} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Poids (kg)</label><input type="number" value={form.poidsChargeKg} onChange={e => setForm({ ...form, poidsChargeKg: e.target.value })} className="input-field" /></div>
                <div><label className="label">Distance (km)</label><input type="number" value={form.distanceKm} onChange={e => setForm({ ...form, distanceKm: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Départ prévu</label><input type="datetime-local" value={form.dateDepartPrevue} onChange={e => setForm({ ...form, dateDepartPrevue: e.target.value })} className="input-field" /></div>
                <div><label className="label">Arrivée prévue</label><input type="datetime-local" value={form.dateArriveePrevue} onChange={e => setForm({ ...form, dateArriveePrevue: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="label">Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input-field" rows={2} /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {facturation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Facturation & dépenses</h2>
              <button onClick={() => setFacturation(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Client à facturer</label>
                <select value={facturation.clientId} onChange={e => setFacturation({ ...facturation, clientId: e.target.value })} className="input-field">
                  <option value="">— Sélectionner —</option>
                  {clients.map((cl: any) => <option key={cl.id} value={cl.id}>{cl.raisonSociale}</option>)}
                </select>
              </div>
              <div><label className="label">Montant facturable (FCFA)</label><input type="number" value={facturation.montantFacturable} onChange={e => setFacturation({ ...facturation, montantFacturable: e.target.value })} className="input-field" /></div>
              <p className="text-xs font-semibold text-gray-500 uppercase pt-1">Dépenses du voyage</p>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label !text-xs">Carburant</label><input type="number" value={facturation.fraisCarburant} onChange={e => setFacturation({ ...facturation, fraisCarburant: e.target.value })} className="input-field !text-sm" /></div>
                <div><label className="label !text-xs">Péage</label><input type="number" value={facturation.fraisPeage} onChange={e => setFacturation({ ...facturation, fraisPeage: e.target.value })} className="input-field !text-sm" /></div>
                <div><label className="label !text-xs">Autres</label><input type="number" value={facturation.autresFrais} onChange={e => setFacturation({ ...facturation, autresFrais: e.target.value })} className="input-field !text-sm" /></div>
              </div>
              <p className="text-right text-sm font-semibold">
                Résultat du voyage : <span className={(Number(facturation.montantFacturable || 0) - Number(facturation.fraisCarburant || 0) - Number(facturation.fraisPeage || 0) - Number(facturation.autresFrais || 0)) >= 0 ? 'text-accent-600' : 'text-red-600'}>
                  {fmtMontant(Number(facturation.montantFacturable || 0) - Number(facturation.fraisCarburant || 0) - Number(facturation.fraisPeage || 0) - Number(facturation.autresFrais || 0))}
                </span>
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFacturation(null)} className="btn-secondary">Annuler</button>
                <button type="button" onClick={enregistrerFacturation} className="btn-primary">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
