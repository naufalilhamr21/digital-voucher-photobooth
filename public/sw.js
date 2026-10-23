// Alineas Studio Photobooth System - Service Worker
const CACHE_NAME = 'alineas-photobooth-v4';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/alineas-logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// Install: pre-cache static icon assets only (never pre-cache HTML pages or JS chunks)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up all old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-http protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // CRITICAL: NEVER intercept or cache Next.js internal chunks, Turbopack, or HMR assets
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('webpack')
  ) {
    return;
  }

  // 1. Navigation / HTML pages & API routes: ALWAYS Network-First
  const isNavigate = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  const isApi = url.pathname.startsWith('/api/');

  if (isNavigate || isApi) {
    event.respondWith(
      fetch(request).catch(async () => {
        // If offline and it's an API request, return JSON error
        if (isApi) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Perangkat sedang offline. Periksa koneksi internet venue.',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        // If offline and navigate, return offline fallback
        return new Response('Offline - Silakan periksa koneksi internet Anda.', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
    );
    return;
  }

  // 2. Only cache static icon, logo, and font assets (never generic scripts)
  const isStaticAsset =
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(png|jpe?g|svg|ico|webp|woff2?)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
