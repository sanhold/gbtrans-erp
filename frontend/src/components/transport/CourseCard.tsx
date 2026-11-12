'use client';

import Link from 'next/link';

export const STATUT_LABEL: Record<string, string> = { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' };
export const STATUT_BADGE: Record<string, string> = { PLANIFIEE: 'badge-info', EN_COURS: 'badge-warning', TERMINEE: 'badge-success', ANNULEE: 'badge-danger' };
const STATUT_BAR: Record<string, string> = { PLANIFIEE: 'bg-primary-500', EN_COURS: 'bg-amber-500', TERMINEE: 'bg-green-500', ANNULEE: 'bg-red-500' };

export const fmtMontant = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';

interface Props {
  course: any;
  busy: boolean;
  facturable: boolean;
  selected: boolean;
  resultat: number | null;
  onToggleSelect: () => void;
  onStatut: (statut: string) => void;
  onSupprimer: () => void;
  onFacturation: () => void;
}

const DT = 'text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400';

/** Carte de course pour usage terrain (mobile) : statut, trajet, chauffeur/véhicule, actions au pouce (>=48px). */
export default function CourseCard({ course: c, busy, facturable, selected, resultat, onToggleSelect, onStatut, onSupprimer, onFacturation }: Props) {
  const btn = 'min-h-[48px] rounded-lg text-sm font-semibold px-4 flex-1 disabled:opacity-50 active:scale-[.98] transition-transform';
  const actif = c.statut === 'PLANIFIEE' || c.statut === 'EN_COURS';
  return (
    <article className="relative bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl overflow-hidden shadow-card" aria-label={`Course ${c.numero}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${STATUT_BAR[c.statut] || 'bg-gray-300'}`} aria-hidden="true" />
      <div className="pl-4 pr-3 pt-3 pb-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300">{c.numero}</span>
          <span className={`badge ${STATUT_BADGE[c.statut]}`}>{STATUT_LABEL[c.statut]}</span>
        </div>
        <p className="text-base font-bold leading-snug text-gray-900 dark:text-white break-words">
          {c.origine} <span aria-hidden="true" className="text-gray-500">→</span><span className="sr-only"> vers </span> {c.destination}
        </p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <div className="min-w-0"><dt className={DT}>Chauffeur</dt><dd className="truncate">{c.chauffeur ? `${c.chauffeur.prenom} ${c.chauffeur.nom}` : '-'}</dd></div>
          <div className="min-w-0"><dt className={DT}>Véhicule</dt><dd className="truncate font-mono">{c.vehicule?.immatriculation || '-'}</dd></div>
          <div className="min-w-0"><dt className={DT}>Client</dt><dd className="truncate">{c.client?.raisonSociale || '-'}</dd></div>
          <div className="min-w-0"><dt className={DT}>Montant</dt><dd className="font-mono">{fmtMontant(c.montantFacturable)}</dd></div>
          {resultat != null && (
            <div className="min-w-0 col-span-2"><dt className={DT}>Résultat</dt>
              <dd className={`font-mono font-semibold ${resultat >= 0 ? 'text-accent-600' : 'text-red-600'}`}>{fmtMontant(resultat)}</dd></div>
          )}
        </dl>

        {c.facture && (
          <Link href={`/facturation/${c.facture.id}`} className="inline-flex items-center min-h-[44px] text-sm text-primary-600 font-mono underline">Facture {c.facture.numero}</Link>
        )}
        {facturable && (
          <label className="flex items-center gap-3 min-h-[44px] text-sm cursor-pointer">
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-6 h-6 rounded" />
            Sélectionner pour facturation
          </label>
        )}

        {(actif || (c.statut === 'TERMINEE' && !c.facture)) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {c.statut === 'PLANIFIEE' && <button type="button" onClick={() => onStatut('EN_COURS')} disabled={busy} className={`${btn} bg-primary-600 text-white`}>Démarrer</button>}
            {c.statut === 'EN_COURS' && <button type="button" onClick={() => onStatut('TERMINEE')} disabled={busy} className={`${btn} bg-green-600 text-white`}>Terminer</button>}
            {c.statut === 'TERMINEE' && !c.facture && (
              <button type="button" onClick={onFacturation} className={`${btn} bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200`}>
                {c.clientId && c.montantFacturable ? 'Modifier facturation' : 'Renseigner facturation'}
              </button>
            )}
            {actif && <button type="button" onClick={() => onStatut('ANNULEE')} disabled={busy} className={`${btn} flex-none border border-red-300 text-red-700 dark:text-red-300 dark:border-red-500/40`}>Annuler</button>}
            {c.statut === 'PLANIFIEE' && <button type="button" onClick={onSupprimer} className={`${btn} flex-none border border-gray-300 dark:border-surface-600 text-gray-700 dark:text-gray-200`}>Supprimer</button>}
          </div>
        )}
      </div>
    </article>
  );
}
