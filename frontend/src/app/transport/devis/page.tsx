'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { devisTransportApi, clientsApi, vehiculesApi, chauffeursApi } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import Sheet from '@/components/ui/Sheet';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyRow from '@/components/tables/EmptyRow';
import DevisFormSheet, { LIGNE_VIDE, fmtFcfa as fmt } from '@/components/transport/DevisFormSheet';
import DevisDetailSheet, { DEVIS_STATUT_LABEL as STATUT_LABEL, DEVIS_STATUT_BADGE as STATUT_BADGE } from '@/components/transport/DevisDetailSheet';

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function DevisTransportPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
  const confirmer = useConfirm();

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
      const res = await devisTransportApi.list({ page, limit: 20, statut: statutFiltre || undefined });
      setData(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, statutFiltre]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!(await confirmer({ titre: 'Refuser ce devis ?', danger: true, confirmer: 'Refuser' }))) return;
    setBusy(true);
    try { await devisTransportApi.refuser(detail.id); toast.success('Devis refusé'); await rafraichirDetail(detail.id); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const supprimer = async () => {
    if (!(await confirmer({ titre: 'Supprimer ce devis ?', message: 'Cette action est irréversible.', danger: true, confirmer: 'Supprimer' }))) return;
    try { await devisTransportApi.delete(detail.id); toast.success('Devis supprimé'); setDetail(null); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <PageHeader
          title="Devis Transport"
          subtitle={`${total} devis — programmation de voyages avant exécution`}
          actions={<button type="button" onClick={ouvrirCreation} className="btn-primary hidden lg:inline-flex">+ Nouveau devis</button>}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select value={statutFiltre} onChange={e => { setPage(1); setStatutFiltre(e.target.value); }} aria-label="Filtrer par statut" className="input-field flex-1 min-w-[160px] sm:flex-none sm:!w-48">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Actions</th>
              <th className="table-header">N°</th>
              <th className="table-header">Client</th>
              <th className="table-header">Objet</th>
              <th className="table-header text-right">Montant estimé</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Date</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} />
              ) : data.length === 0 ? (
                <EmptyRow colSpan={7} message="Aucun devis" ctaLabel="Créer un devis" onCta={ouvrirCreation} />
              ) : data.map(d => (
                <tr key={d.id} className="table-row cursor-pointer" onClick={() => ouvrirDetail(d.id)}>
                  <td className="table-cell" data-label="Actions">
                    <button type="button" onClick={(e) => { e.stopPropagation(); ouvrirDetail(d.id); }} className="text-sm font-medium text-primary-600 hover:underline px-2 py-1.5">Ouvrir</button>
                  </td>
                  <td className="table-cell" data-label="N°"><span className="font-mono text-xs text-primary-600">{d.numero}</span></td>
                  <td className="table-cell text-xs" data-label="Client">{d.client?.raisonSociale}</td>
                  <td className="table-cell text-xs col-opt" data-label="Objet">{d.objet || '-'}</td>
                  <td className="table-cell text-right text-xs font-mono" data-label="Montant estimé">{fmt(d.montantTotal)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_BADGE[d.statut]} !text-[10px]`}>{STATUT_LABEL[d.statut]}</span></td>
                  <td className="table-cell text-xs text-gray-600 dark:text-gray-400" data-label="Date">{new Date(d.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary disabled:opacity-40">Précédent</button>
            <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary disabled:opacity-40">Suivant</button>
          </div>
        )}
      </div>

      <FAB label="Nouveau devis" onClick={ouvrirCreation} />

      <DevisFormSheet
        open={showModal} onClose={() => setShowModal(false)} onSubmit={handleSubmit} saving={saving} clients={clients}
        clientId={clientId} setClientId={setClientId} objet={objet} setObjet={setObjet} dateValidite={dateValidite} setDateValidite={setDateValidite}
        lignes={lignes} majLigne={majLigne} ajouterLigne={ajouterLigne} retirerLigne={retirerLigne} montantTotal={montantTotal}
      />

      <DevisDetailSheet
        detail={detail} loading={detailLoading} busy={busy} onClose={() => setDetail(null)}
        onEnvoyer={envoyer} onAccepter={ouvrirValidation} onRefuser={refuser} onSupprimer={supprimer}
      />

      <Sheet open={showValider} onClose={() => setShowValider(false)} size="md" title="Accepter le devis" zIndexClass="z-[70]">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Affectez un véhicule et un chauffeur pour générer directement les courses, ou laissez vide pour les affecter plus tard sur chaque course.</p>
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
          <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700">
            <button type="button" onClick={() => setShowValider(false)} className="btn-secondary">Annuler</button>
            <button type="button" onClick={() => valider(!!(vehiculeId && chauffeurId))} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Validation...' : 'Confirmer'}</button>
          </div>
        </div>
      </Sheet>
    </AppLayout>
  );
}
