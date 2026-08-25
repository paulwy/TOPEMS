export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
}

/**
 * 清理过期缓存条目
 * - 删除超过 maxAgeSeconds 的条目
 * - 删除非白名单的缓存桶
 */
export async function cleanupCaches(
  whitelist: string[],
  maxAgeSeconds?: number
): Promise<{ deleted: string[]; cleaned: number }> {
  const cacheNames = await caches.keys();
  const deleted: string[] = [];

  // 删除非白名单缓存
  for (const name of cacheNames) {
    if (!whitelist.includes(name)) {
      await caches.delete(name);
      deleted.push(name);
    }
  }

  // 清理过期条目
  let cleaned = 0;
  if (maxAgeSeconds) {
    for (const name of whitelist) {
      try {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        for (const request of requests) {
          const response = await cache.match(request);
          if (!response) continue;
          const dateHeader = response.headers.get('date');
          if (!dateHeader) continue;
          const cachedTime = new Date(dateHeader).getTime();
          if (Date.now() - cachedTime > maxAgeSeconds * 1000) {
            await cache.delete(request);
            cleaned++;
          }
        }
      } catch {
        // 静默失败
      }
    }
  }

  return { deleted, cleaned };
}
