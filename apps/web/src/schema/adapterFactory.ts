/**
 * CrudApiAdapter 工厂 — 自动从 API 对象生成标准化 CRUD 适配器
 *
 * 处理不同后端的数据格式差异：
 * - page_size → pageSize 参数归一化
 * - 响应数据提取（items / materials / data 等多种字段名）
 * - 错误处理（检查 response.success）
 */

import type { ApiResponse } from '@/api/client';

// ============ 类型定义 ============

/** 原始 CRUD API 接口 */
export interface CrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: TCreate) => Promise<ApiResponse<T>>;
  update: (id: string, data: TUpdate) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<unknown>>;
}

/** 标准化的列表响应 */
export interface NormalizedListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 标准化的 CRUD 操作结果 */
export interface CrudResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

/** 适配器配置 */
export interface CrudApiAdapterConfig {
  /** 数据字段映射 —— 列表项所在字段名，默认依次尝试 items / materials / data / data 数组 */
  itemsField?: string;
  /** 总数字段名，默认 'total' */
  totalField?: string;
  /** 分页参数字段名映射 */
  pageSizeParam?: string;
  pageParam?: string;
  /** 是否将 page_size 归一化为 pageSize，默认 true */
  normalizePageSize?: boolean;
}

/** 标准化 CRUD 适配器接口 */
export interface CrudApiAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<NormalizedListResponse<T>>;
  get: (id: string) => Promise<CrudResult<T>>;
  create: (data: TCreate) => Promise<CrudResult<T>>;
  update: (id: string, data: TUpdate) => Promise<CrudResult<T>>;
  delete: (id: string) => Promise<CrudResult<void>>;
}

// ============ 辅助函数 ============

/**
 * 从列表响应中提取 items 数组和 total
 *
 * 按优先级尝试：
 * 1. response.data.items
 * 2. response.data.materials
 * 3. response.data.data（且为数组时）
 * 4. response.data（本身为数组时）
 */
export function normalizeListResponse<T>(
  response: ApiResponse<unknown>,
  config: CrudApiAdapterConfig = {}
): NormalizedListResponse<T> {
  const { itemsField, totalField = 'total' } = config;
  const data = response?.data as Record<string, unknown> | T[] | undefined;

  if (!data) {
    return { items: [], total: 0, page: 1, pageSize: 10 };
  }

  let items: T[] = [];
  let total = 0;

  if (Array.isArray(data)) {
    items = data as T[];
    total = items.length;
  } else {
    const obj = data as Record<string, unknown>;

    if (itemsField && obj[itemsField] !== undefined) {
      items = (obj[itemsField] as T[]) || [];
    } else if (Array.isArray(obj.items)) {
      items = obj.items as T[];
    } else if (Array.isArray(obj.materials)) {
      items = obj.materials as T[];
    } else if (Array.isArray(obj.data)) {
      items = obj.data as T[];
    }

    if (obj[totalField] !== undefined) {
      total = Number(obj[totalField]) || 0;
    } else if (obj.total !== undefined) {
      total = Number(obj.total) || 0;
    }

    if (total === 0 && items.length > 0) {
      total = items.length;
    }

    const page = Number(obj.page) || 1;
    const pageSizeVal = obj.pageSize ?? obj.page_size;
    const pageSize = Number(pageSizeVal) || 10;

    return { items, total, page, pageSize };
  }

  return { items, total, page: 1, pageSize: 10 };
}

/**
 * 归一化分页参数名
 * 将 pageSize 映射为后端期望的参数名（page_size 或自定义）
 */
function normalizePaginationParams(
  params: Record<string, unknown>,
  config: CrudApiAdapterConfig
): Record<string, unknown> {
  const { pageSizeParam = 'page_size', pageParam = 'page', normalizePageSize = true } = config;

  const result: Record<string, unknown> = { ...params };

  if (normalizePageSize && params.pageSize !== undefined) {
    result[pageSizeParam] = params.pageSize;
    delete result.pageSize;
  }

  if (params.page !== undefined && pageParam !== 'page') {
    result[pageParam] = params.page;
    delete result.page;
  }

  return result;
}

/**
 * 从 ApiResponse 中提取单条数据
 */
function extractData<T>(response: ApiResponse<T>): T | undefined {
  return response?.data as T | undefined;
}

/**
 * 检查响应是否成功
 */
function isSuccess(response: ApiResponse<unknown>): boolean {
  return response?.success === true;
}

// ============ 工厂函数 ============

/**
 * 创建标准化 CRUD 适配器
 *
 * @param api 原始 API 对象，需包含 list / get / create / update / delete 方法
 * @param config 适配器配置，用于处理数据映射差异
 *
 * @example
 * ```ts
 * const materialAdapter = createCrudApiAdapter(materialApi, {
 *   itemsField: 'materials',
 * });
 *
 * const { items, total } = await materialAdapter.list({ page: 1, pageSize: 20 });
 * ```
 */
export function createCrudApiAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  api: CrudApi<T, TCreate, TUpdate>,
  config: CrudApiAdapterConfig = {}
): CrudApiAdapter<T, TCreate, TUpdate> {
  const adapter: CrudApiAdapter<T, TCreate, TUpdate> = {
    async list(params?: Record<string, unknown>): Promise<NormalizedListResponse<T>> {
      const normalizedParams = params ? normalizePaginationParams(params, config) : {};
      const response = await api.list(normalizedParams);

      if (!isSuccess(response)) {
        throw new Error(response?.message || 'Failed to list records');
      }

      return normalizeListResponse<T>(response, config);
    },

    async get(id: string): Promise<CrudResult<T>> {
      const response = await api.get(id);

      return {
        success: isSuccess(response),
        data: extractData<T>(response),
        message: response?.message,
        code: response?.code,
      };
    },

    async create(data: TCreate): Promise<CrudResult<T>> {
      const response = await api.create(data);

      return {
        success: isSuccess(response),
        data: extractData<T>(response),
        message: response?.message,
        code: response?.code,
      };
    },

    async update(id: string, data: TUpdate): Promise<CrudResult<T>> {
      const response = await api.update(id, data);

      return {
        success: isSuccess(response),
        data: extractData<T>(response),
        message: response?.message,
        code: response?.code,
      };
    },

    async delete(id: string): Promise<CrudResult<void>> {
      const response = await api.delete(id);

      return {
        success: isSuccess(response),
        message: response?.message,
        code: response?.code,
      };
    },
  };

  return adapter;
}
