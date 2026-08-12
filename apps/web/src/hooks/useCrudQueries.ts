/**
 * Phase 3.3 - 标准化数据获取 hooks（基于 React Query）
 *
 * 提供两种 hook 工厂:
 * - useCrudQueries: 通用 CRUD（基于 AxiosInstance + basePath，类似现有 useCrud）
 * - useModuleQueries: 模块级 CRUD（基于 API 对象接口，类似 useErpBase）
 *
 * 使用 @tanstack/react-query 替代手动 useState/useEffect，
 * 自动获得缓存、自动重试、stale-while-revalidate 等能力。
 *
 * 不修改现有 useCrud.ts 和 useErp.ts，完全向后兼容。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { useNotificationStore } from '@/store';

// ============ 类型定义 ============

export interface CrudQueriesOptions<T> {
  /** Axios 实例 */
  api: AxiosInstance;
  /** API 基础路径，如 '/api/mes/orders' */
  basePath: string;
  /** React Query queryKey 前缀，如 'mes-orders' */
  queryKey: string;
  /** 是否自动获取列表（默认 true） */
  autoFetch?: boolean;
  /** 每页条数（默认 10） */
  defaultPageSize?: number;
  /** 成功回调 */
  onSuccess?: (message: string) => void;
  /** 失败回调 */
  onError?: (error: unknown) => void;
  /** 列表数据转换（从 Response 中提取 items） */
  transformList?: (response: unknown) => { items: T[]; total: number };
}

export interface ModuleQueriesOptions<T> {
  /** 模块 API 对象（必须实现 list/get/create/update/delete） */
  api: {
    list: (
      params?: Record<string, unknown>
    ) => Promise<{ success: boolean; data?: { items: T[]; total: number } }>;
    get: (id: string) => Promise<{ success: boolean; data?: T }>;
    create: (data: Partial<T>) => Promise<{ success: boolean; data?: T }>;
    update: (id: string, data: Partial<T>) => Promise<{ success: boolean; data?: T }>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  /** React Query queryKey 前缀 */
  queryKey: string;
  /** 是否自动获取列表（默认 true） */
  autoFetch?: boolean;
  /** 每页条数（默认 10） */
  defaultPageSize?: number;
}

export interface UseCrudQueriesResult<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  // Query 状态
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  // Query 操作
  fetch: (params?: Record<string, unknown>) => void;
  get: (id: string) => Promise<T | null>;
  refresh: () => void;
  // Mutation 操作（Promise 风格便捷方法）
  create: (item: TCreate) => Promise<T | null>;
  update: (id: string, item: TUpdate) => Promise<T | null>;
  delete: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  // 原始 Mutation 对象（用于访问 isPending/isError/onMutate 等高级用法）
  mutations: {
    createMutation: ReturnType<typeof useMutation<T | null, Error, TCreate, unknown>>;
    updateMutation: ReturnType<
      typeof useMutation<T | null, Error, { id: string; item: TUpdate }, unknown>
    >;
    deleteMutation: ReturnType<typeof useMutation<void, Error, string, unknown>>;
    bulkDeleteMutation: ReturnType<typeof useMutation<void, Error, string[], unknown>>;
  };
}

// ============ 内部辅助 ============

/** 默认的列表数据转换，兼容 { items, total } 和 嵌套 data 结构 */
function defaultTransformList<T>(response: unknown): { items: T[]; total: number } {
  const data = (response as { data?: unknown })?.data ?? response;
  const items =
    (data as { items?: T[] })?.items ??
    (data as { data?: T[] })?.data ??
    (Array.isArray(data) ? (data as T[]) : []);
  const total = (data as { total?: number })?.total ?? items.length;
  return { items, total };
}

// ============ useCrudQueries ============

/**
 * 基于 React Query 的通用 CRUD hook 工厂。
 *
 * 与现有 useCrud 对比:
 * - 不再手动管理 useState/useEffect
 * - 自动缓存（staleTime 默认 5 分钟）
 * - 自动重试失败请求
 * - mutations 自动 invalidate 相关 queryKey
 *
 * @example
 * ```tsx
 * // MES 工单模块
 * const { data, loading, create, update, delete, pagination } = useCrudQueries<Order>({
 *   api: mesApi,
 *   basePath: '/api/mes/work-orders',
 *   queryKey: 'mes-work-orders',
 * });
 * ```
 */
