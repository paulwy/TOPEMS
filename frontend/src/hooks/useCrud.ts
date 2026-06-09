import { useCallback, useState, useMemo } from 'react';
import { AxiosInstance } from 'axios';

export interface UseCrudOptions<T> {
  api: AxiosInstance;
  basePath: string;
  initialData?: T[];
  onError?: (error: any) => void;
  onSuccess?: (message: string) => void;
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
}

export function useCrud<T extends { id?: string | number }, TCreate = Omit<T, 'id'>, TUpdate = Partial<T>>({
  api,
  basePath,
  initialData = [],
  onError,
  onSuccess,
}: UseCrudOptions<T>): UseCrudResult<T, TCreate, TUpdate> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const handleError = useCallback(
    (err: any) => {
      const message = err?.response?.data?.message || err?.message || '操作失败';
      setError(message);
      onError?.(err);
      return Promise.reject(err);
    },
    [onError],
  );

  const fetch = useCallback(
    async (params?: Record<string, any>) => {
      setLoading(true);
      try {
        const response = await api.get(basePath, {
          params: {
            page,
            pageSize,
            ...params,
          },
        });
        setData(response.data?.items || response.data?.data || response.data);
        setTotal(response.data?.total || 0);
        setError(null);
        return response.data?.items || response.data?.data || response.data;
      } catch (err) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, page, pageSize, handleError],
  );

  const get = useCallback(
    async (id: string | number) => {
      setLoading(true);
      try {
        const response = await api.get(`${basePath}/${id}`);
        setError(null);
        return response.data?.data || response.data;
      } catch (err) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError],
  );

  const create = useCallback(
    async (item: TCreate) => {
      setLoading(true);
      try {
        const response = await api.post(basePath, item);
        const newItem = response.data?.data || response.data;
        setData((prev) => [...prev, newItem]);
        setError(null);
        onSuccess?.('创建成功');
        return newItem;
      } catch (err) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess],
  );

  const update = useCallback(
    async (id: string | number, item: TUpdate) => {
      setLoading(true);
      try {
        const response = await api.put(`${basePath}/${id}`, item);
        const updatedItem = response.data?.data || response.data;
        setData((prev) => prev.map((d) => (d.id === id ? updatedItem : d)));
        setError(null);
        onSuccess?.('更新成功');
        return updatedItem;
      } catch (err) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess],
  );

  const deleteItem = useCallback(
    async (id: string | number) => {
      setLoading(true);
      try {
        await api.delete(`${basePath}/${id}`);
        setData((prev) => prev.filter((d) => d.id !== id));
        setError(null);
        onSuccess?.('删除成功');
      } catch (err) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess],
  );

  const bulkDelete = useCallback(
    async (ids: (string | number)[]) => {
      setLoading(true);
      try {
        await api.post(`${basePath}/bulk-delete`, { ids });
        setData((prev) => prev.filter((d) => !ids.includes(d.id as string | number)));
        setError(null);
        onSuccess?.(`已删除 ${ids.length} 条记录`);
      } catch (err) {
        return handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [api, basePath, handleError, onSuccess],
  );

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      total,
      setPage,
      setPageSize,
    }),
    [page, pageSize, total],
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
  };
}

export default useCrud;
