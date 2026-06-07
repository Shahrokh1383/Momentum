const STATIC_CACHE = 'momentum-static-v1';
const API_CACHE = 'momentum-api-v1';
const IMAGE_CACHE = 'momentum-images-v1';
const OFFLINE_PAGE = '/offline.html';

const STATIC_SHELL = [
  '/',
  '/offline.html',
  '/assets/logo.jpg',
  '/assets/logo-192.png',
  '/assets/logo-512.png'
];

// Install: Cache static shell and offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean obsolete caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => ![STATIC_CACHE, API_CACHE, IMAGE_CACHE].includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy routing based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API calls: Network First → Cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 2. Images: Cache First → Network fallback
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 3. JS/CSS: Cache First
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. HTML navigation: Network First → Offline page fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // 5. Default: Cache First
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// Network First strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}