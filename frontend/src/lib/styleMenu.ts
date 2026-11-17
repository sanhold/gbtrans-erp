'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Styles du menu latéral proposés à l'utilisateur. « nuit » est le style par défaut. */
export type StyleMenu = 'nuit' | 'blanc' | 'ciel';

export const STYLES_MENU: { cle: StyleMenu; libelle: string; description: string; pastille: string }[] = [
  { cle: 'nuit', libelle: 'Bleu nuit', description: 'Menu sombre, page active en azur', pastille: 'linear-gradient(135deg,#0B2A5B,#1F6FEB)' },
  { cle: 'blanc', libelle: 'Blanc et couleurs', description: 'Menu blanc, une pastille de couleur par module', pastille: 'linear-gradient(135deg,#FFFFFF,#9DC1FF 60%,#F97316)' },
  { cle: 'ciel', libelle: 'Bleu ciel', description: 'Fond bleu clair, page active en carte blanche', pastille: 'linear-gradient(135deg,#EAF2FF,#7FB0FF)' },
];

const CLE = 'gbtrans.menu.style';
const EVT = 'gbtrans:menu-style';
const lire = (): StyleMenu => {
  try {
    const v = window.localStorage.getItem(CLE);
    return v === 'blanc' || v === 'ciel' || v === 'nuit' ? v : 'nuit';
  } catch { return 'nuit'; }
};
const abonner = (cb: () => void) => {
  window.addEventListener('storage', cb);
  window.addEventListener(EVT, cb);
  return () => { window.removeEventListener('storage', cb); window.removeEventListener(EVT, cb); };
};

/** Style du menu choisi par l'utilisateur (mémorisé dans ce navigateur), « nuit » par défaut. */
export function useStyleMenu() {
  const style = useSyncExternalStore(abonner, lire, () => 'nuit' as StyleMenu);
  const changer = useCallback((s: StyleMenu) => {
    try { window.localStorage.setItem(CLE, s); } catch { /* stockage indisponible : non bloquant */ }
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { style, changer };
}
