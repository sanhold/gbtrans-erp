'use client';

import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import ComptesBancairesManager from '@/components/finance/ComptesBancairesManager';

export default function ComptesBancairesPage() {
  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader titre="Comptes bancaires" sousTitre="Gestion des comptes bancaires" icone="M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18" />
        <ComptesBancairesManager />
      </div>
    </AppLayout>
  );
}
