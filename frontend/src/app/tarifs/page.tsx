'use client';

import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PlansGrid from '@/components/marketing/PlansGrid';

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-900">
      <MarketingNav />
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-extrabold text-gray-900 dark:text-white">Des tarifs simples et transparents</h1>
          <p className="text-gray-500 mt-2">Toutes les formules incluent 14 jours d&apos;essai gratuit. Paiement par Mobile Money.</p>
        </div>
        <PlansGrid />
      </section>
      <MarketingFooter />
    </div>
  );
}
