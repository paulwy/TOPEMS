interface CacheEntry {
  data: string;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  used: number;
  count: number;
}

const MAX_CACHE_SIZE = 100 * 1024 * 1024;
const CACHE_TTL = 30 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'topems_cache_';

let cacheStats: CacheStats = { used: 0, count: 0 };

export const offlineCache = {
  async init(): Promise<void> {
    this.cleanupExpired();
  },

  async get(key: string): Promise<string | null> {
    try {
      const storageKey = STORAGE_KEY_PREFIX + this.sanitizeKey(key);
      const item = localStorage.getItem(storageKey);
      
      if (!item) return null;
      
      const entry: CacheEntry = JSON.parse(item);
      
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(storageKey);
        cacheStats.count--;
        return null;
      }
      
      return entry.data;
    } catch {
      return null;
    }
  },

  async set(key: string, data: string, ttl: number = CACHE_TTL): Promise<void> {
    try {
      const storageKey = STORAGE_KEY_PREFIX + this.sanitizeKey(key);
      
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(entry));
      cacheStats.count++;
      cacheStats.used += data.length;
      
      this.enforceCacheLimit();
    } catch {
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const storageKey = STORAGE_KEY_PREFIX + this.sanitizeKey(key);
      localStorage.removeItem(storageKey);
      cacheStats.count--;
    } catch {
    }
  },

  cleanupExpired(): void {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
      
      for (const key of keys) {
        try {
          const item = localStorage.getItem(key);
          if (!item) continue;
          
          const entry: CacheEntry = JSON.parse(item);
          if (Date.now() > entry.expiresAt) {
            localStorage.removeItem(key);
            cacheStats.count--;
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    } catch {
    }
  },

  enforceCacheLimit(): void {
    if (cacheStats.used <= MAX_CACHE_SIZE) return;

    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
      
      const keyStats: { key: string; timestamp: number }[] = [];
      for (const key of keys) {
        try {
          const item = localStorage.getItem(key);
          if (!item) continue;
          
          const entry: CacheEntry = JSON.parse(item);
          keyStats.push({ key, timestamp: entry.timestamp });
        } catch {
        }
      }
      
      keyStats.sort((a, b) => a.timestamp - b.timestamp);
      
      let freedSize = 0;
      for (const stat of keyStats) {
        if (freedSize > cacheStats.used - MAX_CACHE_SIZE * 0.8) break;
        
        localStorage.removeItem(stat.key);
        cacheStats.count--;
        freedSize += 1024;
      }
    } catch {
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      cacheStats = { used: 0, count: 0 };
    } catch {
    }
  },

  getStats(): CacheStats {
    return cacheStats;
  },

  reset(): void {
    cacheStats = { used: 0, count: 0 };
  },

  sanitizeKey(key: string): string {
    return key.replace(/[\\/:*?"<>|]/g, '_').slice(0, 200);
  },
};