export function useCrudQueries<
  T extends { id?: string | number },
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
>(options: CrudQueriesOptions<T>): UseCrudQueriesResult<T, TCreate, TUpdate> {
  const {
    api,
    basePath,
    queryKey,
    autoFetch = true,
    defaultPageSize = 10,
    onSuccess,
    onError,
    transformList = defaultTransformList,
  } = options;

  const queryClient = useQueryClient();

  // ---- 分页状态 ----
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [extraParams, setExtraParams] = useState<Record<string, unknown>>({});

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1); // 切换每页条数时回到第 1 页
  }, []);

  // ---- 列表查询 ----
  const listQueryKey = useMemo(
    () => [queryKey, 'list', page, pageSize, extraParams],
    [queryKey, page, pageSize, extraParams]
  );

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: async () => {
      const response = await api.get(basePath, {
        params: { page, pageSize, ...extraParams },
      });
      return transformList(response.data);
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000, // 5 分钟
    retry: 2,
  });

  const data = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const pagination = useMemo(
    () => ({ page, pageSize, total, setPage, setPageSize }),
    [page, pageSize, total, setPage, setPageSize]
  );

  // ---- fetch（手动触发 + 额外参数） ----
  const fetch = useCallback(
    (params?: Record<string, unknown>) => {
      if (params) {
        setExtraParams(params);
      }
      // 强制 refetch
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
    },
    [queryClient, queryKey]
  );

  // ---- get（单条记录查询） ----
  const getItem = useCallback(
    async (id: string): Promise<T | null> => {
      try {
        const cached = queryClient.getQueryData<T>([queryKey, 'detail', id]);
        if (cached) return cached;

        const response = await api.get(`${basePath}/${id}`);
        const item = response.data?.data ?? response.data;
        queryClient.setQueryData([queryKey, 'detail', id], item);
        return item;
      } catch (err: unknown) {
        onError?.(err);
        return null;
      }
    },
    [api, basePath, queryKey, queryClient, onError]
  );

  // ---- 刷新 ----
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
  }, [queryClient, queryKey]);

  // ---- 错误处理辅助 ----
  const handleMutationError = useCallback(
    (err: unknown, _defaultMessage: string) => {
      onError?.(err);
      return Promise.reject(err);
    },
    [onError]
  );

  // ---- create ----
  const createMutation = useMutation({
    mutationFn: async (item: TCreate) => {
      const response = await api.post(basePath, item);
      return response.data?.data ?? response.data;
    },
    onSuccess: (_newItem: T) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
      onSuccess?.('创建成功');
    },
    onError: (err) => handleMutationError(err, '创建失败'),
  });

  // ---- update ----
  const updateMutation = useMutation({
    mutationFn: async ({ id, item }: { id: string; item: TUpdate }) => {
      const response = await api.put(`${basePath}/${id}`, item);
      return response.data?.data ?? response.data;
    },
    onSuccess: (_updatedItem: T, variables: { id: string; item: TUpdate }) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({
        queryKey: [queryKey, 'detail', variables.id],
      
  exact: false,
  refetchType: 'active',
});
      onSuccess?.('更新成功');
    },
    onError: (err) => handleMutationError(err, '更新失败'),
  });

  // ---- delete ----
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${basePath}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
      onSuccess?.('删除成功');
    },
    onError: (err) => handleMutationError(err, '删除失败'),
  });

  // ---- bulkDelete ----
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post(`${basePath}/bulk-delete`, { ids });
    },
    onSuccess: (_data: void, variables: string[]) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
      onSuccess?.(`已删除 ${variables.length} 条记录`);
    },
    onError: (err) => handleMutationError(err, '批量删除失败'),
  });

  // ---- 便捷方法 ----
  const create = useCallback(
    (item: TCreate) => createMutation.mutateAsync(item) as Promise<T | null>,
    [createMutation]
  );

  const update = useCallback(
    (id: string, item: TUpdate) => updateMutation.mutateAsync({ id, item }) as Promise<T | null>,
    [updateMutation]
  );

  const deleteItem = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);

  const bulkDelete = useCallback(
    (ids: string[]) => bulkDeleteMutation.mutateAsync(ids),
    [bulkDeleteMutation]
  );

  // ---- 合并 loading 状态 ----
  const loading =
    listQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending;

  // ---- 错误状态 ----
  const error: string | null = (listQuery.error as Error)?.message ?? null;

  return {
    data,
    loading,
    error,
    pagination,
    fetch,
    get: getItem,
    refresh,
    create,
    update,
    delete: deleteItem,
    bulkDelete,
    mutations: {
      createMutation,
      updateMutation,
      deleteMutation,
      bulkDeleteMutation,
    },
  };
}

// ============ useModuleQueries ============

