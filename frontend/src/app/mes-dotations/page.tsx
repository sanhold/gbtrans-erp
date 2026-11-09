'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import DotationTabs from '@/components/finance/DotationTabs';
import { dossiersApi, financeApi } from '@/lib/api';
import { fmt, CATEGORIES_DEPENSE } from '@/lib/financeHelpers';
import { lireFichierEnDataUrl, ouvrirPiece, PIECE_TYPES_ACCEPTES } from '@/lib/pieceJointe';

const STATUT_LABEL: Record<string, string> = { BROUILLON: 'Brouillon', EN_ATTENTE: 'Soumis — en attente', VALIDE: 'Validé', REJETE: 'Rejeté' };
const STATUT_BADGE: Record<string, string> = { BROUILLON: 'badge-gray', EN_ATTENTE: 'badge-warning', VALIDE: 'badge-success', REJETE: 'badge-danger' };
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
const aujourdhui = () => new Date().toISOString().slice(0, 10);

const formVide = () => ({ dossierId: '', categorie: CATEGORIES_DEPENSE[0], designation: '', montant: '', dateJustificatif: aujourdhui(), piece: '' as string, nomPiece: '' });

export default function MesDotationsPage() {
  const [dotations, setDotations] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dotationCible, setDotationCible] = useState<any | null>(null);
  const [form, setForm] = useState(formVide());
  const [saving, setSaving] = useState(false);
  const [soumission, setSoumission] = useState<string | null>(null);
  const [depliees, setDepliees] = useState<Set<string>>(new Set());
  const basculer = (id: string) => setDepliees(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const load = useCallback(() => {
    setLoading(true);
    financeApi.justificatifs.mesDotations()
      .then(r => setDotations(r.data.data || []))
      .catch(() => setDotations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {});
  }, [load]);

  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));

  const ouvrir = (d: any) => { setDotationCible(d); setForm(formVide()); };

  const choisirPiece = async (file: File | undefined) => {
    if (!file) return;
    try {
      const piece = await lireFichierEnDataUrl(file);
      setForm(f => ({ ...f, piece, nomPiece: file.name }));
    } catch (e: any) { toast.error(e.message); }
  };

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dotationCible) return;
    if (!form.dossierId) { toast.error('Choisissez le dossier concerné par cette dépense'); return; }
    setSaving(true);
    try {
      await financeApi.justificatifs.create({
        dotationId: dotationCible.id,
        dossierId: form.dossierId || undefined,
        categorie: form.categorie,
        designation: form.designation,
        montant: Number(form.montant),
        dateJustificatif: form.dateJustificatif || undefined,
        piece: form.piece || undefined,
      });
      toast.success('Dépense enregistrée en brouillon. Soumettez votre état pour l\'envoyer à la trésorerie.');
      setDotationCible(null);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const soumettre = async (d: any) => {
    if (!confirm(`Soumettre ${d.nbBrouillon} dépense(s) pour ${fmt(d.montantBrouillon)} F à la trésorerie ? Vous ne pourrez plus les supprimer.`)) return;
    setSoumission(d.id);
    try {
      const r = await financeApi.justificatifs.soumettre(d.id);
      toast.success(r.data.message || 'État soumis à la trésorerie');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSoumission(null); }
  };

  const supprimer = async (j: any) => {
    if (!confirm(`Supprimer la dépense « ${j.designation} » ?`)) return;
    try { await financeApi.justificatifs.delete(j.id); toast.success('Justificatif supprimé'); load(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const voirPiece = async (j: any) => {
    try { const r = await financeApi.justificatifs.piece(j.id); ouvrirPiece(r.data.data.piece); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Pièce introuvable'); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <DotationTabs />
        <PageHeader titre="Mes dotations" sousTitre="Saisissez vos dépenses en précisant le dossier concerné, puis soumettez votre état à la trésorerie." />

        {loading ? (
          <div className="card text-center text-gray-500 py-10">Chargement...</div>
        ) : dotations.length === 0 ? (
          <div className="card text-center text-gray-500 py-10">Aucune dotation ne vous a été attribuée.</div>
        ) : dotations.map(d => (
          <div key={d.id} className="card !p-0 overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-primary-600 text-white">
              <div>
                <div className="font-bold">{d.numero} <span className="font-normal text-white/70">— {fmtDate(d.dateDotation)}</span></div>
                {d.motif && <div className="text-xs text-white/75">{d.motif}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {d.statut === 'SOLDEE' ? <span className="badge badge-success">Soldée</span> : <button type="button" onClick={() => ouvrir(d)} disabled={Number(d.montantRestant) <= 0} className="btn-secondary !py-1 disabled:opacity-50" title={Number(d.montantRestant) <= 0 ? 'Dotation entièrement justifiée' : undefined}>
                  + Ajouter une dépense
                </button>}
                {d.statut !== 'SOLDEE' && d.nbBrouillon > 0 && (
                  <button type="button" onClick={() => soumettre(d)} disabled={soumission === d.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8832a] px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-[#d4731f] disabled:opacity-60">
                    {soumission === d.id ? 'Envoi...' : `Soumettre à la trésorerie (${d.nbBrouillon})`}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-200 dark:bg-surface-700 text-center">
              {[
                { l: 'Montant dotation', v: d.montant, c: '' },
                { l: 'Dépensé (validé)', v: d.montantUtilise, c: 'text-green-600' },
                { l: 'Soumis, en attente', v: d.montantEnAttente, c: 'text-amber-600' },
                { l: 'Brouillon (non soumis)', v: d.montantBrouillon, c: 'text-gray-500' },
                { l: 'Reste à justifier', v: d.montantRestant, c: 'text-primary-600 dark:text-primary-300' },
              ].map(k => (
                <div key={k.l} className="bg-white dark:bg-surface-800 py-2.5 last:col-span-2 sm:last:col-span-1">
                  <div className="text-[10px] uppercase text-gray-500">{k.l}</div>
                  <div className={`font-bold font-mono ${k.c}`}>{fmt(k.v)} F</div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => basculer(d.id)} aria-expanded={depliees.has(d.id)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-200 hover:bg-gray-50 dark:hover:bg-surface-700/40">
              <span>{depliees.has(d.id) ? 'Masquer les dépenses' : 'Voir les dépenses'} ({d.justificatifs.length})</span>
              <svg className={`w-4 h-4 transition-transform ${depliees.has(d.id) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {!depliees.has(d.id) ? null : d.justificatifs.length === 0 ? (
              <p className="px-4 py-5 text-sm text-gray-500">Aucune dépense saisie pour cette dotation.</p>
            ) : (
              <div className="table-container !border-0 !rounded-none">
                <table className="w-full" data-no-enhance>
                  <thead>
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Dossier</th>
                      <th className="table-header">Catégorie</th>
                      <th className="table-header">Désignation</th>
                      <th className="table-header text-right">Montant</th>
                      <th className="table-header">Statut</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.justificatifs.map((j: any) => (
                      <tr key={j.id} className="table-row">
                        <td className="table-cell" data-label="Date">{fmtDate(j.dateJustificatif)}</td>
                        <td className="table-cell font-mono" data-label="Dossier">{j.dossier ? (j.dossier.numeroPhysique || j.dossier.numero) : '-'}</td>
                        <td className="table-cell" data-label="Catégorie">{j.categorie}</td>
                        <td className="table-cell !whitespace-normal" data-label="Désignation">{j.designation}</td>
                        <td className="table-cell text-right font-mono" data-label="Montant">{fmt(j.montant)}</td>
                        <td className="table-cell" data-label="Statut">
                          <span className={`badge ${STATUT_BADGE[j.statut]}`}>{STATUT_LABEL[j.statut]}</span>
                          {j.statut === 'REJETE' && j.motifRejet && <div className="text-[11px] text-red-600 mt-1 !whitespace-normal">Motif : {j.motifRejet}</div>}
                        </td>
                        <td className="table-cell" data-label="Actions">
                          <div className="flex gap-3 text-xs">
                            {j.aPiece && <button type="button" onClick={() => voirPiece(j)} className="text-primary-600 hover:underline">Voir la pièce</button>}
                            {j.statut === 'BROUILLON' && <button type="button" onClick={() => supprimer(j)} className="text-red-600 hover:underline">Supprimer</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={!!dotationCible}
        onClose={() => setDotationCible(null)}
        title="Nouvelle dépense"
        description={dotationCible ? `${dotationCible.numero} — reste à justifier : ${fmt(dotationCible.montantRestant)} F` : undefined}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDotationCible(null)}>Annuler</button>
            <button type="submit" form="form-depense-agent" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer en brouillon'}</button>
          </>
        }
      >
        <form id="form-depense-agent" onSubmit={envoyer} className="space-y-4">
          <div>
            <label className="label">Dossier concerné *</label>
            <PickerField value={form.dossierId} onChange={id => setForm({ ...form, dossierId: id })} options={dossierOptions} placeholder="— Choisir un dossier —" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie</label>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className="input-field">
                {CATEGORIES_DEPENSE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.dateJustificatif} onChange={e => setForm({ ...form, dateJustificatif: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="label">Désignation *</label>
            <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" placeholder="Ex : Frais de manutention conteneur" required />
          </div>
          <div>
            <label className="label">Montant (F CFA) *</label>
            <input type="text" inputMode="numeric" required className="input-field" placeholder="0" value={form.montant ? fmt(form.montant) : ''} onChange={e => setForm({ ...form, montant: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div>
            <label className="label">Pièce justificative (facture, reçu...)</label>
            <label className="btn-secondary cursor-pointer w-fit">
              Choisir un fichier
              <input type="file" accept={PIECE_TYPES_ACCEPTES} className="hidden" onChange={e => { choisirPiece(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {form.nomPiece && (
              <span className="ml-3 text-xs text-gray-600">
                {form.nomPiece} <button type="button" onClick={() => setForm({ ...form, piece: '', nomPiece: '' })} className="text-red-500 hover:underline ml-1">retirer</button>
              </span>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Image (PNG, JPG, WebP) ou PDF, 3 Mo maximum.</p>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
