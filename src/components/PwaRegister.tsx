'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // 1. In Local Development: unregister SW and purge caches to prevent Turbopack chunk collisions
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

    // 2. Check if already installed / standalone
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);

      // Check if iOS
      const ua = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(ua);
      setIsIOS(isApple);

      // Check dismissed state in session storage
      const dismissed = sessionStorage.getItem('alineas_pwa_dismissed');
      if (dismissed) return;

      // Listen for Chrome/Android install event
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // If iOS and not standalone, show prompt after a short delay
      if (isApple && !standalone && !dismissed) {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('alineas_pwa_dismissed', 'true');
    }
  }

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <aside
      aria-label="Pemasangan Aplikasi Mobile"
      className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-md">
          <Smartphone className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1">
          <h2 className="text-sm font-bold text-white tracking-tight">Pasang Aplikasi Alineas</h2>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            {isIOS
              ? 'Buka fullscreen tanpa browser bar: Tekan tombol Bagikan (Share) di Safari lalu pilih "Tambahkan ke Layar Utama".'
              : 'Pasang ke layar utama untuk akses cepat scanner kru dan tiket tamu tanpa batas browser.'}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang Sekarang</span>
              </button>
            )}

            {isIOS && (
              <div className="inline-flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-800/60">
                <Share className="w-3 h-3" />
                <span>Bagikan &rarr; Tambah ke Layar Utama</span>
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="h-9 px-3 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Nanti Saja
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          aria-label="Tutup pemberitahuan install"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