/**
 * 基于 React Query 的模块级 CRUD hook 工厂。
 *
 * 与现有 useErpBase 对比:
 * - 接受相同结构的 API 对象（list/get/create/update/delete）
 * - 自动集成 addNotification（从 useNotificationStore）
 * - 使用 React Query 管理缓存和状态
 *
 * @example
 * ```tsx
 * // WMS 库位模块
 * const { data, loading, create, update, delete, pagination } = useModuleQueries<Location>({
 *   api: locationApi,
 *   queryKey: 'wms-locations',
 * });
 * ```
 */
export function useModuleQueries<T extends { id?: string }>(
  options: ModuleQueriesOptions<T>
): UseCrudQueriesResult<T> {
  const { api, queryKey, autoFetch = true, defaultPageSize = 10 } = options;

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // ---- 分页状态 ----
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [extraParams, setExtraParams] = useState<Record<string, unknown>>({});

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1);
  }, []);

  // ---- 列表查询 ----
  const listQueryKey = useMemo(
    () => [queryKey, 'list', page, pageSize, extraParams],
    [queryKey, page, pageSize, extraParams]
  );

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: async () => {
      const response = await api.list({ page, pageSize, ...extraParams });
      if (!response.success || !response.data) {
        throw new Error('加载数据失败');
      }
      return response.data;
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const data = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const pagination = useMemo(
    () => ({ page, pageSize, total, setPage, setPageSize }),
    [page, pageSize, total, setPage, setPageSize]
  );

  // ---- fetch ----
  const fetch = useCallback(
    (params?: Record<string, unknown>) => {
      if (params) {
        setExtraParams(params);
      }
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
    },
    [queryClient, queryKey]
  );

  // ---- get（单条） ----
  const getItem = useCallback(
    async (id: string): Promise<T | null> => {
      try {
        const cached = queryClient.getQueryData<T>([queryKey, 'detail', id]);
        if (cached) return cached;

        const response = await api.get(id);
        if (response.success && response.data) {
          queryClient.setQueryData([queryKey, 'detail', id], response.data);
          return response.data;
        }
        return null;
      } catch (err: unknown) {
        const errAny = err as { response?: { data?: { message?: string } }; message?: string };
        const message = errAny?.response?.data?.message || errAny?.message || '获取数据失败';
        addNotification({ title: '错误', message, type: 'error' });
        return null;
      }
    },
    [api, queryKey, queryClient, addNotification]
  );

  // ---- refresh ----
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
  }, [queryClient, queryKey]);

  // ---- 错误通知辅助 ----
  const notifyError = useCallback(
    (err: unknown, defaultMessage: string) => {
      const errAny = err as { response?: { data?: { message?: string } }; message?: string };
      const message = errAny?.response?.data?.message || errAny?.message || defaultMessage;
      addNotification({ title: '错误', message, type: 'error' });
      return Promise.reject(err);
    },
    [addNotification]
  );

  const notifySuccess = useCallback(
    (message: string) => {
      addNotification({ title: '成功', message, type: 'success' });
    },
    [addNotification]
  );

  // ---- create ----
  const createMutation = useMutation({
    mutationFn: async (item: Partial<T>) => {
      const response = await api.create(item);
      if (!response.success) {
        throw new Error('创建失败');
      }
      return response.data ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
      notifySuccess('创建成功');
    },
    onError: (err) => notifyError(err, '创建失败'),
  });

  // ---- update ----
  const updateMutation = useMutation({
    mutationFn: async ({ id, item }: { id: string; item: Partial<T> }) => {
      const response = await api.update(id, item);
      if (!response.success) {
        throw new Error('更新失败');
      }
      return response.data ?? null;
    },
    onSuccess: (_data: T | null, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({
        queryKey: [queryKey, 'detail', variables.id],
      
  exact: false,
  refetchType: 'active',
});
      notifySuccess('更新成功');
    },
    onError: (err) => notifyError(err, '更新失败'),
  });

  // ---- delete ----
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(id);
      if (!response.success) {
        throw new Error('删除失败');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
      notifySuccess('删除成功');
    },
    onError: (err) => notifyError(err, '删除失败'),
  });

  // ---- bulkDelete ----
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(id)));
    },
    onSuccess: (_data: void, variables: string[]) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
      notifySuccess(`已删除 ${variables.length} 条记录`);
    },
    onError: (err) => notifyError(err, '批量删除失败'),
  });

  // ---- 便捷方法 ----
  const create = useCallback(
    (item: Partial<T>) => createMutation.mutateAsync(item) as Promise<T | null>,
    [createMutation]
  );

  const update = useCallback(
    (id: string, item: Partial<T>) => updateMutation.mutateAsync({ id, item }) as Promise<T | null>,
    [updateMutation]
  );

  const deleteItem = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);

  const bulkDelete = useCallback(
    (ids: string[]) => bulkDeleteMutation.mutateAsync(ids),
    [bulkDeleteMutation]
  );

  // ---- 合并 loading ----
  const loading =
    listQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending;

  const error: string | null = (listQuery.error as Error)?.message ?? null;

  return {
    data,
    loading,
    error,
    pagination,
    fetch,
    get: getItem,
    refresh,
    create,
    update,
    delete: deleteItem,
    bulkDelete,
    mutations: {
      createMutation,
      updateMutation,
      deleteMutation,
      bulkDeleteMutation,
    },
  };
}

