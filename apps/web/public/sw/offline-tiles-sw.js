/**
 * 离线瓦片 Service Worker
 *
 * 功能：
 * 1. 拦截地图瓦片请求
 * 2. 优先从 IndexedDB 返回缓存的瓦片
 * 3. 如果没有缓存，则从网络获取
 *
 * 使用方式：
 * 1. 在应用入口注册此 Service Worker
 * 2. 预下载瓦片并导入到 IndexedDB
 */

const CACHE_NAME = "gis-offline-tiles-v1";
const TILE_DB_NAME = "gis_offline_db";
const TILE_STORE = "tiles";

// 瓦片URL模板
const TILE_URL_PATTERNS = [
  /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png/,
  /^https:\/\/webrd0\d*\.is\.autonavi\.com\/appmaptile/,
  /^https:\/\/webst0\d*\.is\.autonavi\.com\/appmaptile/,
];

/**
 * 打开 IndexedDB 获取瓦片
 */
async function getTileFromIDB(url) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TILE_DB_NAME);

    request.onerror = () => reject(request.error);

    request.onsuccess = async () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(TILE_STORE)) {
        resolve(null);
        return;
      }

      // 从 URL 解析瓦片坐标
      const tileInfo = parseTileUrl(url);
      if (!tileInfo) {
        resolve(null);
        return;
      }

      const { source, z, x, y } = tileInfo;
      const key = `${source}:${z}:${x}:${y}`;

      try {
        const tx = db.transaction(TILE_STORE, "readonly");
        const store = tx.objectStore(TILE_STORE);
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result.blob);
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      } catch (error) {
        reject(error);
      }
    };
  });
}

/**
 * 解析瓦片 URL 获取坐标信息
 */
function parseTileUrl(url) {
  // OSM 瓦片: https://tile.openstreetmap.org/10/847/507.png
  const osmMatch = url.match(
    /tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png/,
  );
  if (osmMatch) {
    return {
      source: "osm",
      z: parseInt(osmMatch[1], 10),
      x: parseInt(osmMatch[2], 10),
      y: parseInt(osmMatch[3], 10),
    };
  }

  // 高德瓦片: https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=847&y=507&z=10
  const amapMatch = url.match(/webrd0\d*\.is\.autonavi\.com\/appmaptile.*?&z=(\d+)&x=(\d+)&y=(\d+)/);
  if (amapMatch) {
    return {
      source: "amap",
      z: parseInt(amapMatch[1], 10),
      x: parseInt(amapMatch[2], 10),
      y: parseInt(amapMatch[3], 10),
    };
  }

  // 高德卫星图
  const amapSatMatch = url.match(/webst0\d*\.is\.autonavi\.com\/appmaptile.*?style=(\d+)&x=(\d+)&y=(\d+)&z=(\d+)/);
  if (amapSatMatch) {
    return {
      source: "amap_satellite",
      z: parseInt(amapSatMatch[4], 10),
      x: parseInt(amapSatMatch[2], 10),
      y: parseInt(amapSatMatch[3], 10),
    };
  }

  return null;
}

/**
 * Service Worker 安装事件
 */
self.addEventListener("install", (event) => {
  console.log("[SW] Installing offline tile service worker");
  self.skipWaiting();
});

/**
 * Service Worker 激活事件
 */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating offline tile service worker");
  event.waitUntil(clients.claim());
});

/**
 * 拦截请求
 */
self.addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);

  // 只处理瓦片请求
  const isTileRequest = TILE_URL_PATTERNS.some((pattern) =>
    pattern.test(url.href),
  );

  if (!isTileRequest) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // 尝试从 IndexedDB 获取瓦片
        const blob = await getTileFromIDB(url.href);

        if (blob) {
          console.log(`[SW] Tile found in cache: ${url.pathname}`);
          return new Response(blob, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000",
            },
          });
        }

        // 如果没有缓存，则从网络获取
        console.log(`[SW] Tile not in cache, fetching: ${url.pathname}`);
        const response = await fetch(event.request);

        // 可选：缓存新获取的瓦片
        if (response.ok) {
          const responseClone = response.clone();
          // 注意：这里可以异步缓存，但不需要等待
          cacheTile(url.href, responseClone);
        }

        return response;
      } catch (error) {
        console.error(`[SW] Error fetching tile: ${error}`);
        return new Response("Tile not available", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }
    })(),
  );
});

/**
 * 缓存瓦片到 IndexedDB
 */
async function cacheTile(url, response) {
  try {
    const blob = await response.blob();
    const tileInfo = parseTileUrl(url);

    if (!tileInfo) return;

    const db = await openDB();
    const key = `${tileInfo.source}:${tileInfo.z}:${tileInfo.x}:${tileInfo.y}`;

    await db.put(TILE_STORE, {
      key,
      blob,
      metadata: {
        source: tileInfo.source,
        z: tileInfo.z,
        x: tileInfo.x,
        y: tileInfo.y,
        cachedAt: new Date().toISOString(),
        sourceUrl: url,
      },
    });

    console.log(`[SW] Cached tile: ${key}`);
  } catch (error) {
    console.error(`[SW] Error caching tile: ${error}`);
  }
}

/**
 * 打开 IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TILE_DB_NAME);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TILE_STORE)) {
        db.createObjectStore(TILE_STORE, { keyPath: "key" });
      }
    };
  });
}

// 消息处理：允许手动触发缓存
self.addEventListener("message", async (event) => {
  if (event.data.type === "CACHE_TILES") {
    // 可以批量缓存瓦片
    const { tiles } = event.data;
    console.log(`[SW] Caching ${tiles.length} tiles`);

    for (const tile of tiles) {
      try {
        const response = await fetch(tile.url);
        if (response.ok) {
          await cacheTile(tile.url, response);
        }
      } catch (error) {
        console.error(`[SW] Error caching tile ${tile.url}:`, error);
      }
    }

    event.ports[0].postMessage({ success: true });
  }
});
