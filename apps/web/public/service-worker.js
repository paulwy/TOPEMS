const CACHE_NAME = 'topems-cache-v3';
const RUNTIME_CACHE = 'topems-runtime-v2';
const API_CACHE = 'topems-api-v2';
const IMAGE_CACHE = 'topems-images-v1';
const FONT_CACHE = 'topems-fonts-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html',
];

const ASSET_EXTENSIONS = ['.js', '.css'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];
const FONT_EXTENSIONS = ['.woff', '.woff2', '.ttf', '.eot'];

const MAX_CACHE_SIZE = 100;
const MAX_API_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 30;
const MAX_FONT_CACHE_SIZE = 20;
const API_CACHE_TTL = 5 * 60 * 1000;
const IMAGE_CACHE_TTL = 24 * 60 * 60 * 1000;
const FONT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const STALE_WHILE_REVALIDATE_PATHS = ['/api/health', '/api/auth/me'];

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
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => 
          name.startsWith('topems-') && !currentCaches.includes(name)
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
    if (STALE_WHILE_REVALIDATE_PATHS.some(path => url.pathname.startsWith(path))) {
      event.respondWith(staleWhileRevalidate(request));
    } else {
      event.respondWith(networkFirstWithAPICache(request));
    }
    return;
  }
  
  if (IMAGE_EXTENSIONS.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(cacheFirstWithTTL(request, IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE, IMAGE_CACHE_TTL));
    return;
  }
  
  if (FONT_EXTENSIONS.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(cacheFirstWithTTL(request, FONT_CACHE, MAX_FONT_CACHE_SIZE, FONT_CACHE_TTL));
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
  
  if (event.data && event.data.type === 'CACHE_IMAGES') {
    const { urls } = event.data;
    if (urls && Array.isArray(urls)) {
      caches.open(IMAGE_CACHE).then((cache) => {
        urls.forEach(url => {
          cache.add(url).catch(() => {});
        });
      });
    }
  }
  
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
  }
  
  if (event.data && event.data.type === 'PRECACHE_ASSETS') {
    const { assets } = event.data;
    if (assets && Array.isArray(assets)) {
      caches.open(CACHE_NAME).then((cache) => {
        cache.addAll(assets).catch(() => {});
      });
    }
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0]?.postMessage(stats);
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

async function cacheFirstWithTTL(request, cacheName, maxSize, ttl) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    const cachedData = await cachedResponse.json().catch(() => ({ timestamp: 0 }));
    if (!cachedData.timestamp || Date.now() - cachedData.timestamp < ttl) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      await trimCache(cacheName, maxSize);
      
      const responseToCache = networkResponse.clone();
      const blob = await responseToCache.blob();
      
      cache.put(request, new Response(blob, {
        headers: networkResponse.headers,
      }));
      
      const metaCache = await caches.open(`${cacheName}-meta`);
      metaCache.put(request.url, new Response(JSON.stringify({
        timestamp: Date.now(),
        ttl,
      }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', {
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
      const cachedData = await cachedResponse.json().catch(() => ({ timestamp: 0, data: null }));
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
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
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
    const keyData = await Promise.all(keys.map(async (key) => {
      const response = await cache.match(key);
      const metaCache = await caches.open(`${cacheName}-meta`);
      const metaResponse = await metaCache.match(key.url);
      let timestamp = Date.now();
      
      if (metaResponse) {
        const metaData = await metaResponse.json().catch(() => ({ timestamp: Date.now() }));
        timestamp = metaData.timestamp || Date.now();
      } else if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          timestamp = new Date(dateHeader).getTime();
        }
      }
      
      return { key, timestamp };
    }));
    
    keyData.sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < keyData.length - maxSize; i++) {
      await cache.delete(keyData[i].key);
      const metaCache = await caches.open(`${cacheName}-meta`);
      await metaCache.delete(keyData[i].key.url);
    }
  }
}

async function getCacheStats() {
  const cacheNames = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE];
  const stats = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = {
      size: keys.length,
      maxSize: name === CACHE_NAME ? MAX_CACHE_SIZE :
               name === RUNTIME_CACHE ? MAX_CACHE_SIZE :
               name === API_CACHE ? MAX_API_CACHE_SIZE :
               name === IMAGE_CACHE ? MAX_IMAGE_CACHE_SIZE :
               MAX_FONT_CACHE_SIZE,
    };
  }
  
  return stats;
}