// ============ useCrudOperations ============

export interface CrudOperations<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<{
    success: boolean;
    code: number;
    message: string;
    data?: { items: T[]; total: number; page?: number; pagesize?: number };
  }>;
  get: (id: string) => Promise<{ success: boolean; code: number; message: string; data?: T }>;
  create: (data: TCreate) => Promise<{ success: boolean; code: number; message: string; data?: T }>;
  update: (
    id: string,
    data: TUpdate
  ) => Promise<{ success: boolean; code: number; message: string; data?: T }>;
  delete: (
    id: string
  ) => Promise<{ success: boolean; code: number; message: string; data?: string }>;
}

export interface UseCrudOperationsOptions<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  api: CrudOperations<T, TCreate, TUpdate>;
  queryKey: string;
  autoFetch?: boolean;
  defaultPageSize?: number;
  pageParamName?: string;
  pageSizeParamName?: string;
  /** 实体名称（用于通知消息，如"用户"、"客户"）。传入后通知会变为"用户创建成功"等语义化文案 */
  entityName?: string;
}

/**
 * 适配标准 CrudOperations 接口的 React Query hook。
 *
 * 适用于所有实现了 list/get/create/update/delete 标准接口的 API 模块，
 * 如 hrm/departmentApi、hrm/companyApi、hrm/employeeApi 等。
 *
 * @example
 * ```tsx
 * const { data, loading, create, update, delete: remove, pagination } = useCrudOperations<Department>({
 *   api: departmentApi,
 *   queryKey: 'hrm-departments',
 *   defaultPageSize: 20,
 * });
 * ```
 */
