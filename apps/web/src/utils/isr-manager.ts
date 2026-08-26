export interface IsrCacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  revalidateAt: number;
  lastRevalidated: number;
  revalidateCount: number;
  errorCount: number;
  isRevalidating: boolean;
  etag?: string;
}

export interface IsrConfig {
  revalidate: number;
  maxEntries: number;
  staleWhileRevalidate: number;
  errorRetryInterval: number;
  maxRetryCount: number;
}

export interface IsrStats {
  totalEntries: number;
  maxEntries: number;
  hitCount: number;
  missCount: number;
  revalidateCount: number;
  errorCount: number;
  hitRate: number;
}

export class IsrManager {
  private cache: Map<string, IsrCacheEntry> = new Map();
  private config: IsrConfig;
  private stats: Omit<IsrStats, 'hitRate' | 'totalEntries' | 'maxEntries'> = {
    hitCount: 0,
    missCount: 0,
    revalidateCount: 0,
    errorCount: 0,
  };
  private revalidating = new Set<string>();
  private listeners: Set<(key: string, data: unknown) => void> = new Set();

  constructor(config?: Partial<IsrConfig>) {
    this.config = {
      revalidate: 60 * 1000,
      maxEntries: 500,
      staleWhileRevalidate: 24 * 60 * 60 * 1000,
      errorRetryInterval: 5 * 1000,
      maxRetryCount: 3,
      ...config,
    };
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.missCount++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.stats.missCount++;
      return undefined;
    }

    this.stats.hitCount++;

    if (this.needsRevalidation(entry)) {
      this.scheduleRevalidate(key);
    }

    return entry.data as T;
  }

  getEntry<T = unknown>(key: string): IsrCacheEntry<T> | undefined {
    return this.cache.get(key) as IsrCacheEntry<T> | undefined;
  }

  set<T = unknown>(key: string, data: T, config?: Partial<IsrConfig>): void {
    const now = Date.now();
    const revalidate = config?.revalidate ?? this.config.revalidate;

    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.prune(1);
    }

    const existing = this.cache.get(key);
    this.cache.set(key, {
      data,
      timestamp: now,
      revalidateAt: now + revalidate,
      lastRevalidated: now,
      revalidateCount: existing?.revalidateCount ?? 0,
      errorCount: 0,
      isRevalidating: false,
    });
  }

  async revalidate<T = unknown>(
    key: string,
    fetcher: () => Promise<T>,
    config?: Partial<IsrConfig>
  ): Promise<T> {
    if (this.revalidating.has(key)) {
      const entry = this.cache.get(key);
      if (entry) return entry.data as T;
    }

    this.revalidating.add(key);
    this.stats.revalidateCount++;

    try {
      const data = await fetcher();
      this.set(key, data, config);
      const entry = this.cache.get(key);
      if (entry) {
        entry.revalidateCount++;
        entry.errorCount = 0;
        entry.isRevalidating = false;
        entry.lastRevalidated = Date.now();
      }
      this.notifyListeners(key, data);
      return data;
    } catch (error) {
      const entry = this.cache.get(key);
      if (entry) {
        entry.errorCount++;
        entry.isRevalidating = false;
      }
      this.stats.errorCount++;
      throw error;
    } finally {
      this.revalidating.delete(key);
    }
  }

  async revalidateOnDemand<T = unknown>(
    key: string,
    fetcher: () => Promise<T>,
    config?: Partial<IsrConfig>
  ): Promise<T> {
    return this.revalidate(key, fetcher, config);
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return this.needsRevalidation(entry);
  }

  private needsRevalidation(entry: IsrCacheEntry): boolean {
    return Date.now() > entry.revalidateAt && !entry.isRevalidating;
  }

  private isExpired(entry: IsrCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.config.staleWhileRevalidate;
  }

  private scheduleRevalidate<T = unknown>(key: string, fetcher?: () => Promise<T>): void {
    const entry = this.cache.get(key);
    if (!entry || entry.isRevalidating) return;

    entry.isRevalidating = true;

    if (fetcher) {
      this.revalidate(key, fetcher).catch(() => {});
    }
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  prune(count = 10): number {
    if (this.cache.size <= this.config.maxEntries) return 0;

    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = Math.min(count, entries.length - this.config.maxEntries + count);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    return toRemove;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): IsrStats {
    const total = this.stats.hitCount + this.stats.missCount;
    return {
      totalEntries: this.cache.size,
      maxEntries: this.config.maxEntries,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      revalidateCount: this.stats.revalidateCount,
      errorCount: this.stats.errorCount,
      hitRate: total > 0 ? this.stats.hitCount / total : 0,
    };
  }

  resetStats(): void {
    this.stats = {
      hitCount: 0,
      missCount: 0,
      revalidateCount: 0,
      errorCount: 0,
    };
  }

  subscribe(listener: (key: string, data: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(key: string, data: unknown): void {
    this.listeners.forEach((cb) => {
      try {
        cb(key, data);
      } catch {
        // ignore listener errors
      }
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return !this.isExpired(entry);
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
