/// <reference lib="webworker" />

import type { PrecacheEntry } from 'workbox-precaching';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { logger } from '@/utils/logger';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: PrecacheEntry[];
};

precacheAndRoute(self.__WB_MANIFEST);

const appShellUrls = ['/', '/dashboard', '/login'];

const CACHE_NAME = {
  PRECACHE: 'topems-precache',
  API: 'topems-api',
  STATIC: 'topems-static',
  IMAGES: 'topems-images',
  FONT: 'topems-fonts',
  SYNC_QUEUE: 'topems-sync-queue',
};

// Navigation route - SPA fallback
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  allowlist: [/^\/(?!api\/)/],
});
registerRoute(navigationRoute);

// API requests - Stale-While-Revalidate with different TTLs
registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAME.API,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60,
        maxEntries: 200,
      }),
    ],
  })
);

// Static assets - Cache First
registerRoute(
  ({ request }: { request: Request }) =>
    request.destination === 'style' || request.destination === 'script',
  new CacheFirst({
    cacheName: CACHE_NAME.STATIC,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 100,
      }),
    ],
  })
);

// Images - Cache First with larger cache
registerRoute(
  ({ request }: { request: Request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAME.IMAGES,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 24 * 60 * 60,
        maxEntries: 200,
      }),
    ],
  })
);

// Fonts - Cache First
registerRoute(
  ({ url }: { url: URL }) =>
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.otf'),
  new CacheFirst({
    cacheName: CACHE_NAME.FONT,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 365 * 24 * 60 * 60,
        maxEntries: 50,
      }),
    ],
  })
);

// Offline fallback for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME.PRECACHE);
        const cachedResponse = await cache.match('/index.html');
        return cachedResponse || new Response(null, { status: 503 });
      })
    );
  }
});

// Background sync for failed requests
interface SyncRequest {
  request: Request;
  timestamp: number;
}

self.addEventListener('sync', (event) => {
  const syncEvent = event as unknown as {
    tag: string;
    waitUntil: (promise: Promise<unknown>) => void;
  };

  if (syncEvent.tag === 'sync-data') {
    syncEvent.waitUntil(syncData());
  }
});

async function syncData(): Promise<void> {
  const queue = await caches.open(CACHE_NAME.SYNC_QUEUE);
  const requests = await queue.keys();

  for (const request of requests) {
    try {
      const cachedResponse = await queue.match(request);
      if (cachedResponse) {
        const syncRequest: SyncRequest = await cachedResponse.json();
        const response = await fetch(syncRequest.request);
        if (response.ok) {
          await queue.delete(request);
          logger.info('Sync successful:', request.url);
        }
      }
    } catch (error: unknown) {
      logger.error('Sync failed:', error);
    }
  }
}

// Notification handling
self.addEventListener('push', (event) => {
  const pushEvent = event as unknown as {
    data: { json: () => unknown };
    waitUntil: (promise: Promise<unknown>) => void;
  };

  const payload =
    (pushEvent.data?.json() as { title?: string; body?: string; data?: Record<string, unknown> }) ||
    {};
  const title = payload.title || 'TOPEMS 通知';
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: payload.data || {},
  };

  pushEvent.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const notificationEvent = event as unknown as {
    notification: Notification & { data?: Record<string, unknown> };
    waitUntil: (promise: Promise<unknown>) => void;
  };

  notificationEvent.notification.close();

  const url = notificationEvent.notification.data?.url || '/dashboard';
  notificationEvent.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        self.clients.openWindow(url);
      }
    })
  );
});

// Message handling from client
self.addEventListener('message', (event) => {
  const messageEvent = event as unknown as {
    data: { type: string; payload?: unknown };
    source: Client;
  };

  switch (messageEvent.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_URLS':
      if (messageEvent.data.payload) {
        const urls = messageEvent.data.payload as string[];
        caches.open(CACHE_NAME.PRECACHE).then((cache) => cache.addAll(urls));
      }
      break;
    case 'CLEAR_CACHE':
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((name) => caches.delete(name));
      });
      break;
    case 'ADD_TO_SYNC_QUEUE':
      if (messageEvent.data.payload) {
        const syncRequest: SyncRequest = messageEvent.data.payload as SyncRequest;
        caches.open(CACHE_NAME.SYNC_QUEUE).then((cache) => {
          cache.put(
            new Request(`/sync/${Date.now()}`, { method: 'POST' }),
            new Response(JSON.stringify(syncRequest), {
              headers: { 'Content-Type': 'application/json' },
            })
          );
        });
      }
      break;
    default:
      break;
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const activateEvent = event as unknown as {
    waitUntil: (promise: Promise<unknown>) => void;
  };

  const currentCaches = Object.values(CACHE_NAME);
  activateEvent.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});
