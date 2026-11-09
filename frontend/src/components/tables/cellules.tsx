import { ReactNode } from 'react';
import { clsx } from 'clsx';

const TEINTES = ['bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700'];

function teinte(nom: string) {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) >>> 0;
  return TEINTES[h % TEINTES.length];
}

function initiales(nom: string) {
  const mots = nom.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/).filter(Boolean);
  if (mots.length === 0) return '?';
  return (mots.length === 1 ? mots[0].slice(0, 2) : mots[0][0] + mots[1][0]).toUpperCase();
}

/** Pastille ronde aux initiales d'un client ou d'un tiers (couleur stable selon le nom). */
export function Avatar({ nom }: { nom?: string | null }) {
  const n = nom || '?';
  return <span aria-hidden="true" className={clsx('inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold', teinte(n))}>{initiales(n)}</span>;
}

type Ton = 'info' | 'warning' | 'success' | 'danger' | 'gray';
const TONS: Record<Ton, { pastille: string; point: string }> = {
  info: { pastille: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30', point: 'bg-sky-500' },
  warning: { pastille: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30', point: 'bg-amber-500' },
  success: { pastille: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30', point: 'bg-emerald-500' },
  danger: { pastille: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30', point: 'bg-red-500' },
  gray: { pastille: 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10', point: 'bg-gray-400' },
};

/** Convertit une classe « badge-xxx » existante en ton de pastille. */
export function tonDepuisBadge(classe?: string): Ton {
  const m = /badge-(info|warning|success|danger|gray)/.exec(classe || '');
  return (m?.[1] as Ton) || 'gray';
}

/** Statut en pastille avec point de couleur. */
export function StatutPastille({ libelle, ton = 'gray' }: { libelle: string; ton?: Ton }) {
  const t = TONS[ton];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', t.pastille)}>
      <span aria-hidden="true" className={clsx('h-1.5 w-1.5 rounded-full', t.point)} />
      {libelle}
    </span>
  );
}

/** Deux lignes : valeur principale et information secondaire plus discrète. */
export function DoubleLigne({ haut, bas, mono = false }: { haut: ReactNode; bas?: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 leading-tight">
      <div className={clsx('truncate font-semibold text-gray-900 dark:text-white', mono && 'font-mono text-[13px] text-primary-600 dark:text-primary-300')}>{haut}</div>
      {bas !== undefined && bas !== null && bas !== '' && <div className="mt-0.5 truncate text-xs text-gray-400">{bas}</div>}
    </div>
  );
}

/** Tiers avec avatar et information secondaire. */
export function Tiers({ nom, detail }: { nom?: string | null; detail?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar nom={nom} />
      <div className="min-w-0 leading-tight">
        <div className="max-w-[16rem] truncate font-medium text-gray-900 dark:text-white" title={nom || undefined}>{nom || '—'}</div>
        {detail !== undefined && detail !== null && detail !== '' && <div className="mt-0.5 truncate text-xs text-gray-400">{detail}</div>}
      </div>
    </div>
  );
}

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Montant aligné : chiffres espacés par milliers, unité discrète. Les zéros sont atténués. */
export function Montant({ valeur, ton = 'normal', unite = 'F' }: { valeur: any; ton?: 'normal' | 'positif' | 'negatif'; unite?: string }) {
  const n = Number(valeur || 0);
  if (n === 0) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  const couleur = n === 0 ? 'text-gray-300 dark:text-gray-600' : ton === 'positif' ? 'text-emerald-600' : ton === 'negatif' ? 'text-red-600' : 'text-gray-900 dark:text-white';
  return (
    <span className={clsx('tabular-nums', couleur)}>
      <span className={clsx(n !== 0 && ton === 'normal' && 'font-semibold')}>{nombre.format(n)}</span>
      {n !== 0 && <span className="ml-1 text-[11px] font-normal text-gray-400">{unite}</span>}
    </span>
  );
}

/** Barre de progression fine avec compteur. */
export function Progression({ fait, total, titre }: { fait: number; total: number; titre?: string }) {
  const pct = total > 0 ? Math.round((fait / total) * 100) : 0;
  return (
    <div className="flex min-w-[8.5rem] items-center gap-2" title={titre ?? `${fait}/${total} étapes validées`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-surface-700">
        <div className={clsx('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-primary-500')} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-gray-500">{pct}%</span>
    </div>
  );
}

/** Petit compteur « icône + nombre » (documents liés). */
export function Compteur({ icone, valeur, titre }: { icone: ReactNode; valeur: number; titre: string }) {
  return (
    <span title={titre} className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums', valeur > 0 ? 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200' : 'text-gray-300')}>
      {icone}{valeur}
    </span>
  );
}
