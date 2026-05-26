const CACHE_NAME = 'vinyl-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/home.html',
  '/search.html',
  '/timeline.html',
  '/profile.html',
  '/wrapped.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            const cloned = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });

            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
