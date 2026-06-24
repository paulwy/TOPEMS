/**
 * useOfflineTiles Hook
 *
 * 用于在地图组件中使用离线瓦片
 *
 * 使用方式：
 * ```tsx
 * import { useOfflineTiles } from './useOfflineTiles';
 *
 * function MapComponent() {
 *   const { isSWReady, registerSW, getTileUrl } = useOfflineTiles({
 *     tileDir: '/offline_tiles',  // 瓦片目录，相对于 public
 *   });
 *
 *   // 在地图中使用 getTileUrl 获取瓦片 URL
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface UseOfflineTilesOptions {
  tileDir?: string;
  sources?: string[];
}

interface UseOfflineTilesReturn {
  // Service Worker 状态
  isSWReady: boolean;
  isRegistered: boolean;
  registerSW: () => Promise<void>;

  // 瓦片状态
  cachedTileCount: number;
  isLoading: boolean;

  // 瓦片 URL 获取
  getTileUrl: (source: string, z: number, x: number, y: number) => string | null;

  // 瓦片检查
  isTileCached: (source: string, z: number, x: number, y: number) => Promise<boolean>;

  // 缓存管理
  preloadTiles: (
    tiles: Array<{ source: string; z: number; x: number; y: number }>
  ) => Promise<void>;
  clearCache: () => Promise<void>;
}

const SW_PATH = '/sw/offline-tiles-sw.js';

export function useOfflineTiles(options: UseOfflineTilesOptions = {}): UseOfflineTilesReturn {
  const { tileDir = '/offline_tiles', sources = ['osm', 'amap'] } = options;

  const [isSWReady, setIsSWReady] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [cachedTileCount, setCachedTileCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 检查 Service Worker 是否支持
  const isSWSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  // 注册 Service Worker
  const registerSW = useCallback(async () => {
    if (!isSWSupported) {
      logger.warn('Service Worker is not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/',
      });

      logger.info('[SW] Registered:', registration.scope);

      registration.addEventListener('updatefound', () => {
        logger.info('[SW] New version available');
      });

      setIsRegistered(true);
      setIsSWReady(true);
    } catch (error: unknown) {
      logger.error('[SW] Registration failed:', error);
    }
  }, [isSWSupported]);

  // 获取已缓存的瓦片数量
  const updateCachedCount = useCallback(async () => {
    if (!('indexedDB' in window)) return;

    try {
      const db = await openTileDB();
      const count = await getTileCount(db);
      setCachedTileCount(count);
    } catch (error: unknown) {
      logger.error('Error getting cached tile count:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    if (isSWSupported) {
      // 检查是否已注册
      navigator.serviceWorker.ready.then(() => {
        setIsSWReady(true);
        updateCachedCount();
      });

      // 注册 SW
      registerSW();
    }
  }, [isSWSupported, registerSW, updateCachedCount]);

  // 获取瓦片 URL
  // 优先返回本地路径，如果 Service Worker 已注册则返回原始 URL
  const getTileUrl = useCallback(
    (source: string, z: number, x: number, y: number): string | null => {
      if (!sources.includes(source)) {
        return null;
      }

      // 返回瓦片路径，Service Worker 会拦截并处理
      if (source === 'osm') {
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      } else if (source === 'amap') {
        const s = ['1', '2', '3', '4'][Math.floor(Math.random() * 4)];
        return `https://webrd0${s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${x}&y=${y}&z=${z}`;
      }

      return null;
    },
    [sources]
  );

  // 检查瓦片是否已缓存
  const isTileCached = useCallback(
    async (source: string, z: number, x: number, y: number): Promise<boolean> => {
      if (!('indexedDB' in window)) return false;

      try {
        const db = await openTileDB();
        const key = `${source}:${z}:${x}:${y}`;
        const result = await getTileFromDB(db, key);
        return !!result;
      } catch (error: unknown) {
        logger.error('Error checking tile cache:', error);
        return false;
      }
    },
    []
  );

  // 预加载瓦片
  const preloadTiles = useCallback(
    async (tiles: Array<{ source: string; z: number; x: number; y: number }>): Promise<void> => {
      setIsLoading(true);

      try {
        // 通过 Service Worker 缓存瓦片
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_TILES',
            tiles: tiles.map((t) => ({
              url: getTileUrl(t.source, t.z, t.x, t.y),
              ...t,
            })),
          });
        }

        // 更新计数
        await updateCachedCount();
      } finally {
        setIsLoading(false);
      }
    },
    [getTileUrl, updateCachedCount]
  );

  // 清除缓存
  const clearCache = useCallback(async (): Promise<void> => {
    if (!('indexedDB' in window)) return;

    try {
      const db = await openTileDB();
      await clearTileStore(db);
      setCachedTileCount(0);
      logger.info('[OfflineTiles] Cache cleared');
    } catch (error: unknown) {
      logger.error('Error clearing cache:', error);
    }
  }, []);

  return {
    isSWReady,
    isRegistered,
    registerSW,
    cachedTileCount,
    isLoading,
    getTileUrl,
    isTileCached,
    preloadTiles,
    clearCache,
  };
}

// IndexedDB 操作辅助
const DB_NAME = 'gis_offline_db';
const DB_VERSION = 1;
const TILE_STORE = 'tiles';

function openTileDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TILE_STORE)) {
        db.createObjectStore(TILE_STORE, { keyPath: 'key' });
      }
    };
  });
}

async function getTileCount(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, 'readonly');
    const store = tx.objectStore(TILE_STORE);
    const countRequest = store.count();
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => reject(countRequest.error);
  });
}

async function getTileFromDB(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, 'readonly');
    const store = tx.objectStore(TILE_STORE);
    const getRequest = store.get(key);
    getRequest.onsuccess = () => resolve(getRequest.result);
    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function clearTileStore(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, 'readwrite');
    const store = tx.objectStore(TILE_STORE);
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => reject(clearRequest.error);
  });
}

export { openTileDB, TILE_STORE, DB_NAME };
