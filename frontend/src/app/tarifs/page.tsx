'use client';

import { useEffect, useState } from 'react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PlansGrid from '@/components/marketing/PlansGrid';
import { saasApi } from '@/lib/api';

const TITRE_DEFAUT = 'Des tarifs simples et transparents';
const SOUS_TITRE_DEFAUT = 'Toutes les formules incluent 14 jours d\'essai gratuit. Paiement par Mobile Money.';

export default function TarifsPage() {
  const [contenu, setContenu] = useState<any>(null);

  useEffect(() => {
    saasApi.contenuVitrine().then(r => setContenu(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-surface-900">
      <MarketingNav />
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-extrabold text-gray-900 dark:text-white">{contenu?.tarifsTitre || TITRE_DEFAUT}</h1>
          <p className="text-gray-500 mt-2">{contenu?.tarifsSousTitre || SOUS_TITRE_DEFAUT}</p>
        </div>
        <PlansGrid />
      </section>
      <MarketingFooter />
    </div>
  );
}
