/**
 * CrudApiAdapter factory - automatically generates standardized CRUD adapters from API objects
 *
 * Handles data format differences between backends:
 * - pagesize -> pageSize parameter normalization
 * - Response data extraction (items / materials / data etc. field names)
 * - Error handling (checks response.success)
 */

import type { ApiResponse } from '@/api/client';

// ============ Type Definitions ============

/** Raw CRUD API interface */
export interface CrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: TCreate) => Promise<ApiResponse<T>>;
  update: (id: string, data: TUpdate) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<unknown>>;
}

/** Standardized list response */
export interface NormalizedListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Standardized CRUD operation result */
export interface CrudResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

/** Adapter configuration */
export interface CrudApiAdapterConfig {
  /** Data field mapping - field name where list items are located, tries items / materials / data / data array in order */
  itemsField?: string;
  /** Total count field name, default 'total' */
  totalField?: string;
  /** Pagination parameter field name mapping */
  pageSizeParam?: string;
  pageParam?: string;
  /** Whether to normalize pagesize to pageSize, default true */
  normalizePageSize?: boolean;
}

/** Standardized CRUD adapter interface */
export interface CrudApiAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<NormalizedListResponse<T>>;
  get: (id: string) => Promise<CrudResult<T>>;
  create: (data: TCreate) => Promise<CrudResult<T>>;
  update: (id: string, data: TUpdate) => Promise<CrudResult<T>>;
  delete: (id: string) => Promise<CrudResult<void>>;
}

// ============ Helper Functions ============

/**
 * Extract items array and total from list response
 *
 * Tries by priority:
 * 1. response.data.items
 * 2. response.data.materials
 * 3. response.data.data (when array)
 * 4. response.data (when array itself)
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
    const pageSizeVal = obj.pageSize ?? obj.pagesize;
    const pageSize = Number(pageSizeVal) || 10;

    return { items, total, page, pageSize };
  }

  return { items, total, page: 1, pageSize: 10 };
}

/**
 * Normalize pagination parameter names
 * Maps pageSize to the backend-expected parameter name (pagesize or custom)
 */
function normalizePaginationParams(
  params: Record<string, unknown>,
  config: CrudApiAdapterConfig
): Record<string, unknown> {
  const { pageSizeParam = 'pagesize', pageParam = 'page', normalizePageSize = true } = config;

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
 * Extract single data item from ApiResponse
 */
function extractData<T>(response: ApiResponse<T>): T | undefined {
  return response?.data as T | undefined;
}

/**
 * Check whether response indicates success
 */
function isSuccess(response: ApiResponse<unknown>): boolean {
  return response?.success === true;
}

// ============ Factory Function ============

/**
 * Create standardized CRUD adapter
 *
 * @param api Raw API object, must include list / get / create / update / delete methods
 * @param config Adapter configuration for handling data mapping differences
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
