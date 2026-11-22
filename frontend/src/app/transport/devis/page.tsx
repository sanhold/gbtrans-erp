'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Numero, Discret, Tronque, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import { devisTransportApi, clientsApi, vehiculesApi, chauffeursApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUT_LABEL: Record<string, string> = { BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', ACCEPTE: 'Accepté', REFUSE: 'Refusé' };
const STATUT_BADGE: Record<string, string> = { BROUILLON: 'badge-info', ENVOYE: 'badge-warning', ACCEPTE: 'badge-success', REFUSE: 'badge-danger' };

const LIGNE_VIDE = { origine: '', destination: '', designationMarchandise: '', dateDepartPrevue: '', montantEstime: '' };
const fmt = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

function ModalFermer({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  );
}

export default function DevisTransportPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statutFiltre, setStatutFiltre] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [clientId, setClientId] = useState('');
  const [objet, setObjet] = useState('');
  const [dateValidite, setDateValidite] = useState('');
  const [lignes, setLignes] = useState<any[]>([{ ...LIGNE_VIDE }]);
  const [saving, setSaving] = useState(false);

  // Détail d'un devis (modale)
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showValider, setShowValider] = useState(false);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [vehiculeId, setVehiculeId] = useState('');
  const [chauffeurId, setChauffeurId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await devisTransportApi.list({ page, limit: pageSize, statut: statutFiltre || undefined });
      setData(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, pageSize, statutFiltre]); // eslint-disable-line react-hooks/exhaustive-deps

  const ouvrirCreation = async () => {
    setClientId(''); setObjet(''); setDateValidite(''); setLignes([{ ...LIGNE_VIDE }]);
    try { const r = await clientsApi.listRef(); setClients(r.data.data || []); setShowModal(true); }
    catch { toast.error('Erreur de chargement des clients'); }
  };

  const majLigne = (i: number, champ: string, valeur: string) => {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [champ]: valeur } : l));
  };
  const ajouterLigne = () => setLignes(prev => [...prev, { ...LIGNE_VIDE }]);
  const retirerLigne = (i: number) => setLignes(prev => prev.filter((_, idx) => idx !== i));

  const montantTotal = lignes.reduce((s, l) => s + (Number(l.montantEstime) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { toast.error('Sélectionnez un client'); return; }
    const lignesValides = lignes.filter(l => l.origine && l.destination && l.montantEstime);
    if (lignesValides.length === 0) { toast.error('Ajoutez au moins une ligne de voyage valide'); return; }
    setSaving(true);
    try {
      const r = await devisTransportApi.create({ clientId, objet, dateValidite, lignes: lignesValides });
      toast.success('Devis créé');
      setShowModal(false);
      load();
      setDetail(r.data.data);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const ouvrirDetail = (id: string) => {
    setDetailLoading(true);
    setDetail({ id });
    devisTransportApi.get(id).then(r => setDetail(r.data.data)).catch(() => toast.error('Devis introuvable')).finally(() => setDetailLoading(false));
  };

  const rafraichirDetail = async (id: string) => {
    const r = await devisTransportApi.get(id);
    setDetail(r.data.data);
  };

  const envoyer = async () => {
    setBusy(true);
    try { await devisTransportApi.envoyer(detail.id); toast.success('Devis marqué comme envoyé'); await rafraichirDetail(detail.id); load(); }
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
      const r = await devisTransportApi.valider(detail.id, avecAffectation ? { vehiculeId, chauffeurId } : {});
      toast.success(r.data.message);
      setShowValider(false);
      await rafraichirDetail(detail.id);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const refuser = async () => {
    if (!confirm('Refuser ce devis ?')) return;
    setBusy(true);
    try { await devisTransportApi.refuser(detail.id); toast.success('Devis refusé'); await rafraichirDetail(detail.id); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const supprimer = async () => {
    if (!confirm('Supprimer ce devis ?')) return;
    try { await devisTransportApi.delete(detail.id); toast.success('Devis supprimé'); setDetail(null); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const colonnes = [
    { cle: 'num', libelle: 'N°', texte: (d: any) => d.numero, rendu: (d: any) => <Numero>{d.numero}</Numero> },
    { cle: 'date', libelle: 'Date', texte: (d: any) => fmtDate(d.createdAt), rendu: (d: any) => <Discret>{fmtDate(d.createdAt)}</Discret> },
    { cle: 'client', libelle: 'Client', texte: (d: any) => d.client?.raisonSociale || '', rendu: (d: any) => <Tronque texte={d.client?.raisonSociale} largeur="16rem" /> },
    { cle: 'objet', libelle: 'Objet', masquerSous: 'xl' as const, texte: (d: any) => d.objet || '', rendu: (d: any) => <Tronque texte={d.objet || '—'} largeur="22rem" /> },
    { cle: 'montant', libelle: 'Montant estimé', align: 'right' as const, texte: (d: any) => String(d.montantTotal ?? ''), rendu: (d: any) => <Montant valeur={d.montantTotal} /> },
    { cle: 'statut', libelle: 'Statut', texte: (d: any) => STATUT_LABEL[d.statut] || d.statut, rendu: (d: any) => <StatutPastille libelle={STATUT_LABEL[d.statut] || d.statut} ton={tonDepuisBadge(STATUT_BADGE[d.statut])} /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader
          titre="Devis Transport"
          sousTitre={`${total} devis — programmation des voyages`}
          actions={
            <>
              <select value={statutFiltre} onChange={e => { setPage(1); setStatutFiltre(e.target.value); }} aria-label="Filtrer par statut" className="input-field !w-auto !py-1.5 text-sm">
                <option value="">Tous les statuts</option>
                {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={ouvrirCreation} className="btn-primary">+ Nouveau devis</button>
            </>
          }
        />

        <ListeResponsive
          colonnes={colonnes}
          lignes={data}
          cleLigne={(d: any) => d.id}
          chargement={loading}
          nomExport="devis-transport"
          onClic={(d: any) => ouvrirDetail(d.id)}
          carte={(d: any) => ({
            titre: d.client?.raisonSociale || d.numero,
            sousTitre: `${d.numero} — ${d.objet || 'Devis transport'}`,
            statut: <StatutPastille libelle={STATUT_LABEL[d.statut] || d.statut} ton={tonDepuisBadge(STATUT_BADGE[d.statut])} />,
            details: <span className="inline-flex items-center gap-3">{fmtDate(d.createdAt)}<b className="text-gray-700">{fmt(d.montantTotal)}</b></span>,
          })}
          pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: (n: number) => { setPageSize(n); setPage(1); } }}
          vide={<EmptyState titre="Aucun devis" description="Créez un premier devis de transport." />}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in sm:p-4">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-2xl sm:mx-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 sm:p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="font-display text-base sm:text-lg font-bold text-primary-600 dark:text-white">Nouveau devis transport</h2>
              <ModalFermer onClose={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Client *</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} className="input-field" required>
                    <option value="">Sélectionner...</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}
                  </select>
                </div>
                <div><label className="label">Date de validité</label><input type="date" value={dateValidite} onChange={e => setDateValidite(e.target.value)} className="input-field" /></div>
              </div>
              <div><label className="label">Objet</label><input type="text" value={objet} onChange={e => setObjet(e.target.value)} className="input-field" placeholder="Ex: Transport de marchandises Abidjan - Ouagadougou" /></div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label !mb-0">Voyages prévus *</label>
                  <button type="button" onClick={ajouterLigne} className="text-xs text-primary-600 hover:underline">+ Ajouter un voyage</button>
                </div>
                {lignes.map((l, i) => (
                  <div key={i} className="border border-gray-200 dark:border-surface-700 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={l.origine} onChange={e => majLigne(i, 'origine', e.target.value)} className="input-field !text-sm" placeholder="Origine *" />
                      <input type="text" value={l.destination} onChange={e => majLigne(i, 'destination', e.target.value)} className="input-field !text-sm" placeholder="Destination *" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input type="text" value={l.designationMarchandise} onChange={e => majLigne(i, 'designationMarchandise', e.target.value)} className="input-field !text-sm" placeholder="Marchandise" />
                      <input type="date" value={l.dateDepartPrevue} onChange={e => majLigne(i, 'dateDepartPrevue', e.target.value)} className="input-field !text-sm" />
                      <input type="number" value={l.montantEstime} onChange={e => majLigne(i, 'montantEstime', e.target.value)} className="input-field !text-sm" placeholder="Montant estimé *" />
                    </div>
                    {lignes.length > 1 && <button type="button" onClick={() => retirerLigne(i)} className="text-xs text-red-600 hover:underline">Retirer ce voyage</button>}
                  </div>
                ))}
                <p className="text-right text-sm font-semibold">Total estimé : {fmt(montantTotal)}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer le devis'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in sm:p-4">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-3xl sm:mx-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 sm:p-6 border-b border-gray-200 dark:border-surface-700">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-primary-600 dark:text-white">{detail.numero || 'Devis'}</h2>
                {detail.client && <p className="text-sm text-gray-500">{detail.client.raisonSociale} — {detail.objet || 'Devis transport'}</p>}
              </div>
              <ModalFermer onClose={() => setDetail(null)} />
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`badge ${STATUT_BADGE[detail.statut]}`}>{STATUT_LABEL[detail.statut]}</span>
                  <div className="flex items-center gap-2">
                    {detail.statut === 'BROUILLON' && <button onClick={envoyer} disabled={busy} className="btn-secondary text-sm disabled:opacity-50">Marquer envoyé</button>}
                    {(detail.statut === 'BROUILLON' || detail.statut === 'ENVOYE') && <button onClick={ouvrirValidation} disabled={busy} className="btn-primary text-sm disabled:opacity-50">Accepter le devis</button>}
                    {(detail.statut === 'BROUILLON' || detail.statut === 'ENVOYE') && <button onClick={refuser} disabled={busy} className="text-sm text-red-600 hover:underline">Refuser</button>}
                    {detail.statut === 'BROUILLON' && <button onClick={supprimer} className="text-sm text-gray-500 hover:underline">Supprimer</button>}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                  <div className="card !py-2.5 col-span-2 md:col-span-1"><p className="text-xs text-gray-500">Montant total estimé</p><p className="text-lg sm:text-xl font-bold text-primary-600">{fmt(detail.montantTotal)}</p></div>
                  <div className="card !py-2.5"><p className="text-xs text-gray-500">Validité</p><p className="text-base sm:text-xl font-bold">{fmtDate(detail.dateValidite)}</p></div>
                  <div className="card !py-2.5"><p className="text-xs text-gray-500">Créé par</p><p className="text-base sm:text-xl font-bold truncate">{detail.createur?.prenom} {detail.createur?.nom}</p></div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Voyages prévus</h3>
                  <ListeResponsive
                    colonnes={[
                      { cle: 't', libelle: 'Trajet', texte: (l: any) => `${l.origine} → ${l.destination}`, rendu: (l: any) => <Tronque texte={`${l.origine} → ${l.destination}`} largeur="14rem" /> },
                      { cle: 'm', libelle: 'Marchandise', texte: (l: any) => l.designationMarchandise || '', rendu: (l: any) => <Tronque texte={l.designationMarchandise || '—'} largeur="12rem" /> },
                      { cle: 'd', libelle: 'Départ prévu', texte: (l: any) => fmtDate(l.dateDepartPrevue), rendu: (l: any) => <Discret>{fmtDate(l.dateDepartPrevue)}</Discret> },
                      { cle: 'e', libelle: 'Estimé', align: 'right' as const, texte: (l: any) => String(l.montantEstime), rendu: (l: any) => <Montant valeur={l.montantEstime} /> },
                      { cle: 'c', libelle: 'Course', texte: (l: any) => l.course?.numero || '', rendu: (l: any) => l.course ? <Numero>{l.course.numero}</Numero> : <Discret>—</Discret> },
                    ]}
                    lignes={detail.lignes || []}
                    cleLigne={(l: any) => l.id}
                    carte={(l: any) => ({ titre: `${l.origine} → ${l.destination}`, sousTitre: `${l.designationMarchandise || 'Marchandise non précisée'} — ${fmtDate(l.dateDepartPrevue)}`, droite: <Montant valeur={l.montantEstime} />, details: l.course ? `Course ${l.course.numero}` : undefined })}
                    vide={<p className="py-3 text-center text-sm text-gray-500">Aucun voyage</p>}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showValider && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 animate-fade-in sm:p-4">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-xl shadow-elevated w-full max-w-md sm:mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-surface-700">
              <h2 className="font-display text-base sm:text-lg font-bold text-primary-600 dark:text-white">Accepter le devis</h2>
              <ModalFermer onClose={() => setShowValider(false)} />
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
