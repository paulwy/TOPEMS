import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  CancelTokenSource,
  InternalAxiosRequestConfig,
} from 'axios';
import { storage } from '@/utils/storage';
import { getMobileApiUrl } from '@/utils/api-url';
import { NetworkService } from '@/services/networkService';
import { OfflineService } from '@/services/offlineService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL?: string;
    }
  }
}

const BASE_URL = getMobileApiUrl();

const MAX_CACHE_SIZE = 100;
const DEFAULT_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

const cache = new Map<string, CacheEntry>();
const cancelTokenSources = new Map<string, CancelTokenSource>();

const getCacheKey = (config: AxiosRequestConfig): string => {
  const method = config.method?.toUpperCase() || 'GET';
  const url = config.url || '';
  const params = JSON.stringify(config.params || {});
  return `${method}:${url}:${params}`;
};

const getFromCache = (config: AxiosRequestConfig): unknown | null => {
  const key = getCacheKey(config);
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  entry.accessCount += 1;
  entry.lastAccess = now;

  return entry.data;
};

const evictLeastUsed = (): void => {
  if (cache.size < MAX_CACHE_SIZE) return;

  let leastUsedKey: string | null = null;
  let minScore = Infinity;

  const now = Date.now();

  cache.forEach((entry, key) => {
    const age = now - entry.lastAccess;
    const score = age / (entry.accessCount + 1);
    if (score < minScore) {
      minScore = score;
      leastUsedKey = key;
    }
  });

  if (leastUsedKey) {
    cache.delete(leastUsedKey);
  }
};

const saveToCache = (
  config: AxiosRequestConfig,
  data: unknown,
  ttl: number = DEFAULT_TTL,
): void => {
  const key = getCacheKey(config);

  evictLeastUsed();

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    accessCount: 1,
    lastAccess: Date.now(),
  });
};

const cleanupExpiredCache = (): void => {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  });
};

setInterval(cleanupExpiredCache, 60000);

const cancelPendingRequest = (config: AxiosRequestConfig): void => {
  const key = getCacheKey(config);
  const source = cancelTokenSources.get(key);
  if (source) {
    source.cancel('Request cancelled due to new request');
    cancelTokenSources.delete(key);
  }
};

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const isOffline = NetworkService.isOffline();
      const method = config.method?.toUpperCase() || 'GET';

      if (isOffline) {
        if (method === 'GET') {
          const cachedData = await OfflineService.getCache('api', getCacheKey(config));
          if (cachedData) {
            return {
              ...config,
              adapter: () =>
                Promise.resolve({
                  data: cachedData,
                  status: 200,
                  statusText: 'OK (Offline Cache)',
                  headers: { 'X-Offline-Cache': 'true' },
                  config,
                }),
            };
          }
        } else {
          const module = (config as unknown as { offlineModule?: string })?.offlineModule || 'api';
          const action = method.toLowerCase();
          const data = (config.data as Record<string, unknown>) || {};
          const url = config.url || '';

          const offlineId = await OfflineService.saveOfflineAction(module, action, {
            url,
            method,
            data,
          });

          return {
            ...config,
            adapter: () =>
              Promise.resolve({
                data: {
                  success: true,
                  message: '操作已保存，网络恢复后将自动同步',
                  offlineId,
                  isOffline: true,
                },
                status: 200,
                statusText: 'OK (Offline)',
                headers: { 'X-Offline-Queued': 'true' },
                config,
              }),
          };
        }
      }

      const cacheEnabled =
        method === 'GET' && !(config as unknown as { noCache?: boolean })?.noCache;
      if (cacheEnabled) {
        const cachedData = getFromCache(config);
        if (cachedData !== null) {
          return {
            ...config,
            adapter: () =>
              Promise.resolve({
                data: cachedData,
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
              }),
          };
        }

        cancelPendingRequest(config);

        const source = axios.CancelToken.source();
        config.cancelToken = source.token;
        const key = getCacheKey(config);
        cancelTokenSources.set(key, source);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  client.interceptors.response.use(
    (response) => {
      const config = response.config as AxiosRequestConfig;
      const method = config.method?.toUpperCase() || 'GET';
      const cacheEnabled =
        method === 'GET' && !(config as unknown as { noCache?: boolean })?.noCache;
      const cacheTtl = (config as unknown as { cacheTtl?: number })?.cacheTtl || DEFAULT_TTL;

      if (cacheEnabled && response.status === 200) {
        saveToCache(config, response.data, cacheTtl);

        OfflineService.setCache('api', getCacheKey(config), response.data, cacheTtl / 1000).catch(
          (e) => console.warn('Failed to save to offline cache:', e),
        );
      }

      const key = getCacheKey(config);
      cancelTokenSources.delete(key);

      return response;
    },
    async (error) => {
      const config = error.config as AxiosRequestConfig;

      const key = getCacheKey(config);
      cancelTokenSources.delete(key);

      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401) {
        await storage.removeToken();
        await storage.removeUser();
        return Promise.reject(error);
      }

      const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
      const method = config.method?.toUpperCase() || 'GET';

      if (isNetworkError && method !== 'GET') {
        const module = (config as unknown as { offlineModule?: string })?.offlineModule || 'api';
        const action = method.toLowerCase();
        const data = (config.data as Record<string, unknown>) || {};
        const url = config.url || '';

        try {
          const offlineId = await OfflineService.saveOfflineAction(module, action, {
            url,
            method,
            data,
          });

          return Promise.resolve({
            data: {
              success: true,
              message: '网络异常，操作已保存，网络恢复后将自动同步',
              offlineId,
              isOffline: true,
            },
            status: 200,
            statusText: 'OK (Offline Fallback)',
            headers: { 'X-Offline-Queued': 'true' },
            config,
          });
        } catch (e) {
          console.warn('Failed to save offline action:', e);
        }
      }

      const retryCount = (config as unknown as { retryCount?: number })?.retryCount || 0;
      const maxRetries = (config as unknown as { maxRetries?: number })?.maxRetries || 3;
      const retryDelay = (config as unknown as { retryDelay?: number })?.retryDelay || 1000;

      const shouldRetry =
        maxRetries > retryCount &&
        error.response &&
        [429, 500, 502, 503, 504].includes(error.response.status);

      if (shouldRetry) {
        (config as unknown as { retryCount: number }).retryCount = retryCount + 1;
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return client(config);
      }

      return Promise.reject(error);
    },
  );

  return client;
};

export const apiClient = createApiClient();

export const clearCache = (): void => {
  cache.clear();
};

export const getCacheStats = () => {
  let totalAccessCount = 0;
  let oldestTimestamp = Date.now();
  let newestTimestamp = 0;

  cache.forEach((entry) => {
    totalAccessCount += entry.accessCount;
    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }
    if (entry.timestamp > newestTimestamp) {
      newestTimestamp = entry.timestamp;
    }
  });

  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    totalAccessCount,
    oldestAge: cache.size > 0 ? Date.now() - oldestTimestamp : 0,
    newestAge: cache.size > 0 ? Date.now() - newestTimestamp : 0,
  };
};
