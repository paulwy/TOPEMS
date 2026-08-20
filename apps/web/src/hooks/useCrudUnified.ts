/**
 * useCrudUnified — 统一泛型 CRUD hook（基于 React Query）
 *
 * 整合以下 5+1 个既有 CRUD hook 的能力，消除重复实现：
 *   - useCrudQueries        （AxiosInstance + basePath 模式）
 *   - useModuleQueries      （API 对象：list/get/create/update/delete）
 *   - useCrudOperations     （CrudOperations 接口：success/code/message）
 *   - useResourceCRUD       （queryFn + createFn/updateFn/deleteFn）
 *   - useCrudMutations      （仅 mutations，无 list 查询）
 *   - useCrud (shared-hooks)（旧版 useState/useEffect 实现，被 React Query 版替代）
 *
 * 通过统一的 `CrudAdapter<T, TCreate, TUpdate>` 接口抽象数据源，
 * 并提供 4 个 adapter 工厂函数覆盖现有所有调用模式：
 *   - createAxiosAdapter          （替代 useCrudQueries）
 *   - createCrudOperationsAdapter （替代 useCrudOperations）
 *   - createModuleAdapter         （替代 useModuleQueries）
 *   - createFunctionAdapter       （替代 useResourceCRUD / useCrudMutations）
 *
 * @example
 * ```tsx
 * // 1) 替代 useCrudOperations（最常见）
 * const adapter = createCrudOperationsAdapter(datasetCrudApi);
 * const { data, loading, create, update, delete: remove, pagination } =
 *   useCrudUnified<Dataset>({ adapter, queryKey: QUERY_KEYS.AD_HOC.BI_DATASETS_BASE });
 *
 * // 2) 替代 useCrudQueries（axios + basePath）
 * const adapter = createAxiosAdapter(mesApi, '/api/mes/work-orders');
 * const { data, loading, create, update } =
 *   useCrudUnified<WorkOrder>({ adapter, queryKey: QUERY_KEYS.AD_HOC.MES_WORK_ORDERS_BASE });
 *
 * // 3) 仅 mutations（替代 useCrudMutations）
 * const adapter = createFunctionAdapter({
 *   createFn: (data) => qmsApi.createStandard(data),
 *   updateFn: ({ id, data }) => qmsApi.updateStandard(id, data),
 *   deleteFn: (id) => qmsApi.deleteStandard(id),
 * });
 * const { create, update, delete: remove, mutations } =
 *   useCrudUnified<Standard>({
 *     adapter,
 *     queryKey: QUERY_KEYS.QMS.STANDARDS,
 *     enableList: false,   // 关闭列表查询，等价于 useCrudMutations
 *     entityName: '质量标准',
 *   });
 * ```
 */
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

// ============ 从 shared-types 导入统一 CRUD 类型（并重新导出以保持兼容） ============
import type {
  CrudListParams as _CrudListParams,
  CrudListResult as _CrudListResult,
  CrudAdapter as _CrudAdapter,
  UseCrudUnifiedOptions as _UseCrudUnifiedOptions,
  UseCrudUnifiedResult as _UseCrudUnifiedResult,
} from '@topems/shared-types';

// 重新导出，保持调用方代码不变
export type CrudListParams = _CrudListParams;
export type CrudListResult<T> = _CrudListResult<T>;
export type CrudAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>> = _CrudAdapter<
  T,
  TCreate,
  TUpdate
>;
export type UseCrudUnifiedOptions<
  T,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> = _UseCrudUnifiedOptions<T, TCreate, TUpdate>;
export type UseCrudUnifiedResult<
  T,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> = _UseCrudUnifiedResult<T, TCreate, TUpdate>;

// ============ 通用类型（由 @topems/shared-types 提供，见文件顶部 import/export） ============
// 类型定义已移至 packages/shared-types/src/crud.ts
// 此处保留类型别名 re-export 以保证调用方代码不变

// ============ Adapter 工厂 ============

/**
 * 从 AxiosInstance + basePath 构造 adapter（替代 useCrudQueries）
 */
export interface AxiosCrudAdapterOptions {
  api: AxiosInstance;
  basePath: string;
  /** 列表响应转换（默认从 response.data.items / response.data.data 提取） */
  transformList?: (response: unknown) => CrudListResult<unknown>;
}

