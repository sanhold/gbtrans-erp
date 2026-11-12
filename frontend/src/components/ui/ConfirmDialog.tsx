'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Sheet from './Sheet';

/**
 * Remplace window.confirm / window.alert (non stylables, bloquants).
 *
 *   const confirmer = useConfirm();
 *   if (!(await confirmer({ titre: 'Supprimer ce dossier ?', message: 'Action irréversible.', danger: true }))) return;
 *
 * Le <ConfirmProvider> est monté une fois dans app/layout.tsx.
 */
export interface ConfirmOptions {
  titre: string;
  message?: React.ReactNode;
  confirmer?: string;
  annuler?: string;
  /** Bouton rouge pour les actions destructrices. */
  danger?: boolean;
  /** Mode information : un seul bouton « OK » (remplace alert). */
  info?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirmer = useCallback<ConfirmFn>((o) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpts(o);
    });
  }, []);

  const fermer = (valeur: boolean) => {
    resolver.current?.(valeur);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirmer}>
      {children}
      <Sheet open={!!opts} onClose={() => fermer(false)} size="sm" title={opts?.titre} zIndexClass="z-[80]">
        <div className="px-5 pb-5 pt-2">
          {opts?.message && <div className="text-sm text-gray-700 dark:text-gray-300 mb-5">{opts.message}</div>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {!opts?.info && (
              <button type="button" className="btn-secondary min-h-[44px]" onClick={() => fermer(false)}>
                {opts?.annuler || 'Annuler'}
              </button>
            )}
            <button
              type="button"
              autoFocus
              className={`${opts?.danger ? 'btn-danger' : 'btn-primary'} min-h-[44px]`}
              onClick={() => fermer(true)}
            >
              {opts?.confirmer || (opts?.info ? 'OK' : 'Confirmer')}
            </button>
          </div>
        </div>
      </Sheet>
    </ConfirmContext.Provider>
  );
}
