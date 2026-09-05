// modules/MapModule/OfflineManager.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import type { OfflineConfig, SyncStatus } from '../shared/types';

const DB_NAME = 'gis_offline_db';
const DB_VERSION = 1;
const TILE_STORE = 'tiles';
const DATA_STORE = 'offline_data';
const PENDING_STORE = 'pending_sync';

interface TileKey {
  source: string;
  z: number;
  x: number;
  y: number;
}

// 生成瓦片key字符串用于IDB存储
function tileKeyToString(key: TileKey): string {
  return `${key.source}:${key.z}:${key.x}:${key.y}`;
}

interface PendingItem {
  id: string;
  type: 'evidence' | 'track';
  data: unknown;
  timestamp: number;
  retryCount: number;
}

interface UseOfflineManagerOptions {
  config: OfflineConfig;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
}

interface UseOfflineManagerReturn {
  // 状态
  isOnline: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  downloadedTiles: number;
  storageUsed: number;

  // 瓦片操作
  downloadTiles: (
    bounds: [[number, number], [number, number]],
    zoomLevels: number[]
  ) => Promise<void>;
  clearTiles: () => Promise<void>;
  getTile: (source: string, z: number, x: number, y: number) => Promise<string | null>;

  // 数据操作
  saveOfflineData: (key: string, data: unknown) => Promise<void>;
  getOfflineData: <T>(key: string) => Promise<T | null>;
  clearOfflineData: () => Promise<void>;

  // 同步操作
  addPendingItem: (type: 'evidence' | 'track', data: unknown) => Promise<void>;
  syncPendingItems: () => Promise<void>;

  // 存储管理
  getStorageInfo: () => Promise<{ used: number; quota: number }>;
  clearAllOfflineData: () => Promise<void>;
}

