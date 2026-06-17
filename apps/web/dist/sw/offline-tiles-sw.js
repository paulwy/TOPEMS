self.importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const CACHE_NAME = 'topems-offline-tiles';
const DB_NAME = 'TopemsTileCache';
const DB_VERSION = 1;
const STORE_NAME = 'tiles';

function getDb() {
  return idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('tileKey', 'key', { unique: true });
        store.createIndex('expiry', 'expiry');
      }
    },
  });
}

async function getTileFromCache(key) {
  try {
    const db = await getDb();
    const tile = await db.get(STORE_NAME, key);
    if (tile && tile.expiry > Date.now()) {
      return tile.data;
    }
    return null;
  } catch (error) {
    console.error('[OfflineTileSW] Error reading from cache:', error);
    return null;
  }
}

async function saveTileToCache(key, data, expiry) {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, { key, data, expiry });
  } catch (error) {
    console.error('[OfflineTileSW] Error saving to cache:', error);
  }
}

async function deleteExpiredTiles() {
  try {
    const db = await getDb();
    const expired = await db.getAllFromIndex(STORE_NAME, 'expiry', IDBKeyRange.upperBound(Date.now()));
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const tile of expired) {
      await tx.store.delete(tile.key);
    }
    await tx.done;
  } catch (error) {
    console.error('[OfflineTileSW] Error deleting expired tiles:', error);
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/tiles/') || url.pathname.startsWith('/tile/')) {
    event.respondWith(
      (async () => {
        const cacheKey = url.href;
        const cachedData = await getTileFromCache(cacheKey);
        
        if (cachedData) {
          return new Response(cachedData, {
            headers: { 'Content-Type': 'image/png' },
          });
        }
        
        try {
          const response = await fetch(event.request);
          
          if (response.ok && response.status === 200) {
            const data = await response.clone().blob();
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            await saveTileToCache(cacheKey, data, Date.now() + maxAge);
          }
          
          return response;
        } catch (error) {
          console.error('[OfflineTileSW] Network fetch failed:', error);
          return new Response(null, {
            status: 503,
            statusText: 'Service Unavailable',
          });
        }
      })(),
    );
  }
});

self.addEventListener('message', (event) => {
  const message = event.data;
  
  if (message.type === 'CLEAR_TILE_CACHE') {
    (async () => {
      try {
        const db = await getDb();
        await db.clear(STORE_NAME);
        event.ports[0]?.postMessage({ success: true });
      } catch (error) {
        console.error('[OfflineTileSW] Error clearing cache:', error);
        event.ports[0]?.postMessage({ success: false, error: error.message });
      }
    })();
  } else if (message.type === 'GET_CACHE_SIZE') {
    (async () => {
      try {
        const db = await getDb();
        const count = await db.count(STORE_NAME);
        event.ports[0]?.postMessage({ count });
      } catch (error) {
        console.error('[OfflineTileSW] Error getting cache size:', error);
        event.ports[0]?.postMessage({ count: 0, error: error.message });
      }
    })();
  } else if (message.type === 'DELETE_EXPIRED') {
    deleteExpiredTiles();
  }
});

self.addEventListener('activate', () => {
  deleteExpiredTiles();
});
