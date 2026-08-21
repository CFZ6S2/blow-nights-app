const CACHE_NAME = 'darknights-cache-v5';
const STATIC_CACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Solo GET, y nunca interceptar Firebase (Auth/Firestore/Functions/Storage).
  if (request.method !== 'GET' || /googleapis\.com|identitytoolkit|firebaseio\.com|firebasestorage/.test(request.url)) {
    return;
  }

  // Las navegaciones (HTML) ya llevan Cache-Control: no-store desde el hosting;
  // dejamos que el navegador las gestione directamente en vez de duplicar la lógica aquí.
  if (request.mode === 'navigate') {
    return;
  }

  // Network-first para el resto de assets: intenta la red primero y cae al cache
  // (soporte offline) solo si la red falla y hay algo cacheado; nunca deja la
  // respuesta sin resolver, que rompía el fetch con "Failed to convert value to 'Response'".
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => cached || Response.error())
      )
  );
});
