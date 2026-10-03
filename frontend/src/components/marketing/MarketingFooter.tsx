'use client';

import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 dark:border-surface-800 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/brand/logo-icon.png" alt="GBTrans" className="w-7 h-7 rounded-lg" />
          <span className="font-display font-bold text-gray-900 dark:text-white">GBTRANS</span>
          <span className="text-sm text-gray-400">— ERP pour bureaux de transit</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/tarifs" className="hover:text-primary-600">Tarifs</Link>
          <Link href="/inscription" className="hover:text-primary-600">Essai gratuit</Link>
          <Link href="/auth/login" className="hover:text-primary-600">Connexion</Link>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} GBTRANS SARL</p>
      </div>
    </footer>
  );
}
