/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, setCatchHandler, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// ============================================
// 1) LIFECYCLE
// ============================================
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ============================================
// 2) PRECACHE (manifest injected at build time by vite-plugin-pwa)
// ============================================
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ============================================
// 3) NAVIGATION ROUTE — SPA shell for ALL non-API routes
//    This is THE critical fix: no allowlist restriction.
// ============================================
const navigationHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [
    /^\/api\//,
    /^\/sanctum\//,
    /^\/offline\.html$/,
    /^\/manifest\.webmanifest$/,
    /^\/sw\.js$/,
    /^\/workbox-.*\.js$/,
    /\.[a-z0-9]+$/i, // any path with a file extension (e.g. .png, .css, .woff2)
  ],
});
registerRoute(navigationRoute);

// ============================================
// 4) RUNTIME CACHING — APIs, images, fonts, styles, scripts
// ============================================

// API GET requests → NetworkFirst (fresh when online, cached when offline)
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Sanctum CSRF → Never cache (security)
registerRoute(
  ({ url }) => url.pathname.startsWith('/sanctum/'),
  new NetworkOnly()
);

// Manifest → StaleWhileRevalidate (must be available offline)
registerRoute(
  ({ url }) => url.pathname === '/manifest.webmanifest',
  new StaleWhileRevalidate({
    cacheName: 'manifest-cache',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Images → CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Fonts → CacheFirst (long-lived)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'font-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Styles & scripts → StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// ============================================
// 5) OFFLINE FALLBACK — Last resort when EVERYTHING fails
// ============================================
const OFFLINE_FALLBACK_URL = '/offline.html';

setCatchHandler(async ({ request }) => {
  // Only serve offline.html for navigation requests
  if (request.destination === 'document') {
    const cache = await caches.open('workbox-precache-v2-' + self.registration.scope);
    const cached = await cache.match(OFFLINE_FALLBACK_URL);
    if (cached) return cached;

    // Fallback: search all caches
    const allCaches = await caches.keys();
    for (const cacheName of allCaches) {
      const c = await caches.open(cacheName);
      const match = await c.match(OFFLINE_FALLBACK_URL);
      if (match) return match;
    }
  }
  return Response.error();
});

// ============================================
// 6) MESSAGE HANDLER — for skipWaiting from client
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});