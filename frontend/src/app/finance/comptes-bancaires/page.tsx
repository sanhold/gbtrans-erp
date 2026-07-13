'use client';

import AppLayout from '@/components/layout/AppLayout';
import ComptesBancairesManager from '@/components/finance/ComptesBancairesManager';

export default function ComptesBancairesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comptes Bancaires</h1><p className="text-sm text-gray-500">Gestion des comptes bancaires</p></div>
        <ComptesBancairesManager />
      </div>
    </AppLayout>
  );
}
