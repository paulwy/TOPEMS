// ============================================================
// 统一 CRUD 类型定义
// 覆盖 useCrudUnified、CrudPage、adapterFactory 等所有现有模式
// 与 apps/web/src/hooks/useCrudUnified.ts 的类型完全兼容
// ============================================================

import type {
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

// ============ 基础列表参数 & 结果 ============

/**
 * 列表查询参数
 * 与 useCrudUnified 的 CrudListParams 完全一致
 */
export interface CrudListParams {
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

/**
 * 列表查询结果
 * 与 useCrudUnified 的 CrudListResult 完全一致
 */
export interface CrudListResult<T> {
  items: T[];
  total: number;
}

// ============ useCrudUnified 适配层（主 hook 消费的接口） ============

/**
 * 统一的数据源适配器接口。
 *
 * 所有 adapter 工厂（createAxiosAdapter / createCrudOperationsAdapter /
 * createModuleAdapter / createFunctionAdapter）最终产出此接口的对象。
 *
 * 与 useCrudUnified.ts 中定义的 CrudAdapter 完全一致。
 *
 * @template T 实体类型
 * @template TCreate 创建入参类型，默认 Partial<T>
 * @template TUpdate 更新入参类型，默认 Partial<T>
 */
export interface CrudAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** 列表查询（可选，未提供时 hook 仅做 mutations） */
  list?: (params: CrudListParams) => Promise<CrudListResult<T>>;
  /** 单条查询（可选，提供后 get() 会优先使用此方法） */
  get?: (id: string) => Promise<T | null>;
  /** 创建 */
  create: (data: TCreate) => Promise<T>;
  /** 更新 */
  update: (args: { id: string; data: TUpdate }) => Promise<T>;
  /** 删除 */
  delete: (id: string) => Promise<void>;
}

/**
 * useCrudUnified 配置选项
 * 与 useCrudUnified.ts 中 UseCrudUnifiedOptions 完全一致
 */
export interface UseCrudUnifiedOptions<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  /** 数据源适配器（必填） */
  adapter: CrudAdapter<T, TCreate, TUpdate>;
  /** React Query queryKey 基础键，内部会追加 'list'/'detail'/page 等维度 */
  queryKey: unknown[];
  /** 是否启用列表查询，默认 true。设为 false 时仅做 mutations */
  enableList?: boolean;
  /** 是否自动获取列表，默认 true */
  autoFetch?: boolean;
  /** 默认每页条数，默认 10 */
  defaultPageSize?: number;
  /** 缓存新鲜时间（毫秒），默认 5 分钟 */
  staleTime?: number;
  /** 失败重试次数，默认 2 */
  retry?: number;
  /** 实体名称（用于通知消息，如"用户"、"客户"） */
  entityName?: string;
  /** 是否显示成功通知，默认 true */
  showSuccessNotification?: boolean;
  /** 是否显示失败通知，默认 true */
  showErrorNotification?: boolean;
  /** 创建成功后额外回调 */
  onCreateSuccess?: (data: T) => void;
  /** 更新成功后额外回调 */
  onUpdateSuccess?: (data: T, id: string) => void;
  /** 删除成功后额外回调 */
  onDeleteSuccess?: (id: string) => void;
}

/**
 * useCrudUnified 返回结果
 * 与 useCrudUnified.ts 中 UseCrudUnifiedResult 完全一致
 */
export interface UseCrudUnifiedResult<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
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
  // 列表查询（原始 React Query 结果）
  listQuery: UseQueryResult<CrudListResult<T>, Error>;
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
  // 原始 Mutation 对象
  mutations: {
    createMutation: UseMutationResult<T | null, Error, TCreate, unknown>;
    updateMutation: UseMutationResult<T | null, Error, { id: string; item: TUpdate }, unknown>;
    deleteMutation: UseMutationResult<void, Error, string, unknown>;
    bulkDeleteMutation: UseMutationResult<void, Error, string[], unknown>;
  };
}

// ============ CrudPage 组件适配层（Schema 驱动页面用） ============

/**
 * CrudPage 组件使用的 API 适配器接口
 * 与 components/templates/CrudPage.tsx 中 CrudApiAdapter 完全一致
 */
export interface CrudPageApiAdapter<T = Record<string, unknown>> {
  list: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    [key: string]: unknown;
  }) => Promise<{ data: T[]; total: number }>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

