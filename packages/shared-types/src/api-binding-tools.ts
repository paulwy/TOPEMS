/**
 * OpenAPI 生成类型 × 业务代码 绑定工具（V72 A4）
 *
 * 解决三类绑定场景：
 *   1. 编译期类型绑定：OpenApiQueryParams / OpenApiRequestBody / TypedApiResponse
 *      — 直接基于 operations[OpId] 精确提取类型
 *   2. 字段风格适配：AdaptedQuery / AdaptedRequestBody<OpId, M>
 *      — 使用 openapi-adapter 的 Adapt<T> 自动将 snake_case 字段映射为 camelCase
 *   3. 运行时数据转换：toOpenApiParams / toOpenApiRequestBody / fromOpenApiResponse
 *      — 在请求发出前和响应接收后做 adaptReverse / adapt
 *
 * @example
 *   import type {
 *     OpenApiQueryParams,
 *     OpenApiRequestBody,
 *     AdaptedQuery,
 *     AdaptedRequestBody,
 *     TypedApiResponse,
 *     TypedPaginatedResponse,
 *   } from '@topems/shared-types';
 *   import { toOpenApiParams, toOpenApiRequestBody, fromOpenApiResponse } from '@topems/shared-types';
 *
 *   // CRM Customers 样板：list / create / get
 *   list: async (params?: AdaptedQuery<'list_customers'>)
 *       : Promise<TypedPaginatedResponse<Customer>> => {
 *     return apiClient.crm.get('/customers', { params: toOpenApiParams(params ?? {}) });
 *   },
 *   create: async (data: AdaptedRequestBody<'create_customer'>)
 *       : Promise<TypedApiResponse<Customer, 'create_customer'>> => {
 *     return apiClient.crm.post('/customers', toOpenApiRequestBody(data));
 *   },
 */

import type { operations, components } from './openapi.gen';
import { adapt, adaptReverse, type Adapt, type FieldMapping, FULL_MAPPING } from './openapi-adapter';
import type { ApiResponse as SharedApiResponse, PaginatedResponse } from './common';

// ---------------------------------------------------------------------------
// 1. 编译期类型工具（按 OperationId 提取）
// ---------------------------------------------------------------------------

/** 按 OperationId 提取完整的 OpenAPI Operation 类型 */
export type OpenApiOperation<OpId extends keyof operations> = operations[OpId];

/** 按 OperationId 提取 OpenAPI Query Params（后端期望的 snake_case） */
export type OpenApiQueryParams<OpId extends keyof operations> =
  operations[OpId] extends { parameters: { query?: infer Q } }
    ? NonNullable<Q>
    : never;

/** 按 OperationId 提取 OpenAPI Request Body（后端期望的 snake_case） */
export type OpenApiRequestBody<OpId extends keyof operations> =
  operations[OpId] extends { requestBody: { content: { 'application/json': infer B } } }
    ? B
    : never;

/** 按 OperationId 提取 OpenAPI Path Params（例如 { id: Uuid }） */
export type OpenApiPathParams<OpId extends keyof operations> =
  operations[OpId] extends { parameters: { path?: infer P } }
    ? NonNullable<P>
    : never;

/**
 * 按 OperationId 提取 OpenAPI Response 200 schema。
 * 注意：当前后端 utoipa 的 ApiResponse 是非泛型（data 类型为 Record<string, never>），
 * 因此本类型仅用于外层（success/message/code）。泛型 data 需要通过
 * TypedApiResponse<T, OpId> 手工传入业务类型 T。
 */
export type OpenApiResponseSchema<OpId extends keyof operations> =
  operations[OpId] extends { responses: { 200: { content: { 'application/json': infer R } } } }
    ? R
    : never;

// ---------------------------------------------------------------------------
// 2. Adapt 包装：snake_case schema → 前端 camelCase 业务类型
// ---------------------------------------------------------------------------

/** Query Params 适配：snake → camel。默认用 FULL_MAPPING（含语义重命名） */
export type AdaptedQuery<
  OpId extends keyof operations,
  M extends FieldMapping = typeof FULL_MAPPING,
> = Adapt<OpenApiQueryParams<OpId>, M>;

/** Request Body 适配：snake → camel。默认用 FULL_MAPPING */
export type AdaptedRequestBody<
  OpId extends keyof operations,
  M extends FieldMapping = typeof FULL_MAPPING,
> = Adapt<OpenApiRequestBody<OpId>, M>;

// ---------------------------------------------------------------------------
// 3. 响应类型包装
// ---------------------------------------------------------------------------

/**
 * 智能判断：如果 Raw 包含 success/code/message 字段（WrappedResponse），
 * 则视为 ApiResponse<T> 包裹式 schema（CRM 风格）；
 * 否则视为 Entity 本体（未包裹，HRM/ERP 风格），外层补 SharedApiResponse<T>。
 */
type IsApiResponseWrapped<Raw> = Raw extends {
  success?: unknown;
  code?: unknown;
  message?: unknown;
}
  ? true
  : false;

/**
 * 强类型 ApiResponse<T>。
 * - OpId=never 时：退化为 SharedApiResponse<T>
 * - 后端 schema 是 ApiResponse 包裹（CRM 风格）或 Entity 本体（HRM/ERP 风格）：
 *   统一使用 SharedApiResponse<T>，保证 success/code/message 为 required，
 *   与前端通用类型契约严格兼容（OpenAPI 生成的 Raw 中字段多为 optional，
 *   直接透传会导致与 SharedApiResponse 不兼容）。
 */
export type TypedApiResponse<
  T = unknown,
  OpId extends keyof operations = never,
> = SharedApiResponse<T>;

/** 分页响应别名：返回 ApiResponse<PaginatedResponse<T>> */
export type TypedPaginatedResponse<T> = SharedApiResponse<PaginatedResponse<T>>;

/** components.schemas 的便捷访问别名 */
export type OpenApiSchema<K extends keyof components['schemas']> = components['schemas'][K];

// ---------------------------------------------------------------------------
// 4. 运行时 helper
// ---------------------------------------------------------------------------

/**
 * 将前端 camelCase 请求参数转为后端 snake_case（query params / form body 通用）。
 * 自动使用 FULL_MAPPING 反向字典。
 */
export function toOpenApiParams<T extends Record<string, unknown>>(
  params: T,
): Record<string, unknown> {
  return adaptReverse(params, FULL_MAPPING) as Record<string, unknown>;
}

/**
 * 将前端 camelCase 请求体转为后端 snake_case JSON body。
 * 自动使用 FULL_MAPPING 反向字典。
 */
export function toOpenApiRequestBody<T extends Record<string, unknown>>(
  data: T,
): Record<string, unknown> {
  return adaptReverse(data, FULL_MAPPING) as Record<string, unknown>;
}

/**
 * 将后端 snake_case 响应对象/数组转换为前端 camelCase 业务数据。
 * 支持数组嵌套和对象嵌套的单层递归。
 */
export function fromOpenApiResponse<T>(raw: unknown): T {
  if (Array.isArray(raw)) {
    return (raw as unknown[]).map((item) =>
      item && typeof item === 'object' ? adapt(item as Record<string, unknown>, FULL_MAPPING) : item,
    ) as unknown as T;
  }
  if (raw && typeof raw === 'object') {
    return adapt(raw as Record<string, unknown>, FULL_MAPPING) as T;
  }
  return raw as T;
}
