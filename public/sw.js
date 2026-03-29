// Service Worker v3 - Robusto para SPA (Single Page App)
const CACHE_NAME = 'rifasapp-v3';
const STATIC_ASSETS = ['/index.html', '/manifest.json'];

// En desarrollo no cachear nada
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

self.addEventListener('install', (event) => {
  if (isDev) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // En desarrollo: pasar todo directo a la red
  if (isDev) return;
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── No interceptar peticiones externas (Firebase, APIs, etc.) ──
  if (url.origin !== self.location.origin) return;

  // ── No interceptar recursos con extensiones (JS, CSS, imágenes, etc.) ──
  // Solo manejar navegación SPA (rutas sin extensión)
  const hasExtension = /\.\w{2,5}$/.test(url.pathname);

  if (hasExtension) {
    // Archivos estáticos: cache-first
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('/index.html'));
      })
    );
  } else {
    // Rutas SPA (/admin/ajustes, /tienda/xxx, etc.): network-first, fallback a index.html
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
  }
});
