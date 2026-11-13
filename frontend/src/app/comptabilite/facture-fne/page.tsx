'use client';

import AppLayout from '@/components/layout/AppLayout';
import DecisionsTab from '@/components/comptabilite/DecisionsTab';

/**
 * Sous-module « Facture FNE Comptabilité » : file de décision de la comptabilité réelle.
 * Toutes les transactions y arrivent ; on décide facture normalisée (numéro FNE), comptabilité réelle ou corbeille.
 */
export default function FactureFneComptabilitePage() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facture FNE Comptabilité</h1>
          <p className="text-sm text-gray-500">Décidez du sort de chaque transaction : facture normalisée, comptabilité réelle ou corbeille.</p>
        </div>
        <DecisionsTab />
      </div>
    </AppLayout>
  );
}
