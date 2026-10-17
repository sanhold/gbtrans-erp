'use client';

import { useEffect, useRef, useState } from 'react';

export interface RowAction {
  label: string;
  onClick: () => void;
  /** Couleur du texte (classe Tailwind), ex. 'text-red-600'. */
  tone?: string;
  /** Si renseigné, une confirmation est demandée avant d'exécuter l'action. */
  confirm?: string;
  hidden?: boolean;
}

export interface RowMenuState {
  x: number;
  y: number;
  infos: { label: string; value: string }[];
  actions: RowAction[];
}

/** Ouvre le menu à l'endroit d'un clic (bouton « Actions » ou clic sur la ligne). */
export function openRowMenu(
  setState: (s: RowMenuState | null) => void,
  e: React.MouseEvent,
  infos: RowMenuState['infos'],
  actions: RowAction[],
) {
  e.stopPropagation();
  const target = e.currentTarget as HTMLElement;
  const isButton = target.tagName === 'BUTTON';
  const rect = target.getBoundingClientRect();
  const x = isButton ? rect.left : e.clientX;
  const y = isButton ? rect.bottom + 2 : e.clientY;
  setState({ x, y, infos, actions });
}

/** Bouton « Actions » à placer dans la cellule d'actions d'une ligne. */
export function ActionsButton({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-sm dark:bg-surface-700 dark:text-gray-200 dark:border-surface-600"
    >
      Actions
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
    </button>
  );
}

/** Menu contextuel de ligne : récapitulatif (N°, client, dossier...) puis actions, avec confirmation optionnelle. */
export default function RowActionsMenu({ state, onClose }: { state: RowMenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<RowAction | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!state) { setPos(null); return; }
    const w = 260;
    const h = ref.current?.offsetHeight ?? 260;
    setPos({
      left: Math.max(8, Math.min(state.x, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(state.y, window.innerHeight - h - 8)),
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [state, onClose]);

  const run = (a: RowAction) => {
    if (a.confirm) { setPending(a); onClose(); return; }
    onClose();
    a.onClick();
  };

  return (
    <>
      {state && (
        <div className="fixed inset-0 z-[70]" onClick={onClose}>
          <div
            ref={ref}
            onClick={(e) => e.stopPropagation()}
            style={{ left: pos?.left ?? state.x, top: pos?.top ?? state.y, width: 260, visibility: pos ? 'visible' : 'hidden' }}
            className="fixed bg-white dark:bg-surface-800 border border-gray-300 dark:border-surface-700 rounded-sm shadow-lg text-[12.5px]"
          >
            <div className="px-3 py-2 bg-primary-600 text-white space-y-0.5">
              {state.infos.map((i) => (
                <div key={i.label} className="flex gap-2">
                  <span className="text-white/65 w-14 flex-shrink-0">{i.label}</span>
                  <span className="font-semibold truncate" title={i.value}>{i.value || '-'}</span>
                </div>
              ))}
            </div>
            <ul className="py-1">
              {state.actions.filter((a) => !a.hidden).map((a) => (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => run(a)}
                    className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-surface-700 ${a.tone || 'text-gray-800 dark:text-gray-100'}`}
                  >
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setPending(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-sm shadow-lg w-full max-w-sm border border-gray-300 dark:border-surface-700" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-2.5 bg-primary-600 text-white text-sm font-bold">Confirmation</div>
            <p className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{pending.confirm}</p>
            <div className="px-4 pb-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPending(null)}>Annuler</button>
              <button
                type="button"
                className={pending.tone?.includes('red') ? 'btn-danger' : 'btn-primary'}
                onClick={() => { const a = pending; setPending(null); a.onClick(); }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