function defaultAxiosTransformList(response: unknown): CrudListResult<unknown> {
  const data = (response as { data?: unknown })?.data ?? response;
  const items =
    (data as { items?: unknown[] })?.items ??
    (data as { data?: unknown[] })?.data ??
    (Array.isArray(data) ? data : []);
  const total = (data as { total?: number })?.total ?? items.length;
  return { items, total };
}

function createAxiosAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  options: AxiosCrudAdapterOptions
): CrudAdapter<T, TCreate, TUpdate> {
  const { api, basePath, transformList = defaultAxiosTransformList } = options;

  return {
    list: async (params) => {
      const response = await api.get(basePath, {
        params: { page: params.page, pageSize: params.pageSize, ...params },
      });
      return transformList(response.data) as CrudListResult<T>;
    },
    get: async (id) => {
      const response = await api.get(`${basePath}/${id}`);
      return (response.data?.data ?? response.data) as T;
    },
    create: async (data) => {
      const response = await api.post(basePath, data);
      return (response.data?.data ?? response.data) as T;
    },
    update: async ({ id, data }) => {
      const response = await api.put(`${basePath}/${id}`, data);
      return (response.data?.data ?? response.data) as T;
    },
    delete: async (id) => {
      await api.delete(`${basePath}/${id}`);
    },
  };
}

/**
 * 从 CrudOperations 接口构造 adapter（替代 useCrudOperations）
 *
 * 适配 { success, code, message, data } 标准响应格式。
 */
export interface CrudOperationsAdapterOptions<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  api: {
    list: (params?: Record<string, unknown>) => Promise<{
      success: boolean;
      code?: number;
      message?: string;
      data?: { items: T[]; total: number; page?: number; pagesize?: number };
    }>;
    get?: (id: string) => Promise<{
      success: boolean;
      code?: number;
      message?: string;
      data?: T;
    }>;
    create: (data: TCreate) => Promise<{
      success: boolean;
      code?: number;
      message?: string;
      data?: T;
    }>;
    update: (
      id: string,
      data: TUpdate
    ) => Promise<{
      success: boolean;
      code?: number;
      message?: string;
      data?: T;
    }>;
    delete: (id: string) => Promise<{
      success: boolean;
      code?: number;
      message?: string;
      data?: unknown;
    }>;
  };
  /** 列表分页参数名，默认 'page' */
  pageParamName?: string;
  /** 列表每页大小参数名，默认 'pagesize' */
  pageSizeParamName?: string;
}

function createCrudOperationsAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  options: CrudOperationsAdapterOptions<T, TCreate, TUpdate>
): CrudAdapter<T, TCreate, TUpdate> {
  const { api, pageParamName = 'page', pageSizeParamName = 'pagesize' } = options;

  return {
    list: async (params) => {
      const response = await api.list({
        [pageParamName]: params.page,
        [pageSizeParamName]: params.pageSize,
        ...params,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('shared.use_crud_unified.k0'));
      }
      return { items: response.data.items, total: response.data.total };
    },
    get: api.get
      ? async (id) => {
          const response = await api.get!(id);
          if (!response.success || !response.data) {
            throw new Error(response.message || i18n.t('shared.use_crud_unified.k1'));
          }
          return response.data;
        }
      : undefined,
    create: async (data) => {
      const response = await api.create(data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('shared.use_crud_unified.k2'));
      }
      return response.data as T;
    },
    update: async ({ id, data }) => {
      const response = await api.update(id, data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('shared.use_crud_unified.k3'));
      }
      return response.data as T;
    },
    delete: async (id) => {
      const response = await api.delete(id);
      if (!response.success) {
        throw new Error(response.message || i18n.t('shared.use_crud_unified.k4'));
      }
    },
  };
}

/**
 * 从模块 API 对象构造 adapter（替代 useModuleQueries）
 *
 * 适配 { success, data } 简化响应格式。
 */
function createModuleAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>>(api: {
  list: (params?: Record<string, unknown>) => Promise<{
    success: boolean;
    data?: { items: T[]; total: number };
  }>;
  get?: (id: string) => Promise<{ success: boolean; data?: T }>;
  create: (data: TCreate) => Promise<{ success: boolean; data?: T }>;
  update: (id: string, data: TUpdate) => Promise<{ success: boolean; data?: T }>;
  delete: (id: string) => Promise<{ success: boolean }>;
}): CrudAdapter<T, TCreate, TUpdate> {
  return {
    list: async (params) => {
      const response = await api.list(params);
      if (!response.success || !response.data) {
        throw new Error(i18n.t('shared.use_crud_unified.k5'));
      }
      return response.data;
    },
    get: api.get
      ? async (id) => {
          const response = await api.get!(id);
          if (!response.success || !response.data) {
            throw new Error(i18n.t('shared.use_crud_unified.k6'));
          }
          return response.data;
        }
      : undefined,
    create: async (data) => {
      const response = await api.create(data);
      if (!response.success) {
        throw new Error(i18n.t('shared.use_crud_unified.k7'));
      }
      return response.data as T;
    },
    update: async ({ id, data }) => {
      const response = await api.update(id, data);
      if (!response.success) {
        throw new Error(i18n.t('shared.use_crud_unified.k8'));
      }
      return response.data as T;
    },
    delete: async (id) => {
      const response = await api.delete(id);
      if (!response.success) {
        throw new Error(i18n.t('shared.use_crud_unified.k9'));
      }
    },
  };
}

/**
 * 从独立函数构造 adapter（替代 useResourceCRUD / useCrudMutations）
 *
 * 适用于：
 * - 已有 queryFn + createFn/updateFn/deleteFn 的场景（替代 useResourceCRUD）
 * - 仅需 mutations 的场景（替代 useCrudMutations，list 留空 + enableList: false）
 */
export interface FunctionAdapterOptions<T, TCreate, TUpdate> {
  list?: (params: CrudListParams) => Promise<CrudListResult<T>>;
  get?: (id: string) => Promise<T | null>;
  createFn: (data: TCreate) => Promise<unknown>;
  updateFn: (args: { id: string; data: TUpdate }) => Promise<unknown>;
  deleteFn: (id: string) => Promise<unknown>;
  /** 从 createFn/updateFn 返回值中提取实体（默认透传） */
  transformResult?: (raw: unknown) => T;
}

function createFunctionAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  options: FunctionAdapterOptions<T, TCreate, TUpdate>
): CrudAdapter<T, TCreate, TUpdate> {
  const { list, get, createFn, updateFn, deleteFn, transformResult = (r) => r as T } = options;

  return {
    list,
    get,
    create: async (data) => transformResult(await createFn(data)),
    update: async (args) => transformResult(await updateFn(args)),
    delete: async (id) => {
      await deleteFn(id);
    },
  };
}

// ============ useCrudUnified 主 hook ============

// UseCrudUnifiedOptions 和 UseCrudUnifiedResult 类型
// 已由 @topems/shared-types 提供并在文件顶部 re-export，保证调用方代码不变

/**
 * 统一泛型 CRUD hook
 *
 * 通过传入不同的 `adapter` 即可覆盖现有所有 CRUD 调用模式，
 * 避免在 useCrudQueries / useModuleQueries / useCrudOperations /
 * useResourceCRUD / useCrudMutations 之间重复实现。
 *
 * @param options 配置项
 */
