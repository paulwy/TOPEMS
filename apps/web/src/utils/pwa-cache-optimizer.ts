/**
 * PWA 缓存策略工具
 * 提供智能预缓存、stale-while-revalidate 优化和缓存命中率统计
 */

export type CacheStrategy = 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate' | 'networkOnly' | 'cacheOnly';

export interface RouteCacheConfig {
  /** 缓存名称 */
  cacheName: string;
  /** 缓存策略 */
  strategy: CacheStrategy;
  /** 缓存最大条目数 */
  maxEntries?: number;
  /** 缓存最大时间（秒） */
  maxAgeSeconds?: number;
  /** 网络超时（秒） */
  networkTimeoutSeconds?: number;
  /** 是否缓存 POST/PUT 请求 */
  cacheableMethods?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
}

/**
 * 缓存命中率统计
 */
export class CacheStatsTracker {
  private hits = 0;
  private misses = 0;
  private errors = 0;
  private totalRequests = 0;

  recordHit(): void {
    this.hits++;
    this.totalRequests++;
  }

  recordMiss(): void {
    this.misses++;
    this.totalRequests++;
  }

  recordError(): void {
    this.errors++;
    this.totalRequests++;
  }

  getStats(): CacheStats {
    const cached = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      totalRequests: this.totalRequests,
      hitRate: cached > 0 ? this.hits / cached : 0,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.totalRequests = 0;
  }
}

/**
 * 创建带统计的 CacheFirst 策略
 */
export function createCacheFirstWithStats(
  config: RouteCacheConfig,
  stats: CacheStatsTracker
) {
  return {
    async handle(request: Request, fetchFn: (req: Request) => Promise<Response>): Promise<Response> {
      try {
        const cache = await caches.open(config.cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          stats.recordHit();
          // 后台异步更新（不阻塞响应）
          fetchFn(request).then((networkResponse) => {
            if (networkResponse?.ok) {
              cache.put(request, networkResponse.clone());
            }
          }).catch(() => {
            // 静默失败
          });
          return cachedResponse;
        }

        stats.recordMiss();
        const networkResponse = await fetchFn(request);
        if (networkResponse?.ok && config.cacheableMethods?.includes(request.method) !== false) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        stats.recordError();
        throw error;
      }
    },
  };
}

/**
 * 创建带统计的 StaleWhileRevalidate 策略
 */
export function createStaleWhileRevalidateWithStats(
  config: RouteCacheConfig,
  stats: CacheStatsTracker
) {
  return {
    async handle(request: Request, fetchFn: (req: Request) => Promise<Response>): Promise<Response> {
      try {
        const cache = await caches.open(config.cacheName);
        const cachedResponse = await cache.match(request);

        // 异步更新（不阻塞响应）
        const fetchPromise = fetchFn(request).then((networkResponse) => {
          if (networkResponse?.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          stats.recordError();
          throw err;
        });

        if (cachedResponse) {
          stats.recordHit();
          return cachedResponse;
        }

        stats.recordMiss();
        return await fetchPromise;
      } catch (error) {
        stats.recordError();
        throw error;
      }
    },
  };
}

/**
 * 创建带统计的 NetworkFirst 策略
 */
export function createNetworkFirstWithStats(
  config: RouteCacheConfig,
  stats: CacheStatsTracker
) {
  return {
    async handle(request: Request, fetchFn: (req: Request) => Promise<Response>): Promise<Response> {
      const cache = await caches.open(config.cacheName);

      try {
        const timeoutPromise = config.networkTimeoutSeconds
          ? new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error('Network timeout')), config.networkTimeoutSeconds! * 1000)
            )
          : null;

        const fetchPromise = fetchFn(request);
        const response = timeoutPromise
          ? await Promise.race([fetchPromise, timeoutPromise])
          : await fetchPromise;

        if (response?.ok) {
          cache.put(request, response.clone());
          stats.recordMiss();
          return response;
        }

        throw new Error('Network response not ok');
      } catch {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          stats.recordHit();
          return cachedResponse;
        }
        stats.recordError();
        throw new Error('No cached response and network failed');
      }
    },
  };
}

/**
 * 智能预缓存控制器
 * - 空闲时预取关键路由
 * - 网络空闲时（navigator.connection.effectiveType === '4g'）才预取
 */
export class SmartPrecacheController {
  private isRunning = false;
  private abortController: AbortController | null = null;

  constructor(
    private readonly cacheName: string,
    private readonly routes: string[],
    private readonly options: {
      /** 仅在网络状况良好时预取 */
      onlyOnFastNetwork?: boolean;
      /** 并发数 */
      concurrency?: number;
      /** 超时（毫秒） */
      timeoutMs?: number;
    } = {}
  ) {}

  /**
   * 检查网络状况是否适合预取
   */
  private isNetworkSuitable(): boolean {
    if (!this.options.onlyOnFastNetwork) return true;
    if (typeof navigator === 'undefined' || !('connection' in navigator)) return true;
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    if (!conn) return true;
    if (conn.saveData) return false;
    if (conn.effectiveType === '4g') return true;
    if (conn.effectiveType === '3g') return false; // 3G/2G 不预取
    return true;
  }

  /**
   * 启动预缓存
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    if (!this.isNetworkSuitable()) {
      return;
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    const concurrency = this.options.concurrency ?? 3;
    const timeout = this.options.timeoutMs ?? 5000;

    try {
      // 分批并发预取
      for (let i = 0; i < this.routes.length; i += concurrency) {
        if (this.abortController.signal.aborted) break;
        const batch = this.routes.slice(i, i + concurrency);
        await Promise.allSettled(
          batch.map((url) => this.precacheSingle(url, timeout))
        );
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 停止预缓存
   */
  stop(): void {
    this.abortController?.abort();
    this.isRunning = false;
  }

  /**
   * 预取单个 URL
   */
  private async precacheSingle(url: string, timeout: number): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);

      // 已缓存则跳过
      const existing = await cache.match(url);
      if (existing) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'same-origin',
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        await cache.put(url, response.clone());
      }
    } catch {
      // 静默失败
    }
  }
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

/**
 * 缓存配置预设
 */
export const CACHE_PRESETS: Record<string, RouteCacheConfig> = {
  /** 静态资源：长时间缓存 */
  STATIC: {
    cacheName: 'static',
    strategy: 'cacheFirst',
    maxEntries: 100,
    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
  },
  /** API 数据：短时间缓存 + 后台更新 */
  API: {
    cacheName: 'api',
    strategy: 'staleWhileRevalidate',
    maxEntries: 200,
    maxAgeSeconds: 5 * 60, // 5 分钟
  },
  /** 关键 API：网络优先 */
  CRITICAL_API: {
    cacheName: 'critical-api',
    strategy: 'networkFirst',
    maxEntries: 50,
    maxAgeSeconds: 60 * 60, // 1 小时
    networkTimeoutSeconds: 5,
  },
  /** 图片：长时间缓存 */
  IMAGES: {
    cacheName: 'images',
    strategy: 'cacheFirst',
    maxEntries: 200,
    maxAgeSeconds: 60 * 24 * 60 * 60, // 60 天
  },
};
