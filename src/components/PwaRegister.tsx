'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    // In Local Development: unregister SW and purge caches to prevent Turbopack chunk collisions
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (isLocalhost) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              caches.delete(key);
            }
          });
        }
      } else {
        // In Production: register Service Worker
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
              reg.update();
            })
            .catch((err) => {
              console.warn('PWA Service Worker registration failed:', err);
            });
        });
      }
    }
  }, []);

  return null;
}

