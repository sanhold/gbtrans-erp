'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ErrorState from '@/components/ui/ErrorState';
import { dossiersApi, financeApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { fmt, mergedComptes, parseCompteValue, MODE_PAIEMENT_LABELS, CATEGORIES_DEPENSE, useComptesFinanciers } from '@/lib/financeHelpers';
import { lireFichierEnDataUrl, ouvrirPiece, PIECE_TYPES_ACCEPTES } from '@/lib/pieceJointe';

const MODES = ['ESPECES', 'CHEQUE', 'VIREMENT', 'MOBILE_MONEY', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'MOOV_MONEY'];
const STATUT_LABEL: Record<string, string> = { EN_ATTENTE: 'À valider', VALIDE: 'Validée', REJETE: 'Rejetée' };
const STATUT_BADGE: Record<string, string> = { EN_ATTENTE: 'badge-warning', VALIDE: 'badge-success', REJETE: 'badge-danger' };
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const formVide = () => ({ dossierId: '', categorie: CATEGORIES_DEPENSE[0], designation: '', montant: '', dateJustificatif: aujourdhui(), piece: '', nomPiece: '' });

/** Validation d'une dotation : informations en haut, dépenses en dessous à cocher, comptes à choisir, reliquat à retourner. */
export default function ValiderDotationPage() {
  const { id } = useParams() as { id: string };
  const { caisses, comptes } = useComptesFinanciers();
  const [data, setData] = useState<{ dotation: any; justificatifs: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [compteDebit, setCompteDebit] = useState('');
  const [compteRetour, setCompteRetour] = useState('');
  const utilisateur = useAuthStore(st => st.user);
  const [beneficiaire, setBeneficiaire] = useState('');
  const [beneficiaireModifie, setBeneficiaireModifie] = useState(false);
  // Par défaut, c'est la personne qui valide qui reçoit le reliquat ; elle peut saisir un autre nom.
  useEffect(() => {
    if (!beneficiaireModifie && utilisateur) setBeneficiaire(`${utilisateur.prenom} ${utilisateur.nom}`.trim());
  }, [utilisateur, beneficiaireModifie]);
  const [mode, setMode] = useState('ESPECES');
  const [confirmer, setConfirmer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [form, setForm] = useState(formVide());
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [aRejeter, setARejeter] = useState<any | null>(null);
  const [motif, setMotif] = useState('');

  const load = useCallback(() => {
    setErreur(false);
    return financeApi.justificatifs.dotation(id)
      .then(r => {
        setData(r.data.data);
        // Par défaut, toutes les dépenses à valider sont cochées ; le comptable décoche ce qu'il refuse.
        setCoches(new Set((r.data.data.justificatifs as any[]).filter(j => j.statut === 'EN_ATTENTE').map(j => j.id)));
      })
      .catch(() => { setData(null); setErreur(true); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { dossiersApi.listRef().then(r => setDossiers(r.data.data || [])).catch(() => {}); }, []);

  const compteOptions = mergedComptes(caisses, comptes).map(o => ({ id: o.value, label: o.label }));
  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));

  const dotation = data?.dotation;
  const lignes = data?.justificatifs || [];
  const aTraiter = lignes.filter(j => j.statut === 'EN_ATTENTE');
  const ouverte = dotation?.statut === 'VALIDE';

  const calcul = useMemo(() => {
    if (!dotation) return { somme: 0, reliquat: 0, nonCoches: 0 };
    const somme = aTraiter.filter(j => coches.has(j.id)).reduce((t, j) => t + Number(j.montant), 0);
    return {
      somme,
      reliquat: Math.round((Number(dotation.montant) - Number(dotation.montantUtilise) - somme) * 100) / 100,
      nonCoches: aTraiter.filter(j => !coches.has(j.id)).length,
    };
  }, [dotation, aTraiter, coches]);

  const basculer = (jid: string) => setCoches(prev => { const n = new Set(prev); if (n.has(jid)) n.delete(jid); else n.add(jid); return n; });
  const toutCocher = () => setCoches(new Set(aTraiter.map(j => j.id)));
  const toutDecocher = () => setCoches(new Set());

  const cDebit = parseCompteValue(compteDebit);
  const cRetour = parseCompteValue(compteRetour);
  const pret = !!cDebit && (calcul.reliquat <= 0 || (!!cRetour && beneficiaire.trim().length > 0));

  const valider = async () => {
    if (!cDebit) return;
    setBusy(true);
    try {
      const r = await financeApi.justificatifs.validerDotation({
        dotationId: id,
        justificatifIds: Array.from(coches),
        modePaiement: mode,
        caisseId: cDebit.type === 'CAISSE' ? cDebit.id : undefined,
        compteBancaireId: cDebit.type === 'BANQUE' ? cDebit.id : undefined,
        retour: calcul.reliquat > 0 && cRetour ? {
          caisseId: cRetour.type === 'CAISSE' ? cRetour.id : undefined,
          compteBancaireId: cRetour.type === 'BANQUE' ? cRetour.id : undefined,
          beneficiaire: beneficiaire.trim(),
        } : undefined,
      });
      toast.success(r.data.message || 'Dotation validée');
      setConfirmer(false);
      await load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); setConfirmer(false); }
    finally { setBusy(false); }
  };

  const choisirPiece = async (file: File | undefined) => {
    if (!file) return;
    try { const piece = await lireFichierEnDataUrl(file); setForm(f => ({ ...f, piece, nomPiece: file.name })); }
    catch (e: any) { toast.error(e.message); }
  };

  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dossierId) { toast.error('Choisissez le dossier concerné par cette dépense'); return; }
    setBusy(true);
    try {
      await financeApi.justificatifs.createComptable({
        dotationId: id, dossierId: form.dossierId, categorie: form.categorie, designation: form.designation,
        montant: Number(form.montant), dateJustificatif: form.dateJustificatif || undefined, piece: form.piece || undefined,
      });
      toast.success('Dépense ajoutée à la dotation');
      setAjout(false); setForm(formVide());
      await load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const rejeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aRejeter) return;
    setBusy(true);
    try {
      await financeApi.justificatifs.rejeter(aRejeter.id, motif);
      toast.success('Dépense rejetée');
      setARejeter(null); setMotif('');
      await load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const voirPiece = async (j: any) => {
    try { const r = await financeApi.justificatifs.piece(j.id); ouvrirPiece(r.data.data.piece); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Pièce introuvable'); }
  };

  if (loading) return <AppLayout><div className="card text-center text-gray-500 py-10">Chargement...</div></AppLayout>;
  if (erreur || !dotation) return <AppLayout><div className="card"><ErrorState titre="Dotation introuvable" onRetry={load} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4 pb-4">
        <Link href="/finance/justificatifs" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">← Dotations à valider</Link>

        {/* Informations de la dotation */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 bg-primary-600 text-white flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold">{dotation.numero} <span className="font-normal text-white/70">— {fmtDate(dotation.dateDotation)}</span></div>
              <div className="text-xs text-white/75">{dotation.agent ? `${dotation.agent.prenom} ${dotation.agent.nom}` : ''}{dotation.motif ? ` · ${dotation.motif}` : ''}</div>
            </div>
            <span className={`badge ${ouverte ? 'badge-warning' : dotation.statut === 'SOLDEE' ? 'badge-success' : 'badge-gray'}`}>
              {ouverte ? 'Ouverte' : dotation.statut === 'SOLDEE' ? 'Soldée' : 'Annulée'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-surface-700 text-center">
            {[
              { l: 'Montant dotation', v: dotation.montant, c: '' },
              { l: 'Dépensé (validé)', v: dotation.montantUtilise, c: 'text-green-600' },
              { l: 'Soumis, à valider', v: dotation.montantEnAttente, c: 'text-amber-600' },
              { l: 'Reste', v: Number(dotation.montant) - Number(dotation.montantUtilise), c: 'text-primary-600 dark:text-primary-300' },
            ].map(k => (
              <div key={k.l} className="bg-white dark:bg-surface-800 py-2.5">
                <div className="text-[10px] uppercase text-gray-500">{k.l}</div>
                <div className={`font-bold font-mono ${k.c}`}>{fmt(k.v)} F</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dépenses */}
        <div className="card !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-surface-700">
            <h2 className="font-bold text-gray-900 dark:text-white">Dépenses ({lignes.length})</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {ouverte && aTraiter.length > 0 && (
                <>
                  <button type="button" onClick={toutCocher} className="text-primary-600 hover:underline">Tout cocher</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={toutDecocher} className="text-primary-600 hover:underline">Tout décocher</button>
                </>
              )}
              {ouverte && <button type="button" onClick={() => { setForm(formVide()); setAjout(true); }} className="btn-secondary !py-1">+ Ajouter une dépense</button>}
            </div>
          </div>
          {lignes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Aucune dépense soumise pour cette dotation.{ouverte ? ' Vous pouvez en ajouter directement.' : ''}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-surface-700">
              {lignes.map(j => {
                const traitable = ouverte && j.statut === 'EN_ATTENTE';
                return (
                  <li key={j.id} className={`flex items-start gap-3 px-4 py-3 ${traitable && !coches.has(j.id) ? 'bg-gray-50 dark:bg-surface-900/30' : ''}`}>
                    {traitable ? (
                      <input type="checkbox" checked={coches.has(j.id)} onChange={() => basculer(j.id)} aria-label={`Retenir ${j.designation}`} className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0" />
                    ) : <span className="w-5 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className={`font-semibold ${traitable && !coches.has(j.id) ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{j.designation}</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(j.montant)} F</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>{fmtDate(j.dateJustificatif)}</span>
                        <span className="font-mono">{j.dossier ? (j.dossier.numeroPhysique || j.dossier.numero) : 'sans dossier'}</span>
                        <span>{j.categorie}</span>
                        <span>{j.auteur ? `${j.auteur.prenom} ${j.auteur.nom}` : ''}</span>
                        <span className={`badge ${STATUT_BADGE[j.statut]} !text-[10px]`}>{STATUT_LABEL[j.statut]}</span>
                        {j.aPiece && <button type="button" onClick={() => voirPiece(j)} className="text-primary-600 hover:underline">Voir la pièce</button>}
                        {traitable && <button type="button" onClick={() => { setARejeter(j); setMotif(''); }} className="text-red-600 hover:underline">Rejeter</button>}
                      </div>
                      {j.statut === 'REJETE' && j.motifRejet && <div className="mt-1 text-xs text-red-600">Motif : {j.motifRejet}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Validation */}
        {ouverte && (
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-white">Validation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl overflow-hidden border border-gray-200 dark:border-surface-700 bg-gray-200 dark:bg-surface-700 text-center">
              <div className="bg-white dark:bg-surface-800 py-3"><div className="text-[10px] uppercase text-gray-500">Dépenses cochées ({coches.size})</div><div className="font-bold font-mono text-green-600">{fmt(calcul.somme)} F</div></div>
              <div className="bg-white dark:bg-surface-800 py-3"><div className="text-[10px] uppercase text-gray-500">Non cochées ({calcul.nonCoches}) — rejetées</div><div className="font-bold font-mono text-gray-500">{fmt(aTraiter.filter(j => !coches.has(j.id)).reduce((t, j) => t + Number(j.montant), 0))} F</div></div>
              <div className="bg-primary-50 dark:bg-primary-500/15 py-3"><div className="text-[10px] uppercase text-gray-500">Reliquat à retourner</div><div className={`font-bold font-mono ${calcul.reliquat > 0 ? 'text-primary-700 dark:text-primary-200' : 'text-gray-500'}`}>{fmt(Math.max(calcul.reliquat, 0))} F</div></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Compte à débiter *</label>
                <PickerField value={compteDebit} onChange={setCompteDebit} options={compteOptions} placeholder="Sélectionner..." title="Compte à débiter" searchPlaceholder="Compte, caisse..." />
              </div>
              <div>
                <label className="label">Mode de paiement</label>
                <select value={mode} onChange={e => setMode(e.target.value)} className="input-field">
                  {MODES.map(m => <option key={m} value={m}>{MODE_PAIEMENT_LABELS[m] || m}</option>)}
                </select>
              </div>
              {calcul.reliquat > 0 && (
                <div className="sm:col-span-2">
                  <label className="label">Compte sur lequel le reliquat ({fmt(calcul.reliquat)} F) est retourné *</label>
                  <PickerField value={compteRetour} onChange={setCompteRetour} options={compteOptions} placeholder="Sélectionner..." title="Compte de retour du reliquat" searchPlaceholder="Compte, caisse..." />
                </div>
              )}
              {calcul.reliquat > 0 && (
                <div className="sm:col-span-2">
                  <label className="label">Reliquat versé à (nom de la personne qui le reçoit) *</label>
                  <input type="text" value={beneficiaire} maxLength={200} onChange={e => { setBeneficiaire(e.target.value); setBeneficiaireModifie(true); }} className="input-field" placeholder="Nom et prénom" />
                  <p className="mt-1 text-xs text-gray-500">Ce nom et le compte choisi figureront sur l'état d'utilisation de la dotation.</p>
                </div>
              )}
            </div>

            {cDebit && (
              <p className="text-xs text-gray-500">
                Le compte à débiter sera débité de <b className="font-mono">{fmt(calcul.somme + Math.max(calcul.reliquat, 0))} F</b>
                {' '}(dépenses retenues {fmt(calcul.somme)} F{calcul.reliquat > 0 ? ` + fonds remis non dépensés ${fmt(calcul.reliquat)} F` : ''}).
                {calcul.reliquat > 0 && cRetour ? ` Le reliquat de ${fmt(calcul.reliquat)} F sera crédité sur le compte de retour.` : ''}
              </p>
            )}
            {calcul.reliquat < 0 && <p className="text-sm text-red-600">Les dépenses cochées dépassent le montant de la dotation.</p>}

            <div className="flex justify-end">
              <button type="button" disabled={!pret || calcul.reliquat < 0 || busy} onClick={() => setConfirmer(true)} className="btn-success disabled:opacity-50">
                Valider la dotation
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmer}
        titre="Valider la dotation"
        message={`${coches.size} dépense(s) retenue(s) pour ${fmt(calcul.somme)} F seront enregistrées sur leurs dossiers.${calcul.nonCoches > 0 ? ` ${calcul.nonCoches} dépense(s) non cochée(s) seront rejetées.` : ''}${calcul.reliquat > 0 ? ` Reliquat de ${fmt(calcul.reliquat)} F retourné.` : ''} La dotation sera soldée : plus aucune dépense ne pourra y être ajoutée.`}
        confirmLabel="Valider"
        loading={busy}
        onConfirm={valider}
        onCancel={() => setConfirmer(false)}
      />

      <Modal open={ajout} onClose={() => setAjout(false)} title={`Nouvelle dépense — ${dotation.numero}`} footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => setAjout(false)}>Annuler</button>
          <button type="submit" form="form-ajout-depense" className="btn-primary" disabled={busy}>{busy ? 'Enregistrement...' : 'Ajouter à la dotation'}</button>
        </>
      }>
        <form id="form-ajout-depense" onSubmit={ajouter} className="space-y-3">
          <div>
            <label className="label">Dossier concerné *</label>
            <PickerField value={form.dossierId} onChange={d => setForm({ ...form, dossierId: d })} options={dossierOptions} placeholder="— Choisir un dossier —" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="label">Montant (F CFA) *</label>
            <input type="text" inputMode="numeric" required className="input-field" value={form.montant ? fmt(form.montant) : ''} onChange={e => setForm({ ...form, montant: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div>
            <label className="label">Pièce justificative</label>
            <label className="btn-secondary cursor-pointer w-fit">
              Choisir un fichier
              <input type="file" accept={PIECE_TYPES_ACCEPTES} className="hidden" onChange={e => { choisirPiece(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {form.nomPiece && <span className="ml-3 text-xs text-gray-600">{form.nomPiece} <button type="button" onClick={() => setForm({ ...form, piece: '', nomPiece: '' })} className="text-red-500 hover:underline ml-1">retirer</button></span>}
          </div>
        </form>
      </Modal>

      <Modal open={!!aRejeter} onClose={() => setARejeter(null)} title="Rejeter la dépense" size="sm" footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => setARejeter(null)}>Annuler</button>
          <button type="submit" form="form-rejet" className="btn-danger" disabled={busy}>{busy ? 'Rejet...' : 'Rejeter'}</button>
        </>
      }>
        <form id="form-rejet" onSubmit={rejeter} className="space-y-3">
          {aRejeter && <p className="text-sm text-gray-600 dark:text-gray-300">« {aRejeter.designation} » — {fmt(aRejeter.montant)} F</p>}
          <div>
            <label className="label">Motif du rejet *</label>
            <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={3} className="input-field" placeholder="Ex : pièce illisible, montant différent du reçu..." required />
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
