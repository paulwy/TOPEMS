import axios, { AxiosInstance, AxiosRequestConfig, CancelTokenSource, InternalAxiosRequestConfig } from 'axios';
import { shouldUseMock } from '@/mock';
import * as mockScan from '@/mock/scan';
import * as mockApproval from '@/mock/approval';
import * as mockAttendance from '@/mock/attendance';
import * as mockTask from '@/mock/task';
import * as mockDashboard from '@/mock/dashboard';
import { storage } from '@/utils/storage';
import { getMobileApiUrl } from '@/utils/api-url';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL?: string;
      EXPO_PUBLIC_USE_MOCK?: string;
    }
  }
}

const BASE_URL = getMobileApiUrl();

const getMockResponse = (config: AxiosRequestConfig): unknown | null => {
  if (!shouldUseMock()) return null;
  
  const url = config.url || '';
  const method = config.method?.toUpperCase() || 'GET';
  const data = config.data as Record<string, unknown> || {};
  const params = config.params as Record<string, unknown> || {};
  
  if (url === '/scan/barcode' && method === 'POST') {
    return mockScan.mockScanBarcode(data as any);
  }
  
  if (url === '/scan/qrcode' && method === 'POST') {
    return mockScan.mockScanQrcode(data as any);
  }
  
  if (url === '/barcode/history' && method === 'GET') {
    return mockScan.mockGetScanHistory(params as any);
  }
  
  if (url.startsWith('/barcode/history/') && method === 'GET') {
    const id = url.split('/').pop() || '';
    return mockScan.mockGetScanById(id);
  }
  
  if (url.startsWith('/barcode/history/') && method === 'DELETE') {
    const id = url.split('/').pop() || '';
    return mockScan.mockDeleteScanRecord(id);
  }
  
  if (url === '/barcode/types' && method === 'GET') {
    return mockScan.mockGetSupportedBarcodeTypes();
  }
  
  if (url === '/approval/tasks' && method === 'GET') {
    return mockApproval.mockGetApprovals(params as any);
  }
  
  if (url === '/approval/tasks/pending' && method === 'GET') {
    return mockApproval.mockGetPendingTasks();
  }
  
  if (url.startsWith('/approval/tasks/') && url.endsWith('/approve') && method === 'POST') {
    const id = url.split('/')[3];
    return mockApproval.mockApproveApproval(id, data as any);
  }
  
  if (url.startsWith('/approval/tasks/') && url.endsWith('/reject') && method === 'POST') {
    const id = url.split('/')[3];
    return mockApproval.mockRejectApproval(id, data as any);
  }
  
  if (url.startsWith('/approval/tasks/') && url.endsWith('/delegate') && method === 'POST') {
    const id = url.split('/')[3];
    return mockApproval.mockDelegate(id, data as any);
  }
  
  if (url.startsWith('/approval/tasks/') && method === 'GET') {
    const id = url.split('/')[3];
    return mockApproval.mockGetTaskById(id);
  }
  
  if (url === '/approval/history' && method === 'GET') {
    return mockApproval.mockGetHistory(params as any);
  }
  
  if (url === '/attendance/stats' && method === 'GET') {
    return mockAttendance.mockGetAttendanceStats();
  }
  
  if (url === '/attendance/records' && method === 'GET') {
    return mockAttendance.mockGetAttendanceRecords(params as any);
  }
  
  if (url === '/attendance/today' && method === 'GET') {
    return mockAttendance.mockGetTodayRecord();
  }
  
  if (url === '/attendance/checkin' && method === 'POST') {
    return mockAttendance.mockCheckIn(data as any);
  }
  
  if (url === '/attendance/checkout' && method === 'POST') {
    return mockAttendance.mockCheckOut(data as any);
  }
  
  if (url === '/task/list' && method === 'GET') {
    return mockTask.mockGetTasks(params as any);
  }
  
  if (url === '/task/pending' && method === 'GET') {
    return mockTask.mockGetPendingTasks();
  }
  
  if (url.startsWith('/task/') && method === 'GET') {
    const id = url.split('/')[2];
    return mockTask.mockGetTaskById(id);
  }
  
  if (url === '/task/create' && method === 'POST') {
    return mockTask.mockCreateTask(data as any);
  }
  
  if (url.startsWith('/task/') && method === 'PUT') {
    const id = url.split('/')[2];
    return mockTask.mockUpdateTask(id, data as any);
  }
  
  if (url.startsWith('/task/') && method === 'DELETE') {
    const id = url.split('/')[2];
    return mockTask.mockDeleteTask(id);
  }
  
  if (url === '/dashboard/stats' && method === 'GET') {
    return mockDashboard.mockGetStats();
  }
  
  if (url === '/dashboard/quick-actions' && method === 'GET') {
    return mockDashboard.mockGetQuickActions();
  }
  
  if (url === '/dashboard/events' && method === 'GET') {
    return mockDashboard.mockGetRecentEvents();
  }
  
  if (url === '/dashboard/tasks' && method === 'GET') {
    return mockDashboard.mockGetRecentTasks();
  }
  
  return null;
};

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

      const mockData = getMockResponse(config);
      if (mockData !== null) {
        return {
          ...config,
          adapter: () =>
            Promise.resolve({
              data: mockData,
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
            }),
        };
      }

      const cacheEnabled = config.method?.toUpperCase() === 'GET' && !(config as any)?.noCache;
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
      const cacheEnabled = config.method?.toUpperCase() === 'GET' && !(config as any)?.noCache;
      const cacheTtl = (config as any)?.cacheTtl || DEFAULT_TTL;

      if (cacheEnabled && response.status === 200) {
        saveToCache(config, response.data, cacheTtl);
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

      const retryCount = (config as any)?.retryCount || 0;
      const maxRetries = (config as any)?.maxRetries || 3;
      const retryDelay = (config as any)?.retryDelay || 1000;

      const shouldRetry =
        maxRetries > retryCount &&
        error.response &&
        [429, 500, 502, 503, 504].includes(error.response.status);

      if (shouldRetry) {
        (config as any).retryCount = retryCount + 1;
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

export const clearCacheByKey = (
  url: string,
  method: string = 'GET',
  params?: Record<string, unknown>,
): void => {
  const key = `${method.toUpperCase()}:${url}:${JSON.stringify(params || {})}`;
  cache.delete(key);
};

export const getCacheSize = (): number => {
  return cache.size;
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