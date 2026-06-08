const STATIC_CACHE = 'momentum-static-v2';
const API_CACHE = 'momentum-api-v1';
const IMAGE_CACHE = 'momentum-images-v1';
const OFFLINE_PAGE = '/offline.html';

const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_PAGE]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore WebSockets, Dev server polling, and Cross-Origin requests
  if (
    request.url.startsWith('ws:') || 
    request.url.startsWith('wss:') || 
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 2. API calls: Network First
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      return;
    }

    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 3. Images: Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 4. HTML Navigation (SPA Routing)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 5. All other GET requests (Scripts, Styles, Fonts, Vite TSX Modules)
  // Dev: Network First ensures HMR works online, but boots React offline.
  // Prod: Cache First ensures fast load times.
  if (request.method === 'GET') {
    if (isDev) {
      event.respondWith(networkFirst(request, STATIC_CACHE));
    } else {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    }
  }
});

// --- SRP: Dedicated Strategy Functions ---

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const clone = networkResponse.clone();
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, clone.clone());
      await cache.put('/', clone); 
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed. Attempting SPA fallback...');
    const cache = await caches.open(STATIC_CACHE);

    const cachedRequest = await cache.match(request);
    if (cachedRequest) return cachedRequest;

    const cachedRoot = await cache.match('/');
    if (cachedRoot) return cachedRoot;

    const cachedOffline = await cache.match(OFFLINE_PAGE);
    if (cachedOffline) return cachedOffline;

    return getInlineOfflineResponse();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response(null, { status: 408, statusText: 'Offline and not cached' });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      // In Vite dev mode, files often change. We overwrite the cache silently.
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // ignoreSearch is added to handle Vite's dynamic cache-busting queries (?t=12345)
    const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
    if (cached) return cached;

    const cachedByUrl = await cache.match(request.url, { ignoreVary: true, ignoreSearch: true });
    if (cachedByUrl) return cachedByUrl;

    throw error;
  }
}

function getInlineOfflineResponse() {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title>' +
    '<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;' +
    'min-height:100vh;margin:0;background:#0f172a;color:#fff;text-align:center}' +
    '.card{background:rgba(255,255,255,0.1);padding:2rem;border-radius:16px}' +
    'h1{margin:0 0 1rem}button{background:#11998e;color:#fff;border:none;padding:0.75rem 1.5rem;' +
    'border-radius:8px;cursor:pointer;font-weight:600}</style></head>' +
    '<body><div class="card"><h1>📡 You are Offline</h1>' +
    '<p>Please check your connection and try again.</p>' +
    '<button onclick="location.reload()">Try Again</button></div></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}