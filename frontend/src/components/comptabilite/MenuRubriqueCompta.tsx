'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { ENTREE_PLAN, type DefOnglet } from '@/lib/comptaOnglets';

/**
 * Écran d'accueil d'une rubrique sur téléphone : toutes les pages sont des cartes alignées
 * (pictogramme, titre, description, flèche), regroupées par thème. Un toucher ouvre la page.
 */
export default function MenuRubriqueCompta({ base, defs, titre }: { base: string; defs: DefOnglet[]; titre: string }) {
  const router = useRouter();
  const entrees = [
    ...defs.map(d => ({ href: `${base}/${d.slug}`, libelle: d.libelle, desc: d.desc, icone: d.icone, groupe: d.groupe })),
    ENTREE_PLAN,
  ];
  const groupes = Array.from(new Set(entrees.map(e => e.groupe)));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/comptabilite')} aria-label="Retour" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 dark:border-surface-600 dark:bg-surface-800 dark:text-gray-200">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-primary-600 dark:text-white">{titre}</h1>
        </div>

        {groupes.map(g => (
          <section key={g} aria-label={g}>
            <h2 className="mb-2 mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-500">{g}</h2>
            <ul className="space-y-2.5">
              {entrees.filter(e => e.groupe === g).map(e => (
                <li key={e.href}>
                  <Link href={e.href} className="flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition-colors active:bg-gray-50 dark:border-surface-700 dark:bg-surface-800">
                    <span aria-hidden="true" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-azure-tint text-azure dark:bg-azure/15">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={e.icone} /></svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-gray-900 dark:text-white">{e.libelle}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-gray-500 dark:text-gray-400">{e.desc}</span>
                    </span>
                    <svg aria-hidden="true" className="h-5 w-5 flex-shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}
