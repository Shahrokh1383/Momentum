const STATIC_CACHE = 'momentum-static-v2';
const API_CACHE = 'momentum-api-v1';
const IMAGE_CACHE = 'momentum-images-v1';
const OFFLINE_PAGE = '/offline.html';

// KISS: Environment detection to protect Vite HMR in development
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Install: Attempt to cache static shell, but DO NOT fail if it rejects
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static shell');
        // CRITICAL FIX: Catch addAll so the SW still installs even if Vite blocks pre-caching
        return cache.addAll([OFFLINE_PAGE]).catch((err) => {
          console.warn('[SW] Pre-caching offline.html failed (Normal in Vite Dev Mode):', err);
        });
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate: Clean obsolete caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => ![STATIC_CACHE, API_CACHE, IMAGE_CACHE].includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch: Strategy routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // API calls: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Images: Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // JS/CSS/Fonts: Cache First (Skip in Dev to protect Vite HMR)
  if (['script', 'style', 'font'].includes(request.destination) && !isDev) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigation: Network First → Offline page fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful HTML responses in Production
          if (response && response.ok && !isDev) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] Network failed, serving offline page');
          return caches.match(OFFLINE_PAGE)
            .then((cached) => {
              if (cached) return cached;
              
              // Ultimate fallback if offline.html failed to pre-cache (Common in Dev)
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
            });
        })
    );
    return;
  }

  // Default: Cache First (Skip in Dev)
  if (!isDev) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) { throw error; }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}