/**
 * V39.0 Track D: 通用 BFF GraphQL CRUD hook
 *
 * 基于 React Query 封装 BFF GraphQL 通用 CRUD 操作，
 * 让所有 CRUD 列表页都能方便地接入 BFF GraphQL，替代直接 REST 调用。
 *
 * 所有操作通过 BFF GraphQL 出口：
 * - list: listEntitiesGql（通用实体列表查询）
 * - get:  getFederatedEntityGql（联邦单实体查询）
 * - create: createEntityGql + invalidateQueries
 * - update: updateEntityGql + invalidateQueries
 * - delete: deleteEntityGql + invalidateQueries
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   loading,
 *   error,
 *   pagination,
 *   create,
 *   update,
 *   delete: remove,
 *   refresh,
 * } = useBffCrud<Customer>({
 *   service: 'crm',
 *   entityType: 'customers',
 *   queryKey: ['bff', 'crm', 'customers'],
 *   entityName: '客户',
 * });
 * ```
 */

import { useCallback, useMemo, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  listEntitiesGql,
  getFederatedEntityGql,
  createEntityGql,
  updateEntityGql,
  deleteEntityGql,
  type ListEntitiesParams,
} from '@/api/bff';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';

/** useBffCrud 配置项 */
export interface UseBffCrudOptions<T> {
  /** 服务名：'erp' | 'crm' | 'hrm' | 'finance' | 'mes' 等 */
  service: string;
  /** 实体类型：'customers' | 'employees' | 'vouchers' 等 */
  entityType: string;
  /** React Query queryKey（基础键，内部会追加 list/detail/page 等维度） */
  queryKey: unknown[];
  /** 缓存新鲜时间（毫秒），默认 5 分钟 */
  staleTime?: number;
  /** 是否自动获取列表，默认 true */
  autoFetch?: boolean;
  /** 默认每页条数，默认 10 */
  defaultPageSize?: number;
  /** 实体名称（用于通知消息，如"客户"、"员工"） */
  entityName?: string;
  /** 列表数据转换：从 BFF 返回的 data 字段提取实体数组（默认透传） */
  transformItem?: (raw: unknown) => T;
}

/** useBffCrud 返回值 */
export interface UseBffCrudResult<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  // 列表数据
  data: T[];
  total: number;
  loading: boolean;
  error: string | null;
  // 分页
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  // 列表查询
  listQuery: UseQueryResult<{ items: T[]; total: number }, Error>;
  // 手动筛选
  fetch: (params?: Record<string, unknown>) => void;
  // 单实体查询（Promise 风格，带缓存）
  get: (id: string) => Promise<T | null>;
  // 刷新
  refresh: () => void;
  // Mutation 便捷方法（Promise 风格）
  create: (item: TCreate) => Promise<T | null>;
  update: (id: string, item: TUpdate) => Promise<T | null>;
  delete: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  // 原始 Mutation 对象（用于访问 isPending/isError 等高级用法）
  mutations: {
    createMutation: UseMutationResult<T | null, Error, TCreate, unknown>;
    updateMutation: UseMutationResult<T | null, Error, { id: string; item: TUpdate }, unknown>;
    deleteMutation: UseMutationResult<void, Error, string, unknown>;
    bulkDeleteMutation: UseMutationResult<void, Error, string[], unknown>;
  };
}

/** 默认实体转换：透传 */
function defaultTransformItem<T>(raw: unknown): T {
  return raw as T;
}

/**
 * 通用 BFF GraphQL CRUD hook
 *
 * @param options 配置项
 */