export function useCrudOperations<
  T extends { id?: string | number },
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
>(
  options: UseCrudOperationsOptions<T, TCreate, TUpdate>
): UseCrudQueriesResult<T, TCreate, TUpdate> {
  const {
    api,
    queryKey,
    autoFetch = true,
    defaultPageSize = 10,
    pageParamName = 'page',
    pageSizeParamName = 'pagesize',
    entityName,
  } = options;

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [extraParams, setExtraParams] = useState<Record<string, unknown>>({});

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1);
  }, []);

  const listQueryKey = useMemo(
    () => [queryKey, 'list', page, pageSize, extraParams],
    [queryKey, page, pageSize, extraParams]
  );

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: async () => {
      const response = await api.list({
        [pageParamName]: page,
        [pageSizeParamName]: pageSize,
        ...extraParams,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载数据失败');
      }
      return { items: response.data.items, total: response.data.total };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const data = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const pagination = useMemo(
    () => ({ page, pageSize, total, setPage, setPageSize }),
    [page, pageSize, total, setPage, setPageSize]
  );

  const fetch = useCallback(
    (params?: Record<string, unknown>) => {
      if (params) {
        setExtraParams(params);
      }
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
    },
    [queryClient, queryKey]
  );

  const getItem = useCallback(
    async (id: string): Promise<T | null> => {
      try {
        const cached = queryClient.getQueryData<T>([queryKey, 'detail', id]);
        if (cached) return cached;

        const response = await api.get(id);
        if (response.success && response.data) {
          queryClient.setQueryData([queryKey, 'detail', id], response.data);
          return response.data;
        }
        return null;
      } catch (err: unknown) {
        const errAny = err as { response?: { data?: { message?: string } }; message?: string };
        const message = errAny?.response?.data?.message || errAny?.message || '获取数据失败';
        addNotification({ title: '错误', message, type: 'error' });
        return null;
      }
    },
    [api, queryKey, queryClient, addNotification]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
  }, [queryClient, queryKey]);

  const notifyError = useCallback(
    (err: unknown, defaultMessage: string) => {
      const errAny = err as { response?: { data?: { message?: string } }; message?: string };
      const message = errAny?.response?.data?.message || errAny?.message || defaultMessage;
      addNotification({ title: '错误', message, type: 'error' });
      return Promise.reject(err);
    },
    [addNotification]
  );

  const notifySuccess = useCallback(
    (message: string) => {
      addNotification({ title: '成功', message, type: 'success' });
    },
    [addNotification]
  );

  // 语义化通知文案：传入 entityName 时变为"用户创建成功"，否则使用默认"创建成功"
  const msgCreate = entityName ? `${entityName}创建成功` : '创建成功';
  const msgUpdate = entityName ? `${entityName}更新成功` : '更新成功';
  const msgDelete = entityName ? `${entityName}删除成功` : '删除成功';
  const msgCreateErr = entityName ? `${entityName}创建失败` : '创建失败';
  const msgUpdateErr = entityName ? `${entityName}更新失败` : '更新失败';
  const msgDeleteErr = entityName ? `${entityName}删除失败` : '删除失败';

  const createMutation = useMutation({
    mutationFn: async (item: TCreate) => {
      const response = await api.create(item);
      if (!response.success) {
        throw new Error(response.message || msgCreateErr);
      }
      return response.data ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
      notifySuccess(msgCreate);
    },
    onError: (err) => notifyError(err, msgCreateErr),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, item }: { id: string; item: TUpdate }) => {
      const response = await api.update(id, item);
      if (!response.success) {
        throw new Error(response.message || msgUpdateErr);
      }
      return response.data ?? null;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: [queryKey, 'detail', variables.id] ,
  exact: false,
  refetchType: 'active',
});
      notifySuccess(msgUpdate);
    },
    onError: (err) => notifyError(err, msgUpdateErr),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(id);
      if (!response.success) {
        throw new Error(response.message || msgDeleteErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
      notifySuccess(msgDelete);
    },
    onError: (err) => notifyError(err, msgDeleteErr),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(id)));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] ,
  exact: false,
  refetchType: 'active',
});
      notifySuccess(
        entityName
          ? `已删除 ${variables.length} 个${entityName}`
          : `已删除 ${variables.length} 条记录`
      );
    },
    onError: (err) => notifyError(err, '批量删除失败'),
  });

  const create = useCallback(
    (item: TCreate) => createMutation.mutateAsync(item) as Promise<T | null>,
    [createMutation]
  );

  const update = useCallback(
    (id: string, item: TUpdate) => updateMutation.mutateAsync({ id, item }) as Promise<T | null>,
    [updateMutation]
  );

  const deleteItem = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);

  const bulkDelete = useCallback(
    (ids: string[]) => bulkDeleteMutation.mutateAsync(ids),
    [bulkDeleteMutation]
  );

  const loading =
    listQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending;

  const error: string | null = (listQuery.error as Error)?.message ?? null;

  return {
    data,
    loading,
    error,
    pagination,
    fetch,
    get: getItem,
    refresh,
    create,
    update,
    delete: deleteItem,
    bulkDelete,
    mutations: {
      createMutation,
      updateMutation,
      deleteMutation,
      bulkDeleteMutation,
    },
  };
}

// ============ 导出 ============

export default { useCrudQueries, useModuleQueries, useCrudOperations };

// ============ 使用示例（参考） ============

/**
 * MES 模块 - 工单管理:
 * ```tsx
 * import { useCrudQueries } from '@/hooks/useCrudQueries';
 * import type { WorkOrder } from '@/types/mes';
 * import mesApi from '@/api/mes';
 *
 * function WorkOrderList() {
 *   const {
 *     data: orders,
 *     loading,
 *     pagination,
 *     fetch,
 *     create,
 *     update,
 *     delete: deleteOrder,
 *     bulkDelete,
 *   } = useCrudQueries<WorkOrder>({
 *     api: mesApi,
 *     basePath: '/api/mes/work-orders',
 *     queryKey: 'mes-work-orders',
 *     defaultPageSize: 20,
 *   });
 *
 *   // 筛选
 *   const handleSearch = (keyword: string) => fetch({ keyword });
 *
 *   // ... 渲染表格、分页等
 * }
 * ```
 *
 * WMS 模块 - 库位管理（使用 useModuleQueries）:
 * ```tsx
 * import { useModuleQueries } from '@/hooks/useCrudQueries';
 * import type { Location } from '@/types/wms';
 * import { locationApi } from '@/api/wms';
 *
 * function LocationList() {
 *   const { data, loading, pagination, create, update, delete } =
 *     useModuleQueries<Location>({
 *       api: locationApi,
 *       queryKey: 'wms-locations',
 *     });
 *
 *   // 自动集成通知，创建/更新/删除后自动弹出成功提示
 *   // ...
 * }
 * ```
 */
