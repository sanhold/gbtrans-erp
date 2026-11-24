'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import DecisionsTab from '@/components/comptabilite/DecisionsTab';
import { BASE_FNE, ONGLETS_FNE } from '@/lib/comptaOnglets';

/**
 * Sous-module « Facture FNE Comptabilité » : file de décision de la comptabilité réelle.
 * Toutes les transactions y arrivent ; on décide facture normalisée (numéro FNE), comptabilité réelle ou corbeille.
 */
export default function FactureFneVuePage() {
  const { vue } = useParams<{ vue: string }>();
  const def = ONGLETS_FNE.find(d => d.slug === vue) || ONGLETS_FNE[0];
  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4">
        <Link href={BASE_FNE} className="lg:hidden -mb-1 inline-flex items-center gap-1 text-[13px] font-medium text-azure">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Facture FNE Comptabilité
        </Link>
        <PageHeader titre={def.libelle} sousTitre="Facture FNE Comptabilité — décidez du sort de chaque transaction" sousTitreMasqueMobile />
        <DecisionsTab key={def.slug} vue={def.slug as 'a-decider' | 'traitees' | 'corbeille'} />
      </div>
    </AppLayout>
  );
}
