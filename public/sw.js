// Service Worker for Napflow PWA
// Use timestamp-based cache name to force cache invalidation on each deployment
const CACHE_VERSION = 'v2-' + Date.now();
const CACHE_NAME = 'napflow-' + CACHE_VERSION;

// Network-first strategy for HTML and JS - always fetch fresh content
// Cache-only for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // For HTML and JS files, use network-first strategy
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.jsx') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network request succeeds, update cache and return response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache as fallback
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets (images, CSS, etc.), use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
        })
    );
  }
});

// Activate event - clean up ALL old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all old napflow caches
          if (cacheName.startsWith('napflow-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

