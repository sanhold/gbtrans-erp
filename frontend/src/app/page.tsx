'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PlansGrid from '@/components/marketing/PlansGrid';
import { saasApi } from '@/lib/api';

const MODULES = [
  { titre: 'Dossiers & suivi', desc: 'Import, export, transit — du dossier physique à la facturation, avec suivi des étapes et alertes.', icon: 'M4 4h6l2 2h8v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
  { titre: 'Offres, proforma & facturation', desc: 'De la proposition commerciale à la facture, avec génération de documents PDF professionnels.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { titre: 'Comptabilité OHADA', desc: 'Plan comptable SYSCOHADA, écritures automatiques et manuelles, grand livre, balance, bilan.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4' },
  { titre: 'Admissions temporaires & cautions', desc: 'Suivi des échéances, alertes avant expiration, apurement et historique complet.', icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z' },
  { titre: 'Finance & trésorerie', desc: 'Caisses, comptes bancaires, dépenses, rapprochement bancaire, créances et dettes.', icon: 'M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.2-5 1.3-5 3.6 0 1.1 1 1.8 2.5 1.8s2.5-.6 2.5-1.6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { titre: 'RH & paie', desc: 'Dossiers employés, contrats, bulletins de paie générés automatiquement.', icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
];

const FAQS_DEFAUT = [
  { q: 'Puis-je essayer avant de payer ?', r: 'Oui, chaque formule démarre par 14 jours d’essai gratuit, sans engagement ni carte bancaire requise.' },
  { q: 'Comment se fait le paiement ?', r: 'Par Mobile Money (Orange, MTN, Moov, Wave) via PawaPay, directement depuis votre espace.' },
  { q: 'Mes données sont-elles isolées des autres clients ?', r: 'Oui, chaque bureau de transit dispose de son propre espace, totalement cloisonné des autres.' },
  { q: 'Puis-je changer de formule plus tard ?', r: 'Oui, à tout moment depuis votre espace, sans perte de données.' },
];

const HERO_BADGE_DEFAUT = 'Fait pour les bureaux de transit en Côte d\'Ivoire';
const HERO_TITRE_DEFAUT = 'Le logiciel de gestion pour votre bureau de transit';
const HERO_SOUS_TITRE_DEFAUT = 'Dossiers, facturation, comptabilité OHADA, admissions temporaires, cautions, RH — tout en un seul endroit, accessible depuis n\'importe où.';

export default function HomePage() {
  const router = useRouter();
  const [verifie, setVerifie] = useState(false);
  const [contenu, setContenu] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('gbtrans_token');
    if (token) { router.push('/dashboard'); return; }
    setVerifie(true);
  }, [router]);

  useEffect(() => {
    saasApi.contenuVitrine().then(r => setContenu(r.data.data)).catch(() => {});
  }, []);

  if (!verifie) return null;

  const faqs = contenu?.faq?.length ? contenu.faq : FAQS_DEFAUT;

  return (
    <div className="min-h-screen bg-white dark:bg-surface-900">
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold mb-5">
          {contenu?.heroBadge || HERO_BADGE_DEFAUT}
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white max-w-3xl mx-auto leading-tight">
          {contenu?.heroTitre || HERO_TITRE_DEFAUT}
        </h1>
        <p className="mt-5 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          {contenu?.heroSousTitre || HERO_SOUS_TITRE_DEFAUT}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/inscription" className="btn-primary !px-6 !py-3 text-sm">Démarrer l&apos;essai gratuit — 14 jours</Link>
          <Link href="/tarifs" className="btn-secondary !px-6 !py-3 text-sm">Voir les tarifs</Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">Sans engagement · Sans carte bancaire</p>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="max-w-6xl mx-auto px-5 py-16 scroll-mt-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-extrabold text-gray-900 dark:text-white">Tout votre bureau, dans un seul outil</h2>
          <p className="text-gray-500 mt-2">Conçu à partir des besoins réels d&apos;un bureau de transit ivoirien.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map(m => (
            <div key={m.titre} className="card">
              <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={m.icon} /></svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">{m.titre}</h3>
              <p className="text-sm text-gray-500">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tarifs (apercu) */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-extrabold text-gray-900 dark:text-white">Une formule pour chaque taille de bureau</h2>
          <p className="text-gray-500 mt-2">Commencez gratuitement, évoluez quand vous en avez besoin.</p>
        </div>
        <PlansGrid />
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-16 scroll-mt-16">
        <h2 className="font-display text-3xl font-extrabold text-gray-900 dark:text-white text-center mb-10">Questions fréquentes</h2>
        <div className="space-y-4">
          {faqs.map((f: any) => (
            <div key={f.q} className="card !p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5">{f.q}</h3>
              <p className="text-sm text-gray-500">{f.r}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-4xl mx-auto px-5 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 text-center py-14 px-6">
          <h2 className="font-display text-3xl font-extrabold text-white">Prêt à moderniser votre bureau de transit ?</h2>
          <p className="text-white/80 mt-2 mb-7">14 jours d&apos;essai gratuit, sans engagement.</p>
          <Link href="/inscription" className="inline-block bg-white text-primary-700 font-semibold px-7 py-3 rounded-lg text-sm hover:bg-gray-100 transition-colors">
            Créer mon compte gratuitement
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
