import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttl?: number;
  enabled?: boolean;
  maxSize?: number;
}

const cache = new Map<string, CacheEntry<any>>();
const defaultTTL = 5 * 60 * 1000;

export const useDataCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) => {
  const { ttl = defaultTTL, enabled = true, maxSize = 100 } = config;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchRef = useRef(0);

  const clearCache = useCallback(() => {
    cache.delete(key);
  }, [key]);

  const clearAllCache = useCallback(() => {
    cache.clear();
  }, []);

  const invalidateCache = useCallback((pattern?: string) => {
    if (pattern) {
      cache.forEach((_, cacheKey) => {
        if (cacheKey.match(new RegExp(pattern))) {
          cache.delete(cacheKey);
        }
      });
    } else {
      cache.delete(key);
    }
  }, [key]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      setData(result);
      
      if (enabled) {
        if (cache.size >= maxSize) {
          const oldestKey = Array.from(cache.keys()).sort(
            (a, b) => cache.get(a)!.timestamp - cache.get(b)!.timestamp
          )[0];
          cache.delete(oldestKey);
        }
        
        cache.set(key, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        });
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, enabled, ttl, maxSize]);

  useEffect(() => {
    fetchRef.current += 1;
    const currentFetch = fetchRef.current;

    const cachedEntry = enabled ? cache.get(key) : null;
    
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      setData(cachedEntry.data);
      setLoading(false);
      return;
    }

    fetchData();

    return () => {
      fetchRef.current -= 1;
    };
  }, [key, enabled, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearCache,
    clearAllCache,
    invalidateCache,
  };
};

export interface UseQueryOptions<T> {
  cache?: boolean;
  cacheTTL?: number;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export const useQuery = <T>(
  key: string,
  queryFn: () => Promise<T>,
  options: UseQueryOptions<T> = {}
) => {
  const {
    cache = true,
    cacheTTL = defaultTTL,
    initialData,
    onSuccess,
    onError,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(initialData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsFetching(true);
    
    try {
      const result = await queryFn();
      setData(result);
      setError(null);
      onSuccess?.(result);
      
      if (cache) {
        cache.set(key, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + cacheTTL,
        });
      }
    } catch (err) {
      setError(err as Error);
      onError?.(err as Error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [key, queryFn, cache, cacheTTL, enabled, onSuccess, onError]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (cache) {
      const cachedEntry = cache.get(key);
      if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
        setData(cachedEntry.data);
        setLoading(false);
        return;
      }
    }

    fetchData();
  }, [key, enabled, cache, fetchData]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cache.delete(key);
  }, [key]);

  return {
    data,
    loading,
    error,
    isFetching,
    refetch,
    invalidate,
  };
};

export const useMutation = <T, V = unknown>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
    invalidateTags?: string[];
  }
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: V) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      options?.onSuccess?.(result);
      
      if (options?.invalidateTags) {
        options.invalidateTags.forEach((tag) => {
          cache.forEach((_, key) => {
            if (key.includes(tag)) {
              cache.delete(key);
            }
          });
        });
      }

      return result;
    } catch (err) {
      options?.onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
      options?.onSettled?.();
    }
  }, [mutationFn, options]);

  return {
    mutate,
    loading,
    error,
  };
};

export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};

export default useDataCache;
