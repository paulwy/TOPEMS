/**
 * V43.0 Track D: 增量静态再生（ISR）Hooks
 *
 * 基于 IsrManager 的 React Hooks 封装，
 * 提供增量静态再生、按需重验证、缓存统计等能力。
 *
 * @example
 * ```tsx
 * const { data, loading, error, revalidate, isStale } = useIsrCache(
 *   ['dashboard', 'stats'],
 *   () => fetchDashboardStats(),
 *   { revalidate: 60000 }
 * );
 *
 * const { stats, prune } = useIsrStats();
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { isrManager, type IsrConfig, type IsrStats, type IsrCacheEntry } from '@/utils/isr-manager';

export interface UseIsrCacheOptions {
  revalidate?: number;
  staleWhileRevalidate?: number;
  manual?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  onRevalidate?: (data: unknown) => void;
}

export interface UseIsrCacheResult<T = unknown> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  revalidate: () => Promise<T | undefined>;
  invalidate: () => boolean;
  isStale: boolean;
  isRevalidating: boolean;
  lastRevalidated: number | null;
}

export function useIsrCache<T = unknown>(
  key: string | string[],
  fetcher: () => Promise<T>,
  options: UseIsrCacheOptions = {}
): UseIsrCacheResult<T> {
  const cacheKey = useMemo(() => {
    return Array.isArray(key) ? key.join(':') : key;
  }, [key]);

  const [data, setData] = useState<T | undefined>(() => {
    return isrManager.get<T>(cacheKey);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [lastRevalidated, setLastRevalidated] = useState<number | null>(() => {
    const entry = isrManager.getEntry<T>(cacheKey);
    return entry ? entry.lastRevalidated : null;
  });
  const mountedRef = useRef(true);

  const isStale = useMemo(() => {
    return isrManager.isStale(cacheKey);
  }, [cacheKey, data]);

  const revalidate = useCallback(async (): Promise<T | undefined> => {
    setIsRevalidating(true);
    setError(null);
    try {
      const result = await isrManager.revalidate<T>(cacheKey, fetcher, {
        revalidate: options.revalidate,
        staleWhileRevalidate: options.staleWhileRevalidate,
      });
      if (mountedRef.current) {
        setData(result);
        setLastRevalidated(Date.now());
        options.onRevalidate?.(result);
        options.onSuccess?.(result);
      }
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(e);
        options.onError?.(e);
      }
      return undefined;
    } finally {
      if (mountedRef.current) {
        setIsRevalidating(false);
      }
    }
  }, [
    cacheKey,
    fetcher,
    options.revalidate,
    options.staleWhileRevalidate,
    options.onRevalidate,
    options.onSuccess,
    options.onError,
  ]);

  const invalidate = useCallback((): boolean => {
    const result = isrManager.invalidate(cacheKey);
    if (result) {
      setData(undefined);
    }
    return result;
  }, [cacheKey]);

  useEffect(() => {
    mountedRef.current = true;

    const cached = isrManager.get<T>(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      if (isrManager.isStale(cacheKey)) {
        revalidate();
      }
    } else if (!options.manual) {
      setLoading(true);
      revalidate().finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
    }

    const unsubscribe = isrManager.subscribe((k, newData) => {
      if (k === cacheKey && mountedRef.current) {
        setData(newData as T);
        setLastRevalidated(Date.now());
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [cacheKey, options.manual, revalidate]);

  return {
    data,
    loading,
    error,
    revalidate,
    invalidate,
    isStale,
    isRevalidating,
    lastRevalidated,
  };
}

export interface UseRevalidateResult {
  revalidate: (key: string | string[]) => Promise<boolean>;
  revalidatePattern: (pattern: string) => number;
  revalidateAll: () => number;
  isRevalidating: boolean;
}

export function useRevalidate(): UseRevalidateResult {
  const [isRevalidating, setIsRevalidating] = useState(false);

  const revalidate = useCallback(async (key: string | string[]): Promise<boolean> => {
    const cacheKey = Array.isArray(key) ? key.join(':') : key;
    setIsRevalidating(true);
    try {
      const entry = isrManager.getEntry(cacheKey);
      return entry !== undefined;
    } finally {
      setIsRevalidating(false);
    }
  }, []);

  const revalidatePattern = useCallback((pattern: string): number => {
    return isrManager.invalidatePattern(pattern);
  }, []);

  const revalidateAll = useCallback((): number => {
    const keys = isrManager.keys();
    keys.forEach((key) => {
      isrManager.invalidate(key);
    });
    return keys.length;
  }, []);

  return { revalidate, revalidatePattern, revalidateAll, isRevalidating };
}

export interface UseIsrStatsResult {
  stats: IsrStats;
  prune: (count?: number) => number;
  clear: () => void;
  resetStats: () => void;
}

export function useIsrStats(): UseIsrStatsResult {
  const [stats, setStats] = useState<IsrStats>(() => isrManager.getStats());

  const refresh = useCallback(() => {
    setStats(isrManager.getStats());
  }, []);

  const prune = useCallback(
    (count = 10): number => {
      const result = isrManager.prune(count);
      refresh();
      return result;
    },
    [refresh]
  );

  const clear = useCallback(() => {
    isrManager.clear();
    refresh();
  }, [refresh]);

  const resetStats = useCallback(() => {
    isrManager.resetStats();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { stats, prune, clear, resetStats };
}

export interface UseIsrEntryResult<T = unknown> {
  entry: IsrCacheEntry<T> | undefined;
  exists: boolean;
}

export function useIsrEntry<T = unknown>(key: string | string[]): UseIsrEntryResult<T> {
  const cacheKey = useMemo(() => {
    return Array.isArray(key) ? key.join(':') : key;
  }, [key]);

  const [entry, setEntry] = useState<IsrCacheEntry<T> | undefined>(() => {
    return isrManager.getEntry<T>(cacheKey);
  });

  useEffect(() => {
    setEntry(isrManager.getEntry<T>(cacheKey));
    const unsubscribe = isrManager.subscribe((k) => {
      if (k === cacheKey) {
        setEntry(isrManager.getEntry<T>(cacheKey));
      }
    });
    return unsubscribe;
  }, [cacheKey]);

  return {
    entry,
    exists: entry !== undefined,
  };
}

export interface UseIsrConfigResult {
  config: Partial<IsrConfig>;
  size: number;
  keys: string[];
}

export function useIsrConfig(): UseIsrConfigResult {
  const [, setTick] = useState(0);

  const config = useMemo<Partial<IsrConfig>>(
    () => ({
      revalidate: 60 * 1000,
      maxEntries: 500,
      staleWhileRevalidate: 24 * 60 * 60 * 1000,
    }),
    []
  );

  const size = isrManager.size;
  const keys = isrManager.keys();

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  return { config, size, keys };
}
