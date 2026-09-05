'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('gbtrans_token');
    router.push(token ? '/dashboard' : '/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <img src="/brand/logo-icon.png" alt="GBTrans" className="w-16 h-16 rounded-2xl" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  );
}
