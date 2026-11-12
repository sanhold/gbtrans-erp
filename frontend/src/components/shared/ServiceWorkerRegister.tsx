'use client';

import { useEffect } from 'react';

/** Enregistre le service worker (assets statiques uniquement) en production seulement. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
