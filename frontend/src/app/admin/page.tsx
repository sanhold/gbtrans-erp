'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { platformAuth } from '@/lib/platformApi';

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.push(platformAuth.isAuthenticated() ? '/admin/societes' : '/admin/login');
  }, [router]);
  return null;
}
