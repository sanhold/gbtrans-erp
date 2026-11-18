'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Numero, Discret, Tronque, Montant } from '@/components/tables/cellules';
import InfoBulle from '@/components/ui/InfoBulle';
import Modal from '@/components/ui/Modal';
import { comptabiliteApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type Vue = 'a-decider' | 'traitees' | 'corbeille';
type Decision = 'FACTURE_NORMALISEE' | 'RECEVABLE' | 'CORBEILLE';

const fmt = (n: any) => (n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0');
const LIMITE = 50;

const TYPES = [
  { id: '', label: 'Tout' },
  { id: 'FACTURE', label: 'Factures' },
  { id: 'PAIEMENT', label: 'Paiements' },
  { id: 'FACTURE_FOURNISSEUR', label: 'Factures fournisseurs' },
  { id: 'PAIEMENT_FOURNISSEUR', label: 'Paiements fournisseurs' },
  { id: 'DEPENSE', label: 'Dépenses' },
];

const LIBELLE_DECISION: Record<string, string> = {
  FACTURE_NORMALISEE: 'Facture normalisée',
  RECEVABLE: 'Comptabilité réelle',
  CORBEILLE: 'Corbeille',
  REJETEE: 'Pièce rejetée',
};

/**
 * File de décision de la comptabilité réelle : toutes les transactions (factures, paiements, dépenses)
 * arrivent ici. On décide : facture normalisée (numéro FNE de la DGI), comptabilité réelle, ou corbeille.
 * Facture normalisée et comptabilité réelle ajoutent automatiquement la pièce aux « Pièces à comptabiliser ».
 */
export default function DecisionsTab({ vue, onChange }: { vue: Vue; onChange?: () => void }) {
  const { hasPermission } = useAuthStore();
  const peutDecider = hasPermission('COMPTABILITE:DECIDER');

  const [type, setType] = useState('');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const [resultat, setResultat] = useState<{ cle: string; data: { items: any[]; total: number; compteurs: any } } | null>(null);
  const [version, setVersion] = useState(0);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<null | { decision: Decision }>(null);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [edition, setEdition] = useState<null | { id: string; numeroFne: string }>(null);

  // Le chargement est déduit de la clé de requête : pas de setState synchrone dans l'effet.
  const cleRequete = JSON.stringify([vue, type, recherche, page, version]);
  useEffect(() => {
    let annule = false;
    const t = setTimeout(() => {
      comptabiliteApi.decisions({ vue, type: type || undefined, q: recherche || undefined, page, limit: LIMITE })
        .then(r => { if (!annule) setResultat({ cle: cleRequete, data: r.data.data }); })
        .catch(() => { if (!annule) { toast.error('Impossible de charger la file de décision'); setResultat({ cle: cleRequete, data: { items: [], total: 0, compteurs: null } }); } });
    }, recherche ? 300 : 0);
    return () => { annule = true; clearTimeout(t); };
  }, [cleRequete, vue, type, recherche, page]);

  const loading = !resultat || resultat.cle !== cleRequete;
  const data = resultat?.data ?? null;
  const items = useMemo(() => data?.items ?? [], [data]);
  const compteurs = data?.compteurs;
  const charger = () => setVersion(v => v + 1);
  const choisis = useMemo(() => items.filter(i => selection.has(i.cle)), [items, selection]);
  const toutesFactures = choisis.length > 0 && choisis.every(i => i.source === 'FACTURE');
  const toutSelectionne = items.length > 0 && items.every(i => selection.has(i.cle));

  const basculer = (cle: string) => setSelection(s => { const n = new Set(s); if (n.has(cle)) n.delete(cle); else n.add(cle); return n; });
  const basculerTout = () => setSelection(toutSelectionne ? new Set() : new Set(items.map(i => i.cle)));

  const apres = () => { setSelection(new Set()); setAction(null); setSaisie(''); charger(); onChange?.(); };

  const valider = async () => {
    if (!action) return;
    setEnCours(true);
    try {
      const r = await comptabiliteApi.decider({
        items: choisis.map(i => ({ source: i.source, id: i.id })),
        decision: action.decision,
        numeroFne: action.decision === 'FACTURE_NORMALISEE' ? saisie : undefined,
        motif: action.decision === 'CORBEILLE' ? saisie : undefined,
      });
      const { traitees, ignorees } = r.data.data;
      toast.success(r.data.message || `${traitees} transaction(s) traitée(s)`);
      if (ignorees?.length) toast(`${ignorees.length} transaction(s) ignorée(s) (déjà traitées ou introuvables)`, { icon: 'ℹ️' });
      apres();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Échec de la décision');
    } finally { setEnCours(false); }
  };

  const restaurer = async () => {
    setEnCours(true);
    try {
      const r = await comptabiliteApi.restaurerDecisions({ items: choisis.map(i => ({ kind: i.kind, id: i.id })) });
      toast.success(r.data.message || 'Restauré');
      apres();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Échec de la restauration');
    } finally { setEnCours(false); }
  };

  const enregistrerFne = async () => {
    if (!edition) return;
    setEnCours(true);
    try {
      await comptabiliteApi.corrigerFne(edition.id, edition.numeroFne);
      toast.success('Numéro FNE enregistré');
      setEdition(null); charger();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Échec de l\'enregistrement');
    } finally { setEnCours(false); }
  };

  const nbPages = Math.max(Math.ceil((data?.total ?? 0) / LIMITE), 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={recherche} onChange={e => { setRecherche(e.target.value); setPage(1); setSelection(new Set()); }} placeholder="Rechercher (n°, tiers, FNE…)" className="input-field !w-60 !py-1.5 text-sm" />
        {(vue === 'a-decider' || vue === 'corbeille') && peutDecider && items.length > 0 && (
          <button type="button" onClick={basculerTout} className="btn-secondary !py-1.5 text-sm">{toutSelectionne ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
        )}
        <InfoBulle titre="File de décision" cote="gauche">
          <p>Toutes les transactions (factures, paiements, dépenses) arrivent ici avant la comptabilité réelle.</p>
          <p><b>Facture normalisée</b> (factures clients) : vous enregistrez le numéro FNE délivré par la DGI. <b>Comptabilité réelle</b> : la transaction est recevable. Dans les deux cas, elle passe automatiquement dans « Pièces à comptabiliser ».</p>
          <p><b>Corbeille</b> : la transaction n&apos;est pas comptabilisée et quitte la file. Vous pouvez la restaurer à tout moment. Les pièces rejetées y figurent aussi.</p>
          <p>Compta Auto reste indépendante de cette file.</p>
        </InfoBulle>
      </div>

      {vue === 'a-decider' && (
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => {
            const n = t.id ? compteurs?.parType?.[t.id] : compteurs?.aDecider;
            return (
              <button key={t.id} onClick={() => { setType(t.id); setPage(1); setSelection(new Set()); }}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${type === t.id ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-500/15' : 'border-gray-200 dark:border-surface-600 text-gray-600 hover:border-primary-300'}`}>
                {t.label}{n != null && <span className="ml-1 text-gray-500">{n}</span>}
              </button>
            );
          })}
        </div>
      )}

      {choisis.length > 0 && peutDecider && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/60 dark:bg-primary-500/10 dark:border-primary-500/30 px-3 py-2">
          <span className="text-sm font-medium">{choisis.length} sélectionnée(s)</span>
          {vue === 'a-decider' && (
            <>
              <button disabled={!toutesFactures} title={toutesFactures ? '' : 'Réservé aux factures clients'} onClick={() => { setSaisie(''); setAction({ decision: 'FACTURE_NORMALISEE' }); }} className="btn-primary text-sm disabled:opacity-40">Facture normalisée</button>
              <button onClick={() => { setSaisie(''); setAction({ decision: 'RECEVABLE' }); }} className="btn-secondary text-sm">Comptabilité réelle</button>
              <button onClick={() => { setSaisie(''); setAction({ decision: 'CORBEILLE' }); }} className="btn-secondary text-sm !text-red-600">Corbeille</button>
            </>
          )}
          {vue === 'corbeille' && <button disabled={enCours} onClick={restaurer} className="btn-primary text-sm">Restaurer</button>}
          <button onClick={() => setSelection(new Set())} className="text-xs text-gray-500 hover:underline ml-auto">Désélectionner</button>
        </div>
      )}

      <ListeResponsive
        colonnes={[
          ...(((vue === 'a-decider' || vue === 'corbeille') && peutDecider) ? [{ cle: 'sel', libelle: '', texte: () => '', rendu: (i: any) => <input type="checkbox" checked={selection.has(i.cle)} onClick={e => e.stopPropagation()} onChange={() => basculer(i.cle)} aria-label={`Sélectionner ${i.numero || i.libelle}`} className="h-4 w-4 rounded accent-blue-600" /> }] : []),
          { cle: 'type', libelle: 'Type', texte: (i: any) => i.typeLibelle, rendu: (i: any) => <Discret>{i.typeLibelle}</Discret> },
          { cle: 'ref', libelle: 'Référence', texte: (i: any) => i.numero || '', rendu: (i: any) => <Numero>{i.numero || '—'}</Numero> },
          { cle: 'tiers', libelle: 'Tiers / libellé', texte: (i: any) => i.tiers ?? i.libelle, rendu: (i: any) => <Tronque texte={i.tiers ?? i.libelle} largeur="22rem" /> },
          { cle: 'date', libelle: 'Date', texte: (i: any) => new Date(i.date).toLocaleDateString('fr-FR'), rendu: (i: any) => <Discret>{new Date(i.date).toLocaleDateString('fr-FR')}</Discret> },
          { cle: 'montant', libelle: 'Montant', align: 'right' as const, texte: (i: any) => String(i.montant), rendu: (i: any) => <Montant valeur={i.montant} /> },
          ...(vue !== 'a-decider' ? [{ cle: 'dec', libelle: 'Décision', texte: (i: any) => LIBELLE_DECISION[i.decision?.statut] ?? '', rendu: (i: any) => (
            <span className="text-[13px]">
              <span className="font-medium">{LIBELLE_DECISION[i.decision?.statut] ?? i.decision?.statut}</span>
              {i.decision?.statut === 'FACTURE_NORMALISEE' && (
                <> · FNE <span className="font-mono">{i.decision.numeroFne || '—'}</span>
                  {peutDecider && <button type="button" onClick={e => { e.stopPropagation(); setEdition({ id: i.decision.id, numeroFne: i.decision.numeroFne ?? '' }); }} className="ml-1 text-azure hover:underline">modifier</button>}</>
              )}
              {i.decision?.motif && <span className="text-gray-500"> · {i.decision.motif}</span>}
            </span>
          ) }] : []),
        ]}
        lignes={items}
        cleLigne={(i: any) => i.cle}
        chargement={loading}
        nomExport={`fne-${vue}`}
        carte={(i: any) => ({
          titre: <span className="inline-flex items-center gap-2">{(vue === 'a-decider' || vue === 'corbeille') && peutDecider && <input type="checkbox" checked={selection.has(i.cle)} onClick={e => e.stopPropagation()} onChange={() => basculer(i.cle)} aria-label={`Sélectionner ${i.numero || i.libelle}`} className="h-4 w-4 rounded accent-blue-600" />}{i.tiers ?? i.libelle}</span>,
          sousTitre: `${i.typeLibelle} — ${i.numero || '—'} — ${new Date(i.date).toLocaleDateString('fr-FR')}`,
          droite: <Montant valeur={i.montant} />,
          details: vue !== 'a-decider' ? `${LIBELLE_DECISION[i.decision?.statut] ?? ''}${i.decision?.statut === 'FACTURE_NORMALISEE' ? ` · FNE ${i.decision.numeroFne || '—'}` : ''}${i.decision?.motif ? ` · ${i.decision.motif}` : ''}` : undefined,
        })}
        vide={<EmptyState titre={vue === 'a-decider' ? 'Aucune transaction à décider' : vue === 'traitees' ? 'Aucune transaction décidée' : 'La corbeille est vide'} description="Tout est à jour." />}
      />

      {data && data.total > LIMITE && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.total} résultats</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); setSelection(new Set()); }} className="btn-secondary text-sm disabled:opacity-40">Précédent</button>
            <span>{page} / {nbPages}</span>
            <button disabled={page >= nbPages} onClick={() => { setPage(p => p + 1); setSelection(new Set()); }} className="btn-secondary text-sm disabled:opacity-40">Suivant</button>
          </div>
        </div>
      )}

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.decision === 'FACTURE_NORMALISEE' ? 'Mettre en facture normalisée' : action?.decision === 'RECEVABLE' ? 'Comptabilité réelle' : 'Mettre à la corbeille'}
        description={`${choisis.length} transaction(s) sélectionnée(s)`}
        size="sm"
        footer={<>
          <button onClick={() => setAction(null)} className="btn-secondary text-sm">Annuler</button>
          <button onClick={valider} disabled={enCours} className="btn-primary text-sm disabled:opacity-50">{enCours ? 'Enregistrement…' : 'Confirmer'}</button>
        </>}
      >
        {action?.decision === 'FACTURE_NORMALISEE' && (
          <div className="space-y-2">
            <label htmlFor="decision-fne" className="text-xs font-bold text-gray-500 uppercase">Numéro FNE (DGI)</label>
            <input id="decision-fne" value={saisie} onChange={e => setSaisie(e.target.value)} className="input-field" placeholder="Facultatif, modifiable ensuite" maxLength={50} autoFocus />
            <p className="text-xs text-gray-500">Le même numéro est appliqué aux factures sélectionnées. Elles seront ajoutées aux pièces à comptabiliser.</p>
          </div>
        )}
        {action?.decision === 'RECEVABLE' && <p className="text-sm text-gray-600">Ces transactions sont recevables en comptabilité réelle : elles seront ajoutées aux pièces à comptabiliser.</p>}
        {action?.decision === 'CORBEILLE' && (
          <div className="space-y-2">
            <label htmlFor="decision-motif" className="text-xs font-bold text-gray-500 uppercase">Motif (facultatif)</label>
            <input id="decision-motif" value={saisie} onChange={e => setSaisie(e.target.value)} className="input-field" maxLength={500} autoFocus />
            <p className="text-xs text-gray-500">Elles ne seront pas comptabilisées. Vous pourrez les restaurer depuis la corbeille.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!edition}
        onClose={() => setEdition(null)}
        title="Numéro FNE"
        size="sm"
        footer={<>
          <button onClick={() => setEdition(null)} className="btn-secondary text-sm">Annuler</button>
          <button onClick={enregistrerFne} disabled={enCours} className="btn-primary text-sm disabled:opacity-50">Enregistrer</button>
        </>}
      >
        <input aria-label="Numéro FNE" value={edition?.numeroFne ?? ''} onChange={e => setEdition(ed => ed && { ...ed, numeroFne: e.target.value })} className="input-field" maxLength={50} autoFocus />
      </Modal>
    </div>
  );
}
