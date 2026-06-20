/**
 * 预下载瓦片导入工具
 *
 * 功能：将 offline_tiles 目录下的瓦片导入到 IndexedDB
 *
 * 使用方式：
 * 1. 先运行 tile-manifest.js 生成瓦片清单
 * 2. 在浏览器控制台或通过 importTilesFromManifest() 导入
 */

import { openDB } from "idb";
import { logger } from "@/utils/logger";

const DB_NAME = "gis_offline_db";
const DB_VERSION = 1;
const TILE_STORE = "tiles";

interface TileManifest {
  version: string;
  source: string;
  bounds: [[number, number], [number, number]];
  zoomLevels: number[];
  tileCount: number;
  tiles: Array<{
    z: number;
    x: number;
    y: number;
    path: string;
    size: number;
  }>;
  generatedAt: string;
}

/**
 * 打开 IndexedDB
 */
async function openTileDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(TILE_STORE)) {
        db.createObjectStore(TILE_STORE, { keyPath: "key" });
      }
    },
  });
}

/**
 * 从 Manifest 导入瓦片到 IndexedDB
 * @param manifest 瓦片清单
 * @param basePath 瓦片文件夹的基础路径
 * @param onProgress 进度回调
 */
export async function importTilesFromManifest(
  manifest: TileManifest,
  basePath: string = "./offline_tiles",
  onProgress?: (current: number, total: number, tile: string) => void,
): Promise<{ success: number; failed: number }> {
  const db = await openTileDB();
  let success = 0;
  let failed = 0;

  for (let i = 0; i < manifest.tiles.length; i++) {
    const tile = manifest.tiles[i];
    const key = `${manifest.source}:${tile.z}:${tile.x}:${tile.y}`;

    try {
      // 尝试从本地路径加载瓦片
      const response = await fetch(`${basePath}/${tile.path}`);

      if (response.ok) {
        const blob = await response.blob();

        await db.put(TILE_STORE, {
          key,
          blob,
          metadata: {
            z: tile.z,
            x: tile.x,
            y: tile.y,
            source: manifest.source,
            importedAt: new Date().toISOString(),
          },
        });

        success++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      logger.warn(`Failed to import tile ${key}:`, error);
    }

    if (onProgress) {
      onProgress(i + 1, manifest.tiles.length, key);
    }
  }

  return { success, failed };
}

/**
 * 获取 IndexedDB 中已存储的瓦片数量
 */
export async function getStoredTileCount(): Promise<number> {
  const db = await openTileDB();
  return db.count(TILE_STORE);
}

/**
 * 检查特定瓦片是否已缓存
 */
export async function isTileCached(
  source: string,
  z: number,
  x: number,
  y: number,
): Promise<boolean> {
  const db = await openTileDB();
  const key = `${source}:${z}:${x}:${y}`;
  const result = await db.get(TILE_STORE, key);
  return !!result;
}

/**
 * 清除所有缓存的瓦片
 */
export async function clearAllTiles(): Promise<void> {
  const db = await openTileDB();
  await db.clear(TILE_STORE);
}

/**
 * 获取缓存的瓦片信息
 */
export async function getTileCacheInfo(): Promise<{
  count: number;
  sources: string[];
  zoomLevels: number[];
}> {
  const db = await openTileDB();
  const allTiles = await db.getAll(TILE_STORE);

  const sources = new Set<string>();
  const zoomLevels = new Set<number>();

  for (const tile of allTiles) {
    if (tile.metadata) {
      sources.add(tile.metadata.source);
      zoomLevels.add(tile.metadata.z);
    }
  }

  return {
    count: allTiles.length,
    sources: Array.from(sources),
    zoomLevels: Array.from(zoomLevels).sort((a, b) => a - b),
  };
}

/**
 * 导出为可使用的离线瓦片提供器 (用于 Leaflet 等地图库)
 */
export function createOfflineTileProvider(
  source: string,
  getTile: (
    source: string,
    z: number,
    x: number,
    y: number,
  ) => Promise<string | null>,
) {
  return function (tileCoord: [number, number, number]): string {
    const [z, x, y] = tileCoord;

    // 返回占位符 URL，实际瓦片通过 getTile 获取
    return `offline://${source}/${z}/${x}/${y}`;
  };
}

// 浏览器控制台暴露的全局函数
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).gisOffline = {
    importTilesFromManifest,
    getStoredTileCount,
    isTileCached,
    clearAllTiles,
    getTileCacheInfo,
  };
}

logger.info(
  "离线瓦片工具已加载。使用 gisOffline.importTilesFromManifest(manifest) 导入瓦片。",
);