// ============ Adapter Factory 适配层（标准化 CRUD 适配器） ============

/**
 * 原始 CRUD API 接口
 * 与 schemas/_shared/adapterFactory.ts 中 CrudApi 兼容
 */
export interface CrudApiClient<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<{
    success?: boolean;
    code?: number;
    message?: string;
    data?: unknown;
  }>;
  get?: (id: string) => Promise<{
    success?: boolean;
    code?: number;
    message?: string;
    data?: T;
  }>;
  create: (data: TCreate) => Promise<{
    success?: boolean;
    code?: number;
    message?: string;
    data?: T;
  }>;
  update: (id: string, data: TUpdate) => Promise<{
    success?: boolean;
    code?: number;
    message?: string;
    data?: T;
  }>;
  delete: (id: string) => Promise<{
    success?: boolean;
    code?: number;
    message?: string;
    data?: unknown;
  }>;
}

/**
 * 标准化的列表响应
 * 与 schemas/_shared/adapterFactory.ts 中 NormalizedListResponse 完全一致
 */
export interface NormalizedListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 标准化的 CRUD 操作结果
 * 与 schemas/_shared/adapterFactory.ts 中 CrudResult 完全一致
 */
export interface CrudOperationResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

/**
 * 适配器配置
 * 与 schemas/_shared/adapterFactory.ts 中 CrudApiAdapterConfig 完全一致
 */
export interface CrudApiAdapterConfig {
  itemsField?: string;
  totalField?: string;
  pageSizeParam?: string;
  pageParam?: string;
  normalizePageSize?: boolean;
}

/**
 * 标准化 CRUD 适配器接口（adapterFactory 产出）
 * 与 schemas/_shared/adapterFactory.ts 中 CrudApiAdapter 完全一致
 */
export interface CrudApiAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<NormalizedListResponse<T>>;
  get: (id: string) => Promise<CrudOperationResult<T>>;
  create: (data: TCreate) => Promise<CrudOperationResult<T>>;
  update: (id: string, data: TUpdate) => Promise<CrudOperationResult<T>>;
  delete: (id: string) => Promise<CrudOperationResult<void>>;
}

// ============ 模块级 CRUD 操作接口（api/<module>/types.ts 用） ============

/**
 * 模块级 CRUD 操作接口
 * 与 api/hrm/types.ts 中 CrudOperations 完全一致
 */
export interface CrudOperations<T, TListParams = Record<string, unknown>> {
  list: (params?: TListParams) => Promise<{
    success: boolean;
    code?: number;
    message?: string;
    data?: {
      items: T[];
      total: number;
      page?: number;
      pageSize?: number;
      pagesize?: number;
    };
  }>;
  get: (id: string) => Promise<{
    success: boolean;
    code?: number;
    message?: string;
    data?: T;
  }>;
  create: (data: Partial<T>) => Promise<{
    success: boolean;
    code?: number;
    message?: string;
    data?: T;
  }>;
  update: (id: string, data: Partial<T>) => Promise<{
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
}

// ============ 兼容性别名（供逐步迁移使用） ============

/**
 * @deprecated 请使用 CrudAdapter 代替
 * 兼容 component-types.ts 中的 UseCrudOptions/UseCrudResult 需要的适配器形态
 */
export interface CrudResourceConfig<T extends { id?: string | number } = Record<string, unknown>> {
  list: (params?: Record<string, unknown>) => Promise<{ items: T[]; total: number }>;
  get: (id: string | number) => Promise<T>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string | number, data: Partial<T>) => Promise<T>;
  remove: (id: string | number) => Promise<void>;
  batchDelete?: (ids: Array<string | number>) => Promise<void>;
}

/**
 * @deprecated 请使用 UseCrudUnifiedOptions 代替
 */
export type CrudMutationCallbacks<T> = {
  onCreated?: (data: T) => void;
  onUpdated?: (data: T) => void;
  onDeleted?: () => void;
  onError?: (err: unknown) => void;
};

/**
 * @deprecated 请使用 UseCrudUnifiedResult 代替
 */
export type CrudResultHooks<T> = {
  items: T[];
  total: number;
  loading: boolean;
  create: (data: Partial<T>) => Promise<T | null>;
  update: (id: string, data: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
  refresh: () => void;
};
