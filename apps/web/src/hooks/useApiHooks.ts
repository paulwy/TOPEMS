/**
 * API相关Hooks
 * 提供常用的API数据获取和管理Hooks
 *
 * @deprecated Use useCrudQueries from hooks/useCrudQueries.ts instead
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ApiResponse as SharedApiResponse,
  PaginatedResponse as SharedPaginatedResponse,
} from '@topems/shared-types';

export type ApiResponse<T = any> = SharedApiResponse<T>;
export type PaginatedResponse<T = any> = SharedPaginatedResponse<T>;

/**
 * Hook 返回结果类型
 */
export interface UseApiResult<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T>;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
}

/**
 * Hook 分页返回结果类型
 */
export interface UsePaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * useApi - 通用的API调用hook
 */
export function useApi<T>(
  apiFunction: () => Promise<T>,
  options?: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { immediate = true, onSuccess, onError } = options || {};

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { data, loading, error, refetch: execute };
}

/**
 * usePaginatedApi - 分页API调用hook
 */
export function usePaginatedApi<T>(
  apiFunction: (params: PaginationParams) => Promise<PaginatedResponse<T>>,
  initialParams: Partial<PaginationParams> = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 10,
    ...initialParams,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunction(params);
      setData(response.items);
      setParams((prev) => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages,
      }));
      return response;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPage = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setParams({ page: 1, pageSize });
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    params,
    setPage,
    setPageSize,
    refresh,
    total: params.total || 0,
    totalPages: params.totalPages || 0,
  };
}

/**
 * useMutation - 突变操作hook (创建/更新/删除)
 */
export function useMutation<TData, TVariables = any>(
  mutationFunction: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data?: TData, error?: Error, variables?: TVariables) => void;
  }
) {
  const [data, setData] = useState<TData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFunction(variables);
        setData(result);
        options?.onSuccess?.(result, variables);
        options?.onSettled?.(result, undefined, variables);
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options?.onError?.(error, variables);
        options?.onSettled?.(undefined, error, variables);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [mutationFunction, options]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
  }, []);

  return { mutate, data, loading, error, reset };
}

/**
 * useInfiniteQuery - 无限滚动查询hook
 */
export function useInfiniteQuery<T>(
  queryFunction: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options?: {
    initialPage?: number;
    threshold?: number;
  }
) {
  const { initialPage = 1, threshold = 100 } = options || {};

  const [pages, setPages] = useState<T[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        async (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setLoading(true);
            try {
              const result = await queryFunction(page);
              setPages((prev) => [...prev, result.data]);
              setHasMore(result.hasMore);
              if (result.hasMore) {
                setPage((p) => p + 1);
              }
            } catch (err: unknown) {
              setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
              setLoading(false);
            }
          }
        },
        { rootMargin: `${threshold}px` }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [loading, hasMore, page, queryFunction, threshold]
  );

  const data = pages.flat();
  const reset = useCallback(() => {
    setPages([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  return { data, loading, error, hasMore, loadMoreRef, reset };
}

/**
 * useDebouncedQuery - 防抖查询hook
 */
export function useDebouncedQuery<T>(
  queryFunction: (search: string) => Promise<T[]>,
  debounceMs: number = 300
) {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQueryRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      return;
    }

    debouncedQueryRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await queryFunction(query);
        setData(result);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debouncedQueryRef.current) {
        clearTimeout(debouncedQueryRef.current);
      }
    };
  }, [query, debounceMs, queryFunction]);

  return { query, setQuery, data, loading };
}
