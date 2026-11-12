'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EntrepriseSection from '@/components/parametres/EntrepriseSection';
import { EmailSection, SmsSection } from '@/components/parametres/EmailSmsSections';
import UtilisateursSection from '@/components/parametres/UtilisateursSection';
import ProfilsSection from '@/components/parametres/ProfilsSection';
import NumerotationSection from '@/components/parametres/NumerotationSection';
import SauvegardeSection from '@/components/parametres/SauvegardeSection';

const tabs = [
  { id: 'entreprise', label: 'Entreprise', hint: 'Identité, logo, activités, documents' },
  { id: 'utilisateurs', label: 'Utilisateurs', hint: 'Comptes et accès' },
  { id: 'profils', label: 'Profils & Permissions', hint: 'Droits par profil' },
  { id: 'numerotation', label: 'Numérotation', hint: 'Préfixes et compteurs' },
  { id: 'email', label: 'Email / SMTP', hint: 'Envoi des emails' },
  { id: 'sms', label: 'SMS', hint: 'API Orange' },
  { id: 'sauvegarde', label: 'Sauvegarde', hint: 'Export automatique des données' },
];

const linkTabs = [
  { href: '/parametres/catalogue-prestations', label: 'Catalogue des prestations' },
  { href: '/parametres/modeles-courrier', label: 'Modèles de courrier' },
  { href: '/parametres/processus', label: 'Processus de suivi' },
];

const Chevron = () => (
  <svg aria-hidden="true" className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
);

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const maj = () => setDesktop(mq.matches);
    maj();
    mq.addEventListener('change', maj);
    return () => mq.removeEventListener('change', maj);
  }, []);
  return desktop;
}

function Section({ id }: { id: string }) {
  switch (id) {
    case 'entreprise': return <EntrepriseSection />;
    case 'utilisateurs': return <UtilisateursSection />;
    case 'profils': return <ProfilsSection />;
    case 'numerotation': return <NumerotationSection />;
    case 'email': return <EmailSection />;
    case 'sms': return <SmsSection />;
    case 'sauvegarde': return <SauvegardeSection />;
    default: return null;
  }
}

/**
 * Mobile : navigation « Réglages » (liste de rubriques -> détail avec bouton retour).
 * Bureau (>=1024px) : menu latéral + contenu côte à côte, « Entreprise » ouvert par défaut.
 */
export default function ParametresPage() {
  const isDesktop = useIsDesktop();
  const [active, setActive] = useState<string | null>(null);
  const current = active ?? (isDesktop ? 'entreprise' : null);
  const currentTab = tabs.find(t => t.id === current);

  // Revient en haut de page à chaque changement de rubrique (mobile)
  useEffect(() => { if (!isDesktop) window.scrollTo?.({ top: 0 }); }, [active, isDesktop]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className={current ? 'hidden lg:block' : ''}>
          <PageHeader title="Paramètres" subtitle="Configuration générale de l'application" className="!mb-0" />
        </div>

        <div className="lg:flex lg:gap-6">
          {/* Liste des rubriques */}
          <nav aria-label="Rubriques des paramètres" className={`lg:w-60 lg:flex-shrink-0 ${current ? 'hidden lg:block' : ''}`}>
            <ul className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 divide-y divide-gray-100 dark:divide-surface-700 overflow-hidden lg:border-0 lg:bg-transparent lg:divide-y-0 lg:space-y-1 lg:overflow-visible">
              {tabs.map(tab => (
                <li key={tab.id}>
                  <button
                    type="button" onClick={() => setActive(tab.id)} aria-current={current === tab.id ? 'page' : undefined}
                    className={`w-full flex items-center justify-between gap-3 text-left px-4 min-h-[56px] lg:min-h-[44px] lg:rounded-lg text-[15px] lg:text-sm font-medium transition-colors ${current === tab.id ? 'lg:bg-primary-50 lg:text-primary-600 dark:lg:bg-primary-900/30 dark:lg:text-primary-400' : 'text-gray-800 dark:text-gray-200 lg:text-gray-600 lg:hover:bg-gray-50 dark:lg:text-gray-400 dark:lg:hover:bg-surface-700'}`}
                  >
                    <span className="min-w-0">
                      <span className="block">{tab.label}</span>
                      <span className="block lg:hidden text-xs font-normal text-gray-600 dark:text-gray-400">{tab.hint}</span>
                    </span>
                    <span className="lg:hidden"><Chevron /></span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="lg:hidden text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400 mt-5 mb-2 px-1">Autres réglages</p>
            <ul className="mt-0 lg:mt-3 lg:pt-3 lg:border-t border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 lg:bg-transparent rounded-xl lg:rounded-none border lg:border-x-0 lg:border-b-0 divide-y divide-gray-100 dark:divide-surface-700 lg:divide-y-0 lg:space-y-1 overflow-hidden lg:overflow-visible">
              {linkTabs.map(tab => (
                <li key={tab.href}>
                  <Link href={tab.href} className="flex items-center justify-between w-full text-left px-4 min-h-[56px] lg:min-h-[44px] lg:rounded-lg text-[15px] lg:text-sm font-medium text-gray-800 dark:text-gray-200 lg:text-gray-600 lg:hover:bg-gray-50 dark:lg:text-gray-400 dark:lg:hover:bg-surface-700 transition-colors">
                    {tab.label}
                    <Chevron />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Détail de la rubrique */}
          {current && (
            <div className="flex-1 min-w-0">
              <div className="lg:hidden flex items-center gap-1 mb-3 -ml-2">
                <button
                  type="button" onClick={() => setActive(null)} aria-label="Retour aux paramètres"
                  className="flex items-center gap-1 min-h-[44px] px-2 rounded-lg text-primary-600 dark:text-primary-300 font-medium"
                >
                  <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Paramètres
                </button>
                <h1 className="flex-1 text-center pr-24 font-display font-bold text-base truncate">{currentTab?.label}</h1>
              </div>
              <div className="card !p-4 sm:!p-6">
                <Section id={current} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
