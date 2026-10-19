'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PlansGrid from '@/components/marketing/PlansGrid';
import Hero from '@/components/marketing/Hero';
import Stats from '@/components/marketing/Stats';
import Modules from '@/components/marketing/Modules';
import Steps from '@/components/marketing/Steps';
import BeforeAfter from '@/components/marketing/BeforeAfter';
import FAQ from '@/components/marketing/FAQ';
import CtaFinal from '@/components/marketing/CtaFinal';
import Reveal from '@/components/marketing/Reveal';
import { saasApi } from '@/lib/api';

const FAQS_DEFAUT = [
  { q: 'Puis-je essayer avant de payer ?', r: 'Oui, chaque formule démarre par 14 jours d’essai gratuit, sans engagement ni carte bancaire requise.' },
  { q: 'Comment se fait le paiement ?', r: 'Par Mobile Money (Orange, MTN, Moov, Wave) via PawaPay, directement depuis votre espace.' },
  { q: 'Mes données sont-elles isolées des autres clients ?', r: 'Oui, chaque bureau de transit dispose de son propre espace, totalement cloisonné des autres.' },
  { q: 'Puis-je changer de formule plus tard ?', r: 'Oui, à tout moment depuis votre espace, sans perte de données.' },
];

const HERO_BADGE_DEFAUT = 'Fait pour les bureaux de transit en Côte d’Ivoire';
const HERO_TITRE_DEFAUT = 'Gérez dossiers, douane et comptabilité OHADA depuis un seul outil';
const HERO_SOUS_TITRE_DEFAUT = 'Le logiciel des bureaux de transit ivoiriens : dossiers, facturation, admissions temporaires, cautions, trésorerie et RH, accessibles partout.';

export default function HomePage() {
  const router = useRouter();
  const [contenu, setContenu] = useState<any>(null);

  // La page s'affiche immédiatement ; la redirection se fait en arrière-plan si un token existe.
  useEffect(() => {
    if (localStorage.getItem('gbtrans_token')) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    saasApi.contenuVitrine().then(r => setContenu(r.data.data)).catch(() => {});
  }, []);

  const faqs = contenu?.faq?.length ? contenu.faq : FAQS_DEFAUT;

  return (
    <div className="min-h-screen bg-canvas dark:bg-surface-900">
      <MarketingNav />
      <main>
        <Hero
          badge={contenu?.heroBadge || HERO_BADGE_DEFAUT}
          titre={contenu?.heroTitre || HERO_TITRE_DEFAUT}
          sousTitre={contenu?.heroSousTitre || HERO_SOUS_TITRE_DEFAUT}
        />
        <Stats />
        <Modules />
        <Steps />
        <BeforeAfter />

        <section id="tarifs" className="max-w-6xl mx-auto px-5 pb-20 scroll-mt-16">
          <Reveal className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Une formule pour chaque taille de bureau</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-3">Commencez gratuitement, évoluez quand vous en avez besoin.</p>
          </Reveal>
          <PlansGrid />
        </section>

        <FAQ faqs={faqs} />
        <CtaFinal />
      </main>
      <MarketingFooter />
    </div>
  );
}
