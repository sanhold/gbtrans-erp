'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-surface-900/90 backdrop-blur border-b border-gray-100 dark:border-surface-800">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-9 h-9 rounded-xl" />
          <span className="font-display font-extrabold text-lg text-gray-900 dark:text-white">GBTRANS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
          <Link href="/#fonctionnalites" className="hover:text-primary-600">Fonctionnalités</Link>
          <Link href="/tarifs" className="hover:text-primary-600">Tarifs</Link>
          <Link href="/#faq" className="hover:text-primary-600">FAQ</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600">Se connecter</Link>
          <Link href="/inscription" className="btn-primary !px-4 !py-2 text-sm">Essai gratuit</Link>
        </div>

        <button onClick={() => setOpen(v => !v)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 dark:border-surface-800 px-5 py-4 space-y-3 bg-white dark:bg-surface-900">
          <Link href="/#fonctionnalites" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-300">Fonctionnalités</Link>
          <Link href="/tarifs" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-300">Tarifs</Link>
          <Link href="/#faq" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 dark:text-gray-300">FAQ</Link>
          <div className="flex gap-3 pt-2">
            <Link href="/auth/login" onClick={() => setOpen(false)} className="btn-secondary !py-2 text-sm flex-1 text-center">Se connecter</Link>
            <Link href="/inscription" onClick={() => setOpen(false)} className="btn-primary !py-2 text-sm flex-1 text-center">Essai gratuit</Link>
          </div>
        </div>
      )}
    </header>
  );
}
