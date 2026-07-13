'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function OffresPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offres Commerciales</h1><p className="text-sm text-gray-500">Créez et suivez vos offres commerciales</p></div>
          <button className="btn-primary"><svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Nouvelle Offre</button>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead><tr><th className="table-header">N°</th><th className="table-header">Client</th><th className="table-header">Objet</th><th className="table-header">Montant</th><th className="table-header">Date</th><th className="table-header">Validité</th><th className="table-header">Statut</th></tr></thead>
            <tbody><tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucune offre commerciale</td></tr></tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
