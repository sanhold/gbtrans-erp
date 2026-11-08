'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { dossiersApi, clientsApi } from '@/lib/api';
import { statutLabels } from '@/lib/dossierStatut';
import { navGroups } from './Sidebar';
import { peutAcceder } from './navAcces';
import { useActionsRapides } from './QuickActions';

export const OUVRIR_PALETTE = 'gbtrans:palette';
/** Ouvre la recherche globale depuis n'importe quel composant. */
export function ouvrirPalette() { window.dispatchEvent(new Event(OUVRIR_PALETTE)); }

interface Resultat { cle: string; groupe: string; titre: string; detail?: string; href: string; emoji: string }

const sans = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Recherche globale (Ctrl+K ou ⌘K) : dossiers, clients, pages et actions. */
export default function CommandPalette() {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const actionsRapides = useActionsRapides();
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState('');
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [actif, setActif] = useState(0);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ouvrir = () => { setQ(''); setActif(0); setOuvert(true); };
    const touche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOuvert((v) => { if (!v) { setQ(''); setActif(0); } return !v; }); }
    };
    window.addEventListener(OUVRIR_PALETTE, ouvrir);
    window.addEventListener('keydown', touche);
    return () => { window.removeEventListener(OUVRIR_PALETTE, ouvrir); window.removeEventListener('keydown', touche); };
  }, []);

  useEffect(() => { if (ouvert) setTimeout(() => champ.current?.focus(), 30); }, [ouvert]);

  const peutDossiers = peutAcceder('/dossiers', user, hasPermission, 'TRANSIT');
  const peutClients = peutAcceder('/clients', user, hasPermission);

  useEffect(() => {
    if (!ouvert || q.trim().length < 2) { setDossiers([]); setClients([]); return; }
    let annule = false;
    const t = setTimeout(() => {
      if (peutDossiers) dossiersApi.list({ limit: 5, search: q.trim(), sortBy: 'dateCreation', sortOrder: 'desc' }).then((r) => { if (!annule) setDossiers(r.data.data || []); }).catch(() => {});
      if (peutClients) clientsApi.list({ limit: 4, search: q.trim() }).then((r) => { if (!annule) setClients(r.data.data || []); }).catch(() => {});
    }, 250);
    return () => { annule = true; clearTimeout(t); };
  }, [q, ouvert, peutDossiers, peutClients]);

  const resultats = useMemo<Resultat[]>(() => {
    const terme = sans(q.trim());
    const out: Resultat[] = [];
    dossiers.forEach((d) => out.push({ cle: `d${d.id}`, groupe: 'Dossiers', titre: `${d.numeroPhysique || d.numero} — ${d.client?.raisonSociale || ''}`, detail: statutLabels[d.statut] || d.statut, href: `/dossiers/${d.id}`, emoji: '📁' }));
    clients.forEach((c) => out.push({ cle: `c${c.id}`, groupe: 'Clients', titre: c.raisonSociale, href: `/clients?search=${encodeURIComponent(c.raisonSociale)}`, emoji: '👤' }));
    actionsRapides.filter((a) => !terme || sans(a.nom).includes(terme)).forEach((a) => out.push({ cle: `a${a.id}`, groupe: 'Actions', titre: a.nom, href: a.href, emoji: '＋' }));
    navGroups.forEach((g) => g.items.forEach((i) => {
      if (!peutAcceder(i.href, user, hasPermission, i.activite)) return;
      if (terme && !sans(i.name).includes(terme) && !sans(g.title).includes(terme)) return;
      out.push({ cle: `p${i.href}`, groupe: 'Pages', titre: i.name, detail: g.title, href: i.href, emoji: '↗' });
    }));
    return out.slice(0, 25);
  }, [q, dossiers, clients, actionsRapides, user, hasPermission]);

  useEffect(() => { setActif(0); }, [resultats.length, q]);

  const aller = (r: Resultat) => { setOuvert(false); router.push(r.href); };

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOuvert(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActif((i) => Math.min(i + 1, resultats.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActif((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const r = resultats[actif];
      if (r) aller(r);
      else if (q.trim()) { setOuvert(false); router.push(`/dossiers?search=${encodeURIComponent(q.trim())}`); }
    }
  };

  useEffect(() => { document.getElementById(`pal-${actif}`)?.scrollIntoView({ block: 'nearest' }); }, [actif]);

  if (!ouvert) return null;
  let groupePrec = '';
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Recherche globale">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOuvert(false)} />
      <div className="relative w-full h-full sm:h-auto sm:max-h-[70vh] sm:max-w-[640px] bg-white dark:bg-surface-800 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in" onKeyDown={clavier}>
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-surface-700 pr-2">
          <input ref={champ} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un dossier, un client, une page…" aria-label="Rechercher"
            className="flex-1 min-w-0 bg-transparent px-5 py-4 text-[16px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          <button onClick={() => setOuvert(false)} className="text-xs text-gray-500 border border-gray-200 dark:border-surface-600 rounded-md px-2 py-1 hover:bg-gray-50 dark:hover:bg-surface-700">Échap</button>
        </div>
        <div className="overflow-y-auto flex-1 py-1" role="listbox">
          {resultats.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-500">{q.trim().length < 2 ? 'Tapez au moins 2 caractères.' : 'Aucun résultat. Appuyez sur Entrée pour chercher dans les dossiers.'}</p>
          )}
          {resultats.map((r, i) => {
            const entete = r.groupe !== groupePrec; groupePrec = r.groupe;
            return (
              <div key={r.cle}>
                {entete && <p className="px-5 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{r.groupe}</p>}
                <button id={`pal-${i}`} role="option" aria-selected={i === actif} onMouseMove={() => setActif(i)} onClick={() => aller(r)}
                  className={clsx('w-full flex items-center justify-between gap-3 px-5 min-h-[44px] text-left text-sm', i === actif ? 'bg-primary-50 dark:bg-primary-500/20' : '')}>
                  <span className="flex items-center gap-3 min-w-0"><span aria-hidden="true" className="w-5 text-center">{r.emoji}</span><span className="truncate text-gray-900 dark:text-white">{r.titre}</span></span>
                  <span className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">{r.detail}{i === actif && <kbd className="hidden sm:inline border border-gray-300 dark:border-surface-600 rounded px-1.5">↵</kbd>}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="hidden sm:flex items-center gap-4 px-5 py-2 border-t border-gray-100 dark:border-surface-700 text-[11px] text-gray-400">
          <span>↑↓ naviguer</span><span>↵ ouvrir</span><span>Échap fermer</span>
        </div>
      </div>
    </div>
  );
}
