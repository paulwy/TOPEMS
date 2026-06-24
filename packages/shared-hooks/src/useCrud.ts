import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface UseCrudOptions<T> {
  api: AxiosInstance;
  basePath: string;
  initialData?: T[];
  onError?: (error: any) => void;
  onSuccess?: (message: string) => void;
  cacheTime?: number;
  autoFetch?: boolean;
}

export interface UseCrudResult<T, TCreate = Omit<T, 'id'>, TUpdate = Partial<T>> {
  data: T[];
  loading: boolean;
  error: string | null;
  fetch: (params?: Record<string, any>) => Promise<T[]>;
  get: (id: string | number) => Promise<T>;
  create: (item: TCreate) => Promise<T>;
  update: (id: string | number, item: TUpdate) => Promise<T>;
  delete: (id: string | number) => Promise<void>;
  bulkDelete: (ids: (string | number)[]) => Promise<void>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  refresh: () => Promise<T[]>;
  clearCache: () => void;
}

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
}

export function useCrud<
  T extends { id?: string | number },
  TCreate = Omit<T, 'id'>,
  TUpdate = Partial<T>,
>({
  api,
  basePath,
  initialData = [],
  onError,
  onSuccess,
  cacheTime = 0,
  autoFetch = true,
}: UseCrudOptions<T>): UseCrudResult<T, TCreate, TUpdate> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const cacheRef = useRef<CacheEntry<T> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleError = useCallback(
    (err: any) => {
      const message = err?.response?.data?.message || err?.message || err?.toString() || '操作失败';
      setError(message);
      onError?.(err);
      return Promise.reject(err);
    },
    [onError]
  );

  const clearCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  const fetch = useCallback(
    async (params?: Record<string, any>) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const currentController = new AbortController();
      abortControllerRef.current = currentController;

      const _cacheKey = `${basePath}_${JSON.stringify(params || {})}_${page}_${pageSize}`;

      if (cacheTime > 0 && cacheRef.current) {
        const now = Date.now();
        if (now - cacheRef.current.timestamp < cacheTime) {
          return cacheRef.current.data;
        }
      }

      setLoading(true);
      try {
        const config: AxiosRequestConfig = {
          params: {
            page,
            pageSize,
            ...params,
          },
          signal: currentController.signal,
        };

        const response = await api.get(basePath, config);

        const responseData = response.data?.items || response.data?.data || response.data;
        const responseTotal = response.data?.total || 0;

        if (cacheTime > 0) {
          cacheRef.current = {
            data: responseData,
            timestamp: Date.now(),
          };
        }

        setData(responseData);
        setTotal(responseTotal);
        setError(null);

        return responseData;
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code !== 'ERR_CANCELED') {
          return handleError(err);
        }
        return data;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, basePath, page, pageSize, cacheTime, handleError]
  );

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  const get = useCallback(
    async (id: string | number) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const currentController = new AbortController();
      abortControllerRef.current = currentController;

      setLoading(true);
      try {
        const config: AxiosRequestConfig = {
          signal: currentController.signal,
        };

        const response = await api.get(`${basePath}/${id}`, config);
        setError(null);
        return response.data?.data || response.data;
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code !== 'ERR_CANCELED') {
          return handleError(err);
        }
        throw err;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [api, basePath, handleError]
  );

  const create = useCallback(
    async (item: TCreate) => {
      setLoading(true);
      try {
        const response = await api.post(basePath, item);
        const newItem = response.data?.data || response.data;
        setData((prev) => [...prev, newItem]);
        setError(null);
        clearCache();
        onSuccess?.('创建成功');
        return newItem;
      } catch (err: unknown) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess, clearCache]
  );

  const update = useCallback(
    async (id: string | number, item: TUpdate) => {
      setLoading(true);
      try {
        const response = await api.put(`${basePath}/${id}`, item);
        const updatedItem = response.data?.data || response.data;
        setData((prev) => prev.map((d) => (d.id === id ? updatedItem : d)));
        setError(null);
        clearCache();
        onSuccess?.('更新成功');
        return updatedItem;
      } catch (err: unknown) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess, clearCache]
  );

  const deleteItem = useCallback(
    async (id: string | number) => {
      setLoading(true);
      try {
        await api.delete(`${basePath}/${id}`);
        setData((prev) => prev.filter((d) => d.id !== id));
        setError(null);
        clearCache();
        onSuccess?.('删除成功');
      } catch (err: unknown) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess, clearCache]
  );

  const bulkDelete = useCallback(
    async (ids: (string | number)[]) => {
      setLoading(true);
      try {
        await api.post(`${basePath}/bulk-delete`, { ids });
        setData((prev) => prev.filter((d) => !ids.includes(d.id as string | number)));
        setError(null);
        clearCache();
        onSuccess?.(`已删除 ${ids.length} 条记录`);
      } catch (err: unknown) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess, clearCache]
  );

  const refresh = useCallback(() => {
    clearCache();
    return fetch();
  }, [clearCache, fetch]);

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      total,
      setPage,
      setPageSize,
    }),
    [page, pageSize, total]
  );

  return {
    data,
    loading,
    error,
    fetch,
    get,
    create,
    update,
    delete: deleteItem,
    bulkDelete,
    pagination,
    refresh,
    clearCache,
  };
}

export default useCrud;