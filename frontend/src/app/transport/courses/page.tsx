'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { coursesApi, vehiculesApi, chauffeursApi, clientsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyRow from '@/components/tables/EmptyRow';
import CourseCard, { STATUT_LABEL, STATUT_BADGE, fmtMontant } from '@/components/transport/CourseCard';
import CourseFormSheet, { COURSE_FORM_VIDE as FORM_VIDE } from '@/components/transport/CourseFormSheet';
import FacturationCourseSheet, { type FacturationState } from '@/components/transport/FacturationCourseSheet';

const STATUTS = Object.keys(STATUT_LABEL);

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

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
  const confirmer = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [facturation, setFacturation] = useState<FacturationState | null>(null);
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
    if (!(await confirmer({ titre: 'Supprimer cette course ?', message: 'Cette action est irréversible.', danger: true, confirmer: 'Supprimer' }))) return;
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

  const ouvrirFacturation = (c: any) => setFacturation({ id: c.id, clientId: c.clientId || '', montantFacturable: c.montantFacturable || '', fraisCarburant: c.fraisCarburant || '', fraisPeage: c.fraisPeage || '', autresFrais: c.autresFrais || '' });

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
        <PageHeader
          title="Courses"
          subtitle={`${total} course(s)`}
          actions={<button type="button" onClick={ouvrirCreation} className="btn-primary hidden lg:inline-flex">+ Nouvelle course</button>}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select value={statutFiltre} onChange={e => { setPage(1); setStatutFiltre(e.target.value); }} aria-label="Filtrer par statut" className="input-field flex-1 min-w-[160px] sm:flex-none sm:!w-48">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
          </select>
          {selection.length > 0 && (
            <button type="button" onClick={facturerSelection} disabled={!selectionValide || facturantSelection} title={!selectionValide ? 'Les courses sélectionnées doivent être du même client' : undefined} className="btn-secondary !text-accent-600 disabled:opacity-50">
              {facturantSelection ? 'Facturation...' : `Facturer la sélection (${selection.length})`}
            </button>
          )}
        </div>

        {/* Mobile : cartes terrain */}
        <div className="md:hidden space-y-3" aria-busy={loading}>
          {loading ? (
            <p className="text-center py-8 text-gray-600">Chargement...</p>
          ) : data.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <p>Aucune course</p>
              <button type="button" onClick={ouvrirCreation} className="btn-primary mt-3">Créer une course</button>
            </div>
          ) : data.map(c => (
            <CourseCard
              key={c.id} course={c} busy={busyId === c.id} facturable={facturable(c)} selected={selection.includes(c.id)} resultat={resultatCourse(c)}
              onToggleSelect={() => toggleSelection(c.id)} onStatut={(st) => changerStatut(c.id, st)} onSupprimer={() => supprimer(c.id)}
              onFacturation={() => ouvrirFacturation(c)}
            />
          ))}
        </div>

        <div className="table-container hidden md:block">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Actions</th>
              <th className="table-header w-8"><span className="sr-only">Sélection</span></th>
              <th className="table-header">N°</th>
              <th className="table-header">Véhicule</th>
              <th className="table-header">Chauffeur</th>
              <th className="table-header">Trajet</th>
              <th className="table-header">Client</th>
              <th className="table-header text-right">Montant</th>
              <th className="table-header">Statut</th>
              <th className="table-header text-right">Résultat</th>
              <th className="table-header">Facturation</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={11} />
              ) : data.length === 0 ? (
                <EmptyRow colSpan={11} message="Aucune course" ctaLabel="Créer une course" onCta={ouvrirCreation} />
              ) : data.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.statut === 'PLANIFIEE' && <button onClick={() => changerStatut(c.id, 'EN_COURS')} disabled={busyId === c.id} className="text-xs text-primary-600 hover:underline disabled:opacity-50">Démarrer</button>}
                      {c.statut === 'EN_COURS' && <button onClick={() => changerStatut(c.id, 'TERMINEE')} disabled={busyId === c.id} className="text-xs text-accent-600 hover:underline disabled:opacity-50">Terminer</button>}
                      {(c.statut === 'PLANIFIEE' || c.statut === 'EN_COURS') && <button onClick={() => changerStatut(c.id, 'ANNULEE')} disabled={busyId === c.id} className="text-xs text-red-600 hover:underline disabled:opacity-50">Annuler</button>}
                      {c.statut === 'PLANIFIEE' && <button onClick={() => supprimer(c.id)} className="text-xs text-gray-500 hover:underline">Supprimer</button>}
                    </div>
                  </td>
                  <td className="table-cell" data-label="Sélection">
                    {facturable(c) && <input type="checkbox" checked={selection.includes(c.id)} onChange={() => toggleSelection(c.id)} className="w-4 h-4 rounded" aria-label={`Sélectionner ${c.numero}`} />}
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
                      <button onClick={() => ouvrirFacturation(c)} className="text-xs text-amber-600 hover:underline">
                        {c.clientId && c.montantFacturable ? 'Modifier' : 'À renseigner'}
                      </button>
                    ) : <span className="text-xs text-gray-500">-</span>}
                  </td>
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

      <FAB label="Nouvelle course" onClick={ouvrirCreation} />

      <CourseFormSheet
        open={showModal} onClose={() => setShowModal(false)} form={form} setForm={setForm} onSubmit={handleSubmit} saving={saving}
        vehicules={vehicules} chauffeurs={chauffeurs} clients={clients}
      />
      <FacturationCourseSheet value={facturation} onChange={setFacturation} onClose={() => setFacturation(null)} onSave={enregistrerFacturation} clients={clients} />
    </AppLayout>
  );
}
