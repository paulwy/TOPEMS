/// <reference lib="webworker" />

import type { PrecacheEntry } from 'workbox-precaching';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { logger } from '@/utils/logger';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: PrecacheEntry[];
};

precacheAndRoute(self.__WB_MANIFEST);

// Cache API requests with stale-while-revalidate
registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60,
        maxEntries: 100,
      }),
    ],
  })
);

// Cache static assets with cache-first
registerRoute(
  ({ request }: { request: Request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 50,
      }),
    ],
  })
);

// Handle offline page
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') as Promise<Response>;
      })
    );
  }
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  const syncEvent = event as unknown as {
    tag: string;
    waitUntil: (promise: Promise<unknown>) => void;
  };
  if (syncEvent.tag === 'sync-data') {
    syncEvent.waitUntil(syncData());
  }
});

async function syncData() {
  const queue = await caches.open('sync-queue');
  const requests = await queue.keys();

  for (const request of requests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        await queue.delete(request);
      }
    } catch (error) {
      logger.error('Sync failed:', error);
    }
  }
}