export function useBffCrud<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  options: UseBffCrudOptions<T>
): UseBffCrudResult<T, TCreate, TUpdate> {
  const {
    service,
    entityType,
    queryKey,
    staleTime = 5 * 60 * 1000,
    autoFetch = true,
    defaultPageSize = 10,
    entityName,
    transformItem = defaultTransformItem,
  } = options;

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

  // ---- 列表查询 key ----
  const listQueryKey = useMemo(
    () => [...queryKey, 'list', page, pageSize, extraParams],
    [queryKey, page, pageSize, extraParams]
  );

  // ---- 列表查询 ----
  const listQuery = useQuery<{ items: T[]; total: number }, Error>({
    queryKey: listQueryKey,
    queryFn: async () => {
      const params: ListEntitiesParams = {
        page,
        pageSize,
        ...extraParams,
      };
      const result = await listEntitiesGql<unknown>(service, entityType, params);
      return {
        items: result.items.map((item) => transformItem(item)),
        total: result.total,
      };
    },
    enabled: autoFetch,
    staleTime,
    retry: 2,
  });

  const data = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const pagination = useMemo(
    () => ({ page, pageSize, total, setPage, setPageSize }),
    [page, pageSize, total, setPage, setPageSize]
  );

  // ---- fetch（手动筛选 + 额外参数） ----
  const fetch = useCallback(
    (params?: Record<string, unknown>) => {
      if (params) {
        setExtraParams(params);
      }
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'list'] });
    },
    [queryClient, queryKey]
  );

  // ---- get（Promise 风格，带缓存） ----
  const getItem = useCallback(
    async (id: string): Promise<T | null> => {
      try {
        const detailKey = [...queryKey, 'detail', id];
        const cached = queryClient.getQueryData<T>(detailKey);
        if (cached) return cached;

        const result = await getFederatedEntityGql(service, entityType, id);
        const item = transformItem(result.data);
        queryClient.setQueryData(detailKey, item);
        return item;
      } catch (err) {
        const message = extractErrorMessage(err, '获取数据失败');
        addNotification({ title: '错误', message, type: 'error' });
        return null;
      }
    },
    [service, entityType, queryKey, queryClient, transformItem, addNotification]
  );

  // ---- refresh ----
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // ---- 通知辅助 ----
  const notifySuccess = useCallback(
    (message: string) => {
      addNotification({ title: '成功', message, type: 'success' });
    },
    [addNotification]
  );

  const notifyError = useCallback(
    (err: unknown, defaultMessage: string) => {
      const message = extractErrorMessage(err, defaultMessage);
      addNotification({ title: '错误', message, type: 'error' });
    },
    [addNotification]
  );

  // 语义化通知文案
  const label = entityName ?? '记录';
  const msgCreate = `${label}创建成功`;
  const msgUpdate = `${label}更新成功`;
  const msgDelete = `${label}删除成功`;
  const msgCreateErr = `${label}创建失败`;
  const msgUpdateErr = `${label}更新失败`;
  const msgDeleteErr = `${label}删除失败`;
  const msgBulkDeleteErr = `${label}批量删除失败`;

  // ---- create ----
  const createMutation = useMutation<T | null, Error, TCreate, unknown>({
    mutationFn: async (item: TCreate) => {
      const result = await createEntityGql(service, entityType, item as Record<string, unknown>);
      return transformItem(result.createEntity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'list'] });
      notifySuccess(msgCreate);
    },
    onError: (err) => notifyError(err, msgCreateErr),
  });

  // ---- update ----
  const updateMutation = useMutation<T | null, Error, { id: string; item: TUpdate }, unknown>({
    mutationFn: async ({ id, item }) => {
      const result = await updateEntityGql(
        service,
        entityType,
        id,
        item as Record<string, unknown>
      );
      return transformItem(result.updateEntity);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...queryKey, 'detail', variables.id] });
      notifySuccess(msgUpdate);
    },
    onError: (err) => notifyError(err, msgUpdateErr),
  });

  // ---- delete ----
  const deleteMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id: string) => {
      await deleteEntityGql(service, entityType, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      notifySuccess(msgDelete);
    },
    onError: (err) => notifyError(err, msgDeleteErr),
  });

  // ---- bulkDelete（串行调用 deleteEntityGql） ----
  const bulkDeleteMutation = useMutation<void, Error, string[], unknown>({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteEntityGql(service, entityType, id)));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey });
      notifySuccess(
        entityName
          ? `已删除 ${variables.length} 个${entityName}`
          : `已删除 ${variables.length} 条记录`
      );
    },
    onError: (err) => notifyError(err, msgBulkDeleteErr),
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

  // ---- 合并 loading ----
  const loading =
    listQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending;

  // ---- 错误状态 ----
  const error: string | null = listQuery.error?.message ?? null;

  return {
    data,
    total,
    loading,
    error,
    pagination,
    listQuery,
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

export default useBffCrud;
