'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LIENS = [
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/#faq', label: 'FAQ' },
];

const lien = 'inline-flex items-center min-h-[44px] rounded hover:text-primary-600 dark:hover:text-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

export default function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b transition-shadow ${scrolled ? 'border-gray-200 dark:border-surface-700 shadow-card' : 'border-transparent'}`}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded">
          <img src="/brand/logo-icon.png" alt="" width={36} height={36} className="w-9 h-9 rounded-xl" />
          <span className="font-display font-extrabold text-lg text-gray-900 dark:text-white">GBTRANS</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-700 dark:text-gray-200">
          {LIENS.map(l => <Link key={l.href} href={l.href} className={lien}>{l.label}</Link>)}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className={`${lien} text-sm font-medium text-gray-700 dark:text-gray-200 px-2`}>Se connecter</Link>
          <Link href="/inscription" className="btn-primary !px-4 !min-h-[44px] text-sm">Essai gratuit</Link>
        </div>

        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
        </button>
      </div>

      {open && (
        <div id="menu-mobile" className="md:hidden border-t border-gray-100 dark:border-surface-800 px-5 py-4 space-y-1 bg-white dark:bg-surface-900 animate-slide-up">
          {LIENS.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`${lien} w-full text-sm font-medium text-gray-700 dark:text-gray-200`}>{l.label}</Link>
          ))}
          <div className="flex gap-3 pt-3">
            <Link href="/auth/login" onClick={() => setOpen(false)} className="btn-secondary !min-h-[44px] text-sm flex-1 text-center">Se connecter</Link>
            <Link href="/inscription" onClick={() => setOpen(false)} className="btn-primary !min-h-[44px] text-sm flex-1 text-center">Essai gratuit</Link>
          </div>
        </div>
      )}
    </header>
  );
}
