const CACHE_NAME = 'topems-cache-v2';
const RUNTIME_CACHE = 'topems-runtime-v1';
const API_CACHE = 'topems-api-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html',
];

const ASSET_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.eot'];

const MAX_CACHE_SIZE = 50;
const MAX_API_CACHE_SIZE = 20;
const API_CACHE_TTL = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => 
          name.startsWith('topems-') && 
          !(name === CACHE_NAME || name === RUNTIME_CACHE || name === API_CACHE)
        ).map((name) => {
          return caches.delete(name);
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  if (request.method !== 'GET') {
    return;
  }
  
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/ws/')) {
    return;
  }
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithAPICache(request));
    return;
  }
  
  if (ASSET_EXTENSIONS.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(cacheFirstWithRuntime(request));
    return;
  }
  
  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_ASSET') {
    const { url } = event.data;
    if (url) {
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.add(url);
      });
    }
  }
  
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
  }
});

async function cacheFirstWithRuntime(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      await trimCache(RUNTIME_CACHE, MAX_CACHE_SIZE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return await caches.match('/offline.html') || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkFirstWithAPICache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      await trimCache(API_CACHE, MAX_API_CACHE_SIZE);
      const responseToCache = networkResponse.clone();
      const clonedResponse = responseToCache.clone();
      clonedResponse.json().then((data) => {
        cache.put(request, new Response(JSON.stringify({
          data,
          timestamp: Date.now(),
          ttl: API_CACHE_TTL,
        }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }).catch(() => {
        cache.put(request, responseToCache);
      });
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      const cachedData = await cachedResponse.json();
      if (cachedData.timestamp && Date.now() - cachedData.timestamp < cachedData.ttl) {
        return new Response(JSON.stringify(cachedData.data), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'X-Cache': 'offline',
          },
        });
      }
    }
    return await caches.match('/offline.html') || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cache = caches.open(CACHE_NAME);
      cache.then((c) => {
        c.put(request, responseToCache);
      });
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return await networkPromise;
}

async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    const sortedKeys = keys.sort((a, b) => {
      const aUrl = new URL(a.url);
      const bUrl = new URL(b.url);
      return aUrl.pathname.localeCompare(bUrl.pathname);
    });
    
    for (let i = 0; i < keys.length - maxSize; i++) {
      await cache.delete(sortedKeys[i]);
    }
  }
}
