'use client';

import { statutLabels } from '@/lib/dossierStatut';

/** Onglet « Historique » : journal des changements de statut et actions. */
export default function DossierHistorique({ dossier }: { dossier: any }) {
  const items: any[] = dossier.historiqueDossier || [];
  return (
    <section className="card" aria-labelledby="sec-histo">
      <h3 id="sec-histo" className="font-semibold mb-4">Historique du dossier</h3>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((h: any) => (
            <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {h.action}
                  {h.statutAvant && h.statutApres && (
                    <span className="text-gray-600 dark:text-gray-300"> : {statutLabels[h.statutAvant] || h.statutAvant} → <span className="text-primary-600">{statutLabels[h.statutApres] || h.statutApres}</span></span>
                  )}
                  {!h.statutAvant && h.statutApres && (
                    <span className="text-gray-600 dark:text-gray-300"> → <span className="text-primary-600">{statutLabels[h.statutApres] || h.statutApres}</span></span>
                  )}
                </p>
                {h.commentaire && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{h.commentaire}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(h.createdAt).toLocaleString('fr-FR')} — {h.utilisateur || 'Système'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-sm">Aucun historique.</p>
      )}
    </section>
  );
}