function useCrudUnified<
  T extends { id?: string | number },
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
>(options: UseCrudUnifiedOptions<T, TCreate, TUpdate>): UseCrudUnifiedResult<T, TCreate, TUpdate> {
  const {
    adapter,
    queryKey,
    enableList = true,
    autoFetch = true,
    defaultPageSize = 10,
    staleTime = 5 * 60 * 1000,
    retry = 2,
    entityName,
    showSuccessNotification = true,
    showErrorNotification = true,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
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

  // ---- 列表查询 ----
  const listQueryKey = useMemo(
    () => [...queryKey, 'list', page, pageSize, extraParams],
    [queryKey, page, pageSize, extraParams]
  );

  const listEnabled = enableList && autoFetch && !!adapter.list;
  // adapter.list 引用保持稳定时，listFn 也稳定
  const listFn = adapter.list;

  // 始终调用 useQuery 以遵守 Rules of Hooks；
  // 当 enableList=false 或 adapter.list 缺失时通过 enabled: false 跳过查询
  const listQuery = useQuery<CrudListResult<T>, Error>({
    queryKey: listQueryKey,
    queryFn: async () => {
      if (!listFn) {
        return { items: [], total: 0 };
      }
      return listFn({ page, pageSize, ...extraParams });
    },
    enabled: listEnabled,
    staleTime,
    retry,
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
      queryClient.invalidateQueries({
        queryKey: [...queryKey, 'list'],
        exact: false,
        refetchType: 'active',
      });
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

        let item: T | null = null;
        if (adapter.get) {
          item = await adapter.get(id);
        } else {
          throw new Error('adapter.get is not provided');
        }
        if (item) {
          queryClient.setQueryData(detailKey, item);
        }
        return item;
      } catch (err) {
        const message = extractErrorMessage(err, i18n.t('shared.use_crud_unified.k10'));
        if (showErrorNotification) {
          addNotification({ title: i18n.t('shared.use_crud_unified.k11'), message, type: 'error' });
        }
        return null;
      }
    },
    [adapter, queryKey, queryClient, addNotification, showErrorNotification]
  );

  // ---- refresh ----
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey, exact: false, refetchType: 'active' });
  }, [queryClient, queryKey]);

  // ---- 通知辅助 ----
  const notifySuccess = useCallback(
    (message: string) => {
      if (showSuccessNotification) {
        addNotification({ title: i18n.t('shared.use_crud_unified.k12'), message, type: 'success' });
      }
    },
    [addNotification, showSuccessNotification]
  );

  const notifyError = useCallback(
    (err: unknown, defaultMessage: string) => {
      apiLogger.error(
        `${entityName ?? i18n.t('shared.use_crud_unified.k13')}${defaultMessage}:`,
        err
      );
      if (showErrorNotification) {
        const message = extractErrorMessage(
          err,
          `${entityName ?? i18n.t('shared.use_crud_unified.k14')}${defaultMessage}`
        );
        addNotification({ title: i18n.t('shared.use_crud_unified.k15'), message, type: 'error' });
      }
    },
    [entityName, addNotification, showErrorNotification]
  );

  // 语义化通知文案
  const label = entityName ?? i18n.t('shared.use_crud_unified.k16');
  const msgCreate = `${label}${i18n.t('shared.use_crud_unified.k0')}`;
  const msgUpdate = `${label}${i18n.t('shared.use_crud_unified.k1')}`;
  const msgDelete = `${label}${i18n.t('shared.use_crud_unified.k2')}`;

  // ---- create ----
  const createMutation = useMutation<T | null, Error, TCreate, unknown>({
    mutationFn: async (item: TCreate) => {
      return adapter.create(item);
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKey, 'list'],
        exact: false,
        refetchType: 'active',
      });
      notifySuccess(msgCreate);
      if (newItem) onCreateSuccess?.(newItem);
    },
    onError: (err) => notifyError(err, i18n.t('shared.use_crud_unified.k17')),
  });

  // ---- update ----
  const updateMutation = useMutation<T | null, Error, { id: string; item: TUpdate }, unknown>({
    mutationFn: async ({ id, item }) => {
      return adapter.update({ id, data: item });
    },
    onSuccess: (updatedItem, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKey, 'list'],
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKey, 'detail', variables.id],
        exact: false,
        refetchType: 'active',
      });
      notifySuccess(msgUpdate);
      if (updatedItem) onUpdateSuccess?.(updatedItem, variables.id);
    },
    onError: (err) => notifyError(err, i18n.t('shared.use_crud_unified.k18')),
  });

  // ---- delete ----
  const deleteMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id: string) => {
      await adapter.delete(id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey, exact: false, refetchType: 'active' });
      notifySuccess(msgDelete);
      onDeleteSuccess?.(id);
    },
    onError: (err) => notifyError(err, i18n.t('shared.use_crud_unified.k19')),
  });

  // ---- bulkDelete（串行调用 adapter.delete） ----
  const bulkDeleteMutation = useMutation<void, Error, string[], unknown>({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => adapter.delete(id)));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey, exact: false, refetchType: 'active' });
      notifySuccess(
        entityName
          ? `${i18n.t('shared.use_crud_unified.k3')}${variables.length}${i18n.t('shared.use_crud_unified.k4')}${entityName}`
          : `${i18n.t('shared.use_crud_unified.k5')}${variables.length}${i18n.t('shared.use_crud_unified.k6')}`
      );
    },
    onError: (err) => notifyError(err, i18n.t('shared.use_crud_unified.k20')),
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
    (listQuery?.isLoading ?? false) ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending;

  // ---- 错误状态 ----
  const error: string | null = listQuery?.error ? extractErrorMessage(listQuery.error) : null;

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

export default useCrudUnified;
