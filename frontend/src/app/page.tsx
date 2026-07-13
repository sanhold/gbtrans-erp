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
        <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">GB</span>
        </div>
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  );
}
