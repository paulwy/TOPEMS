/**
 * 类型桥接工具 — 连接 OpenAPI 生成类型与手写业务类型
 *
 * 设计目标：
 * 1. 手写类型保持业务语义清晰（InventoryItem 比 ApiComponents['schemas']['Inventory'] 更易读）
 * 2. 生成类型作为"类型源真相"，通过 satisfies/extends 校验手写类型不漂移
 * 3. 提供类型安全的 API 客户端工厂，减少手写 API 方法的样板代码
 * 4. createTypedApiClient 返回 ApiResponse<T>，与现有 API 调用方式完全兼容
 *
 * 使用方式：
 *   import { defineApiSchema, createTypedApiClient } from '@topems/shared-types';
 *
 *   // 1. 定义 Schema 与生成类型的映射
 *   const warehouseSchema = defineApiSchema({
 *     entity: 'Warehouse',
 *     create: 'CreateWarehouseRequest',
 *     update: 'UpdateWarehouseRequest',
 *   });
 *
 *   // 2. 创建类型安全的 API 客户端（一行替代 6 个方法）
 *   const warehouseApi = createTypedApiClient(apiClient.wms, '/warehouses');
 *
 *   // 3. 与现有 API 完全兼容（返回 ApiResponse<T>）
 *   const res = await warehouseApi.list({ page: 1 });
 *   if (res.success) { console.log(res.data.items); }
 */

import type { ApiComponents } from './generated';
import type { ApiResponse, PaginatedResponse } from './common';

/**
 * API Schema 定义：映射业务实体到 OpenAPI 生成类型
 */
export interface ApiSchemaMapping<TEntity extends string = string> {
  /** 实体名（对应 OpenAPI components.schemas 的 key） */
  entity: TEntity;
  /** 创建请求类型名 */
  create?: string;
  /** 更新请求类型名 */
  update?: string;
  /** 查询参数类型名 */
  query?: string;
  /** 列表响应类型名（默认 PaginatedResponse<entity>） */
  list?: string;
}

/**
 * 从 ApiSchemaMapping 提取业务实体类型
 * 如果生成类型中存在，则使用生成类型；否则回退到 unknown
 */
export type InferEntity<S extends ApiSchemaMapping> = S['entity'] extends keyof ApiComponents['schemas']
  ? ApiComponents['schemas'][S['entity']]
  : unknown;

/**
 * 从 ApiSchemaMapping 提取创建请求类型
 */
export type InferCreateRequest<S extends ApiSchemaMapping> = S['create'] extends string
  ? S['create'] extends keyof ApiComponents['schemas']
    ? ApiComponents['schemas'][S['create']]
    : unknown
  : Partial<InferEntity<S>>;

/**
 * 从 ApiSchemaMapping 提取更新请求类型
 */
export type InferUpdateRequest<S extends ApiSchemaMapping> = S['update'] extends string
  ? S['update'] extends keyof ApiComponents['schemas']
    ? ApiComponents['schemas'][S['update']]
    : unknown
  : Partial<InferEntity<S>>;

/**
 * 定义 API Schema 映射（带类型推导）
 *
 * @example
 * const warehouseSchema = defineApiSchema({
 *   entity: 'Warehouse',
 *   create: 'CreateWarehouseRequest',
 *   update: 'UpdateWarehouseRequest',
 * });
 *
 * type Warehouse = InferEntity<typeof warehouseSchema>; // 自动推导
 */
export function defineApiSchema<S extends ApiSchemaMapping>(mapping: S): S {
  return mapping;
}

/**
 * 类型安全的 CRUD API 客户端接口
 * 返回 ApiResponse<T> 包装，与现有手写 API 完全兼容
 */
export interface TypedCrudApiClient<T, C = Partial<T>, U = Partial<T>> {
  list: (params?: Record<string, unknown>) => Promise<ApiResponse<PaginatedResponse<T>>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: C) => Promise<ApiResponse<T>>;
  update: (id: string, data: U) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<string>>;
}

/**
 * Axios-like 客户端接口（最小化定义，兼容现有 apiClient）
 */
interface AxiosLike {
  get: (url: string, config?: { params?: Record<string, unknown> }) => Promise<unknown>;
  post: (url: string, data?: unknown) => Promise<unknown>;
  put: (url: string, data?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

/**
 * 创建类型安全的 CRUD API 客户端
 *
 * 一行代码生成完整的 CRUD 客户端，替代手写的 6+ 个方法。
 * 返回 ApiResponse<T> 包装，与现有手写 API 完全兼容，可直接替换。
 *
 * @param client Axios 实例（如 apiClient.wms）
 * @param basePath 资源基础路径（如 '/warehouses'）
 * @returns 类型安全的 CRUD 客户端（返回 ApiResponse<T>）
 *
 * @example
 * // 替换手写 warehouseApi
 * import { createTypedApiClient } from '@topems/shared-types';
 * import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from './types';
 *
 * export const warehouseApi = createTypedApiClient<
 *   Warehouse,
 *   CreateWarehouseRequest,
 *   UpdateWarehouseRequest
 * >(apiClient.wms, '/warehouses');
 *
 * // 使用方式与原来完全一致
 * const res = await warehouseApi.list({ page: 1 });
 * if (res.success) { console.log(res.data.items); }
 */
export function createTypedApiClient<T, C = Partial<T>, U = Partial<T>>(
  client: AxiosLike,
  basePath: string
): TypedCrudApiClient<T, C, U> {
  return {
    list: async (params?: Record<string, unknown>) => {
      return client.get(`${basePath}`, { params }) as Promise<ApiResponse<PaginatedResponse<T>>>;
    },

    get: async (id: string) => {
      return client.get(`${basePath}/${id}`) as Promise<ApiResponse<T>>;
    },

    create: async (data: C) => {
      return client.post(`${basePath}`, data) as Promise<ApiResponse<T>>;
    },

    update: async (id: string, data: U) => {
      return client.put(`${basePath}/${id}`, data) as Promise<ApiResponse<T>>;
    },

    delete: async (id: string) => {
      return client.delete(`${basePath}/${id}`) as Promise<ApiResponse<string>>;
    },
  };
}

/**
 * 类型兼容性校验工具
 *
 * 用于在编译时校验手写类型与生成类型的兼容性。
 * 如果生成类型变化导致不兼容，编译时会报错。
 *
 * @example
 * // 校验手写 InventoryItem 与生成类型 Inventory 兼容
 * typeCheck<InventoryItem, InferEntity<{ entity: 'Inventory' }>>();
 *
 * // 校验手写类型满足生成类型的约束
 * type AssertExtends = InventoryItem extends ApiComponents['schemas']['Inventory'] ? true : never;
 */
export function typeCheck<T extends U, U = T>(): true {
  return true;
}

/**
 * 从生成类型提取字段名（用于 Schema 字段定义自动化）
 *
 * @example
 * type WarehouseFields = keyof ApiComponents['schemas']['Warehouse'];
 * // 'id' | 'name' | 'code' | 'address' | 'area' | 'manager' | 'status' | 'created_at'
 */
export type FieldsOf<T> = T extends object ? keyof T : never;