export function useOfflineManager(options: UseOfflineManagerOptions): UseOfflineManagerReturn {
  const { config, onSyncComplete, onSyncError } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: '',
    pendingUploads: 0,
    pendingDownloads: 0,
  });
  const [downloadedTiles, setDownloadedTiles] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);

  const dbRef = useRef<IDBDatabase | null>(null);

  // 初始化 IndexedDB
  const initDB = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        dbRef.current = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建瓦片存储
        if (!db.objectStoreNames.contains(TILE_STORE)) {
          db.createObjectStore(TILE_STORE, { keyPath: 'key' });
        }

        // 创建离线数据存储
        if (!db.objectStoreNames.contains(DATA_STORE)) {
          db.createObjectStore(DATA_STORE, { keyPath: 'key' });
        }

        // 创建待同步项存储
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const store = db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }, []);

  // 监听网络状态
  const syncPendingItems = useCallback(async (): Promise<void> => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);

    try {
      const db = await initDB();

      const tx = db.transaction(PENDING_STORE, 'readonly');
      const request = tx.objectStore(PENDING_STORE).getAll();

      const items = await new Promise<PendingItem[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const item of items) {
        try {
          const endpoint =
            item.type === 'evidence' ? '/gis/api/gis/evidence' : '/gis/api/gis/tracks/positions';

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
          });

          if (response.ok) {
            // 删除已同步的项
            const deleteTx = db.transaction(PENDING_STORE, 'readwrite');
            await deleteTx.objectStore(PENDING_STORE).delete(item.id);

            setSyncStatus((prev) => ({
              ...prev,
              pendingUploads: Math.max(0, prev.pendingUploads - 1),
              lastSyncTime: new Date().toISOString(),
            }));
          } else if (response.status >= 500) {
            // 服务器错误，稍后重试
            throw new Error(`Server error: ${response.status}`);
          }
        } catch {
          // 更新重试计数
          if (item.retryCount < 3) {
            const updateTx = db.transaction(PENDING_STORE, 'readwrite');
            await updateTx.objectStore(PENDING_STORE).put({
              ...item,
              retryCount: item.retryCount + 1,
            });
          }
        }
      }

      onSyncComplete?.();
    } catch (error: unknown) {
      onSyncError?.(error as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, initDB, onSyncComplete, onSyncError]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // 网络恢复时自动同步
      syncPendingItems();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingItems]);

  // 计算瓦片数量
  const getTileCount = useCallback(
    (_bounds: [[number, number], [number, number]], zoomLevels: number[]): number => {
      let count = 0;
      for (const z of zoomLevels) {
        const tilesAtZoom = Math.pow(4, z); // 每个缩放级别4倍
        count += tilesAtZoom;
      }
      return count;
    },
    []
  );

  // 下载瓦片
  const downloadTiles = useCallback(
    async (bounds: [[number, number], [number, number]], zoomLevels: number[]) => {
      const db = await initDB();
      const totalTiles = getTileCount(bounds, zoomLevels);
      let downloaded = 0;

      setSyncStatus((prev) => ({ ...prev, pendingDownloads: totalTiles }));

      for (const z of zoomLevels) {
        // 计算该缩放级别的瓦片范围
        const [southWest, northEast] = bounds;
        const minX = Math.floor(((southWest[1] + 180) / 360) * Math.pow(2, z));
        const maxX = Math.floor(((northEast[1] + 180) / 360) * Math.pow(2, z));
        const minY = Math.floor(
          ((1 -
            Math.log(
              Math.tan((northEast[0] * Math.PI) / 180) +
                1 / Math.cos((northEast[0] * Math.PI) / 180)
            ) /
              Math.PI) /
            2) *
            Math.pow(2, z)
        );
        const maxY = Math.floor(
          ((1 -
            Math.log(
              Math.tan((southWest[0] * Math.PI) / 180) +
                1 / Math.cos((southWest[0] * Math.PI) / 180)
            ) /
              Math.PI) /
            2) *
            Math.pow(2, z)
        );

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            for (const source of config.tileSources) {
              try {
                const tileUrl = getTileUrl(source, z, x, y);
                const response = await fetch(tileUrl);

                if (response.ok) {
                  const blob = await response.blob();
                  const tileKey: TileKey = { source, z, x, y };
                  const keyStr = tileKeyToString(tileKey);

                  const tx = db.transaction(TILE_STORE, 'readwrite');
                  await tx.objectStore(TILE_STORE).put({ key: keyStr, blob });
                  downloaded++;

                  setSyncStatus((prev) => ({
                    ...prev,
                    pendingDownloads: totalTiles - downloaded,
                  }));
                  setDownloadedTiles(downloaded);
                }
              } catch {
                // 单个瓦片下载失败不影响整体
              }
            }
          }
        }
      }
    },
    [config.tileSources, initDB, getTileCount]
  );

  // 获取瓦片URL
  const getTileUrl = (source: string, z: number, x: number, y: number): string => {
    if (source === 'osm') {
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    } else if (source === 'amap') {
      return `https://webst0{s}.is.autonavi.com/appmaptile?style=6&x=${x}&y=${y}&z=${z}`.replace(
        '{s}',
        ['1', '2', '3', '4'][Math.floor(Math.random() * 4)]
      );
    }
    throw new Error(`Unknown tile source: ${source}`);
  };

  // 获取离线瓦片
  const getTile = useCallback(
    async (source: string, z: number, x: number, y: number): Promise<string | null> => {
      const db = await initDB();
      const tileKey: TileKey = { source, z, x, y };
      const keyStr = tileKeyToString(tileKey);

      return new Promise((resolve) => {
        const tx = db.transaction(TILE_STORE, 'readonly');
        const request = tx.objectStore(TILE_STORE).get(keyStr);

        request.onsuccess = () => {
          if (request.result) {
            const url = URL.createObjectURL(request.result.blob);
            resolve(url);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    },
    [initDB]
  );

  // 清除瓦片缓存
  const clearTiles = useCallback(async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(TILE_STORE, 'readwrite');
    await tx.objectStore(TILE_STORE).clear();
    setDownloadedTiles(0);
  }, [initDB]);

  // 保存离线数据
  const saveOfflineData = useCallback(
    async (key: string, data: unknown): Promise<void> => {
      const db = await initDB();
      const tx = db.transaction(DATA_STORE, 'readwrite');
      await tx.objectStore(DATA_STORE).put({ key, data, timestamp: Date.now() });
    },
    [initDB]
  );

  // 获取离线数据
  const getOfflineData = useCallback(
    async <T,>(key: string): Promise<T | null> => {
      const db = await initDB();

      return new Promise((resolve) => {
        const tx = db.transaction(DATA_STORE, 'readonly');
        const request = tx.objectStore(DATA_STORE).get(key);

        request.onsuccess = () => {
          resolve(request.result?.data ?? null);
        };

        request.onerror = () => resolve(null);
      });
    },
    [initDB]
  );

  // 清除离线数据
  const clearOfflineData = useCallback(async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(DATA_STORE, 'readwrite');
    await tx.objectStore(DATA_STORE).clear();
  }, [initDB]);

  // 添加待同步项
  const addPendingItem = useCallback(
    async (type: 'evidence' | 'track', data: unknown): Promise<void> => {
      const db = await initDB();
      const item: PendingItem = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const tx = db.transaction(PENDING_STORE, 'readwrite');
      await tx.objectStore(PENDING_STORE).put(item);

      setSyncStatus((prev) => ({
        ...prev,
        pendingUploads: prev.pendingUploads + 1,
      }));

      // 如果在线，立即尝试同步
      if (isOnline) {
        syncPendingItems();
      }
    },

    [initDB, isOnline, syncPendingItems]
  );

  // 同步待处理项

  // 获取存储信息
  const getStorageInfo = useCallback(async (): Promise<{
    used: number;
    quota: number;
  }> => {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
      };
    }
    return { used: 0, quota: 0 };
  }, []);

  // 清除所有离线数据
  const clearAllOfflineData = useCallback(async (): Promise<void> => {
    const db = await initDB();

    const tx1 = db.transaction(TILE_STORE, 'readwrite');
    await tx1.objectStore(TILE_STORE).clear();

    const tx2 = db.transaction(DATA_STORE, 'readwrite');
    await tx2.objectStore(DATA_STORE).clear();

    const tx3 = db.transaction(PENDING_STORE, 'readwrite');
    await tx3.objectStore(PENDING_STORE).clear();

    setDownloadedTiles(0);
    setSyncStatus({
      lastSyncTime: '',
      pendingUploads: 0,
      pendingDownloads: 0,
    });
  }, [initDB]);

  // 更新存储使用量
  useEffect(() => {
    getStorageInfo().then((info) => setStorageUsed(info.used));
  }, [getStorageInfo, downloadedTiles]);

  return {
    isOnline,
    isSyncing,
    syncStatus,
    downloadedTiles,
    storageUsed,
    downloadTiles,
    clearTiles,
    getTile,
    saveOfflineData,
    getOfflineData,
    clearOfflineData,
    addPendingItem,
    syncPendingItems,
    getStorageInfo,
    clearAllOfflineData,
  };
}

// 瓦片坐标工具函数
export function tileToLatLng(z: number, x: number, y: number): [number, number] {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lng = (x / Math.pow(2, z)) * 360 - 180;
  return [lat, lng];
}

export function latLngToTile(lat: number, lng: number, z: number): [number, number] {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z));
  const y = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
      Math.pow(2, z)
  );
  return [x, y];
}

export function getTileBounds(
  z: number,
  x: number,
  y: number
): [[number, number], [number, number]] {
  const [minLat, minLng] = tileToLatLng(z, x, y);
  const [maxLat, maxLng] = tileToLatLng(z, x + 1, y + 1);
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
