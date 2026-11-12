'use client';

import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import ComptesBancairesManager from '@/components/finance/ComptesBancairesManager';

export default function ComptesBancairesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Comptes bancaires" subtitle="Gestion des comptes bancaires" />
        <ComptesBancairesManager />
      </div>
    </AppLayout>
  );
}
