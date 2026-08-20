interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  resolvers: Array<(value: T) => void>;
  rejecters: Array<(reason: unknown) => void>;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private defaultTTL = 5 * 60 * 1000;
  private maxSize = 200;

  set<T>(key: string, data: T, ttl?: number): void {
    // 超过容量上限时清理最旧的条目
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    const cacheTTL = ttl ?? this.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now() + cacheTTL,
    });
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clearByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  async dedup<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const pending = this.pendingRequests.get(key) as PendingRequest<T> | undefined;
    if (pending) {
      return new Promise<T>((resolve, reject) => {
        pending.resolvers.push(resolve as (value: unknown) => void);
        pending.rejecters.push(reject);
      });
    }

    const newPending: PendingRequest<T> = {
      promise: Promise.resolve() as unknown as Promise<T>,
      resolvers: [],
      rejecters: [],
    };

    this.pendingRequests.set(key, newPending as PendingRequest<unknown>);

    try {
      const result = await requestFn();

      newPending.resolvers.forEach((resolve) => resolve(result));
      return result;
    } catch (error) {
      newPending.rejecters.forEach((reject) => reject(error));
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await this.dedup(key, fetchFn);
    this.set(key, result, ttl);
    return result;
  }

  generateKey(url: string, params?: Record<string, unknown>): string {
    if (!params) return url;
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${url}?${sortedParams}`;
  }
}

const apiCache = new ApiCache();

export default apiCache;
