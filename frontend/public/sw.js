const CACHE_NAME = 'gay-meet-cache-v3';
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

  // Network-first: siempre intenta traer la versión más reciente (HTML, JS con hash, etc.).
  // Solo cae al cache (para soporte offline) si la red falla.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
