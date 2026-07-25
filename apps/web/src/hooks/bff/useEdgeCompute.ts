/**
 * V43.0 Track D: 边缘计算 Hooks
 *
 * 基于 EdgeComputeManager 的 React Hooks 封装，
 * 提供边缘计算节点选择、边缘函数执行、边缘缓存等能力。
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useEdgeCompute('getUserStats', {
 *   strategy: 'stale-while-revalidate',
 * });
 *
 * const { endpoint, endpoints, health } = useOptimalEndpoint('cn-east');
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  edgeComputeManager,
  type EdgeEndpoint,
  type EdgeCacheStrategy,
  type EdgeComputeConfig,
} from '@/utils/edge-compute';

export interface UseEdgeComputeOptions {
  strategy?: EdgeCacheStrategy;
  region?: string;
  ttl?: number;
  manual?: boolean;
  payload?: unknown;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export interface UseEdgeComputeResult<T = unknown> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  execute: (payload?: unknown) => Promise<T | undefined>;
  invalidate: () => void;
  isCached: boolean;
}

export function useEdgeCompute<T = unknown>(
  functionName: string,
  options: UseEdgeComputeOptions = {}
): UseEdgeComputeResult<T> {
  const [data, setData] = useState<T | undefined>(() => {
    const cacheKey = `edge:${functionName}:${JSON.stringify(options.payload || {})}`;
    return edgeComputeManager.getEdgeCache<T>(cacheKey);
  });
  const [loading, setLoading] = useState(!options.manual);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const cacheKey = useMemo(() => {
    return `edge:${functionName}:${JSON.stringify(options.payload || {})}`;
  }, [functionName, options.payload]);

  const isCached = useMemo(() => {
    return edgeComputeManager.getEdgeCache<T>(cacheKey) !== undefined;
  }, [cacheKey]);

  const execute = useCallback(
    async (payload?: unknown): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await edgeComputeManager.executeEdgeFunction<T>(
          functionName,
          payload ?? options.payload,
          {
            region: options.region,
            strategy: options.strategy,
            ttl: options.ttl,
          }
        );
        if (mountedRef.current) {
          setData(result);
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
          setLoading(false);
        }
      }
    },
    [
      functionName,
      options.region,
      options.strategy,
      options.ttl,
      options.payload,
      options.onSuccess,
      options.onError,
    ]
  );

  const invalidate = useCallback(() => {
    edgeComputeManager.invalidateEdgeCache(cacheKey);
    setData(undefined);
  }, [cacheKey]);

  useEffect(() => {
    mountedRef.current = true;
    if (!options.manual) {
      execute();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [options.manual, execute]);

  return { data, loading, error, execute, invalidate, isCached };
}

export interface UseEdgeCacheOptions {
  ttl?: number;
  strategy?: EdgeCacheStrategy;
}

export interface UseEdgeCacheResult<T = unknown> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | undefined>;
  invalidate: () => void;
  isStale: boolean;
}

export function useEdgeCache<T = unknown>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseEdgeCacheOptions = {}
): UseEdgeCacheResult<T> {
  const [data, setData] = useState<T | undefined>(() => {
    return edgeComputeManager.getEdgeCache<T>(key);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const isStale = useMemo(() => {
    const cached = edgeComputeManager.getEdgeCache<T>(key);
    return cached === undefined;
  }, [key, data]);

  const refresh = useCallback(async (): Promise<T | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        edgeComputeManager.setEdgeCache(key, result, options.ttl);
        setData(result);
      }
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(e);
      }
      return undefined;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [key, fetcher, options.ttl]);

  const invalidate = useCallback(() => {
    edgeComputeManager.invalidateEdgeCache(key);
    setData(undefined);
  }, [key]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = edgeComputeManager.getEdgeCache<T>(key);
    if (cached === undefined) {
      refresh();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [key, refresh]);

  return { data, loading, error, refresh, invalidate, isStale };
}

export interface UseOptimalEndpointResult {
  endpoint: EdgeEndpoint | null;
  endpoints: EdgeEndpoint[];
  healthyEndpoints: EdgeEndpoint[];
  selectEndpoint: (region?: string) => EdgeEndpoint | null;
  checkHealth: (endpointId: string) => Promise<boolean>;
}

export function useOptimalEndpoint(region?: string): UseOptimalEndpointResult {
  const [endpoints, setEndpoints] = useState<EdgeEndpoint[]>(() =>
    edgeComputeManager.getAllEndpoints()
  );
  const [, setTick] = useState(0);

  const endpoint = useMemo(() => {
    return edgeComputeManager.selectOptimalEndpoint(region);
  }, [region, endpoints]);

  const healthyEndpoints = useMemo(() => {
    return endpoints.filter((e) => e.healthy);
  }, [endpoints]);

  const selectEndpoint = useCallback((r?: string): EdgeEndpoint | null => {
    return edgeComputeManager.selectOptimalEndpoint(r);
  }, []);

  const checkHealth = useCallback(async (endpointId: string): Promise<boolean> => {
    const result = await edgeComputeManager.checkProviderHealth(endpointId);
    setEndpoints(edgeComputeManager.getAllEndpoints());
    setTick((t) => t + 1);
    return result;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setEndpoints(edgeComputeManager.getAllEndpoints());
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return { endpoint, endpoints, healthyEndpoints, selectEndpoint, checkHealth };
}

export function useEdgeComputeConfig(): {
  config: EdgeComputeConfig;
  updateConfig: (config: Partial<EdgeComputeConfig>) => void;
} {
  const [config, setConfig] = useState<EdgeComputeConfig>(() => ({
    defaultStrategy: 'stale-while-revalidate',
    cacheTTL: 5 * 60 * 1000,
    maxCacheEntries: 200,
    healthCheckInterval: 30 * 1000,
    failoverThreshold: 3,
    recoveryThreshold: 5,
  }));

  const updateConfig = useCallback((newConfig: Partial<EdgeComputeConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  return { config, updateConfig };
}
