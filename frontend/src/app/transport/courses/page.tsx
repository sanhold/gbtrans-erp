'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeValider, IconeEnvoyer, IconeSupprimer } from '@/components/tables/BoutonIcone';
import { Numero, Discret, Tronque, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import { coursesApi, vehiculesApi, chauffeursApi, clientsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUT_LABEL: Record<string, string> = { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' };
const STATUT_BADGE: Record<string, string> = { PLANIFIEE: 'badge-info', EN_COURS: 'badge-warning', TERMINEE: 'badge-success', ANNULEE: 'badge-danger' };
const STATUTS = Object.keys(STATUT_LABEL);

const FORM_VIDE = {
  vehiculeId: '', chauffeurId: '', clientId: '', montantFacturable: '', origine: '', destination: '', designationMarchandise: '',
  poidsChargeKg: '', distanceKm: '', dateDepartPrevue: '', dateArriveePrevue: '', observations: '',
};

const fmtMontant = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';

export default function CoursesPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
      const res = await coursesApi.list({ page, limit: pageSize, statut: statutFiltre || undefined });
      setData(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setSelection([]);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, pageSize, statutFiltre]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { clientsApi.listRef().then(r => setClients(r.data.data || [])).catch(() => {}); }, []);

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

  const trajet = (c: any) => `${c.origine} → ${c.destination}`;
  const chauffeur = (c: any) => [c.chauffeur?.prenom, c.chauffeur?.nom].filter(Boolean).join(' ') || '—';
  const ouvrirFacturation = (c: any) => setFacturation({ id: c.id, clientId: c.clientId || '', montantFacturable: c.montantFacturable || '', fraisCarburant: c.fraisCarburant || '', fraisPeage: c.fraisPeage || '', autresFrais: c.autresFrais || '' });
  const pastille = (c: any) => <StatutPastille libelle={STATUT_LABEL[c.statut] || c.statut} ton={tonDepuisBadge(STATUT_BADGE[c.statut])} />;
  const cellFacturation = (c: any) => c.facture ? (
    <Link href={`/facturation/${c.facture.id}`} onClick={e => e.stopPropagation()} className="font-mono text-[12.5px] font-semibold text-azure hover:underline">{c.facture.numero}</Link>
  ) : c.statut === 'TERMINEE' ? (
    <button type="button" onClick={e => { e.stopPropagation(); ouvrirFacturation(c); }} className="text-[12.5px] font-semibold text-orange-600 hover:underline">{c.clientId && c.montantFacturable ? 'Modifier' : 'À renseigner'}</button>
  ) : <Discret>—</Discret>;
  const resultat = (c: any) => { const r = resultatCourse(c); return r == null ? <Discret>—</Discret> : <Montant valeur={r} ton={r >= 0 ? 'positif' : 'negatif'} />; };

  const colonnes = [
    { cle: 'sel', libelle: '', texte: () => '', rendu: (c: any) => facturable(c) ? <input type="checkbox" aria-label="Sélectionner" checked={selection.includes(c.id)} onClick={e => e.stopPropagation()} onChange={() => toggleSelection(c.id)} className="h-4 w-4 rounded accent-blue-600" /> : null },
    { cle: 'numero', libelle: 'N°', texte: (c: any) => c.numero, rendu: (c: any) => <Numero>{c.numero}</Numero> },
    { cle: 'trajet', libelle: 'Trajet', texte: trajet, rendu: (c: any) => <Tronque texte={trajet(c)} largeur="16rem" /> },
    { cle: 'vehicule', libelle: 'Véhicule', texte: (c: any) => c.vehicule?.immatriculation || '', rendu: (c: any) => <Discret>{c.vehicule?.immatriculation || '—'}</Discret> },
    { cle: 'chauffeur', libelle: 'Chauffeur', masquerSous: '2xl' as const, texte: chauffeur, rendu: (c: any) => <Tronque texte={chauffeur(c)} largeur="11rem" /> },
    { cle: 'client', libelle: 'Client', masquerSous: '2xl' as const, texte: (c: any) => c.client?.raisonSociale || '', rendu: (c: any) => <Tronque texte={c.client?.raisonSociale} largeur="12rem" /> },
    { cle: 'montant', libelle: 'Montant', align: 'right' as const, texte: (c: any) => String(c.montantFacturable ?? ''), rendu: (c: any) => c.montantFacturable != null ? <Montant valeur={c.montantFacturable} /> : <Discret>—</Discret> },
    { cle: 'resultat', libelle: 'Résultat', align: 'right' as const, masquerSous: '2xl' as const, texte: (c: any) => String(resultatCourse(c) ?? ''), rendu: resultat },
    { cle: 'statut', libelle: 'Statut', texte: (c: any) => STATUT_LABEL[c.statut] || c.statut, rendu: pastille },
    { cle: 'facturation', libelle: 'Facturation', texte: (c: any) => c.facture?.numero || '', rendu: cellFacturation },
  ];

  const actionsCourse = (c: any) => (
    <>
      {c.statut === 'PLANIFIEE' && <BoutonIcone titre="Démarrer" ton="primaire" disabled={busyId === c.id} onClick={() => changerStatut(c.id, 'EN_COURS')}><IconeEnvoyer /></BoutonIcone>}
      {c.statut === 'EN_COURS' && <BoutonIcone titre="Terminer" ton="primaire" disabled={busyId === c.id} onClick={() => changerStatut(c.id, 'TERMINEE')}><IconeValider /></BoutonIcone>}
      {(c.statut === 'PLANIFIEE' || c.statut === 'EN_COURS') && <BoutonIcone titre="Annuler la course" ton="neutre" disabled={busyId === c.id} onClick={() => changerStatut(c.id, 'ANNULEE')}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></BoutonIcone>}
      {c.statut === 'PLANIFIEE' && <BoutonIcone titre="Supprimer" ton="danger" onClick={() => supprimer(c.id)}><IconeSupprimer /></BoutonIcone>}
    </>
  );

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Courses"
          sousTitre={`${total} course(s)`}
          actions={
            <>
              <select value={statutFiltre} onChange={e => { setPage(1); setStatutFiltre(e.target.value); }} aria-label="Filtrer par statut" className="input-field !w-auto !py-1.5 text-sm">
                <option value="">Tous les statuts</option>
                {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
              </select>
              {selection.length > 0 && (
                <button onClick={facturerSelection} disabled={!selectionValide || facturantSelection} title={!selectionValide ? 'Les courses sélectionnées doivent être du même client' : undefined} className="btn-secondary disabled:opacity-50">
                  {facturantSelection ? 'Facturation...' : `Facturer la sélection (${selection.length})`}
                </button>
              )}
              <button onClick={ouvrirCreation} className="btn-primary">+ Nouvelle course</button>
            </>
          }
        />

        <ListeResponsive
          colonnes={colonnes}
          lignes={data}
          cleLigne={(c: any) => c.id}
          chargement={loading}
          nomExport="courses"
          actions={actionsCourse}
          carte={(c: any) => ({
            titre: <span className="inline-flex items-center gap-2">{facturable(c) && <input type="checkbox" aria-label="Sélectionner" checked={selection.includes(c.id)} onClick={e => e.stopPropagation()} onChange={() => toggleSelection(c.id)} className="h-4 w-4 rounded accent-blue-600" />}{trajet(c)}</span>,
            sousTitre: `${c.numero} — ${c.vehicule?.immatriculation || ''} — ${chauffeur(c)}`,
            statut: pastille(c),
            details: <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">{c.client?.raisonSociale || 'Sans client'}{c.montantFacturable != null && <b className="text-gray-700">{fmtMontant(c.montantFacturable)}</b>}{(c.facture || c.statut === 'TERMINEE') && cellFacturation(c)}</span>,
          })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: (n: number) => { setPageSize(n); setPage(1); } }}
          vide={<EmptyState titre="Aucune course" description="Créez une première course." />}
        />
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
