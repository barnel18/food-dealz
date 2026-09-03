'use client';

import { useEffect } from 'react';

/** Registers the service worker in production builds only. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      /* offline shell is a progressive enhancement */
    });
  }, []);
  return null;
}
