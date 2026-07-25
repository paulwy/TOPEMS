/**
 * 类型安全 API 客户端试点 — WMS Warehouse
 *
 * 展示如何用 createTypedApiClient 替代手写 API 方法。
 * 现在 createTypedApiClient 原生返回 ApiResponse<T>，可直接替换手写 API。
 *
 * 使用方式：
 *   // 直接替换原 warehouseApi
 *   import { typedWarehouseApi as warehouseApi } from './warehouseTyped';
 *   const res = await warehouseApi.list({ page: 1 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import {
  createTypedApiClient,
  defineApiSchema,
  type InferEntity,
} from '@topems/shared-types';
import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from './types';

// ============ 类型映射定义 ============

/**
 * 定义 Warehouse 实体与 OpenAPI 生成类型的映射
 *
 * 当后端 Schema 变化时（如字段重命名、类型变更），
 * 生成类型会更新，此处会触发编译时类型错误，提示开发者更新手写类型。
 */
export const warehouseApiSchema = defineApiSchema({
  entity: 'Warehouse',
  create: 'CreateWarehouseRequest',
  update: 'UpdateWarehouseRequest',
});

// ============ 类型兼容性校验（编译时） ============

/**
 * 校验手写 Warehouse 类型与生成类型兼容
 * 如果生成类型字段变化，此处编译失败
 */
type _GeneratedWarehouse = InferEntity<typeof warehouseApiSchema>;
// 注意：完整类型校验需要后端 OpenAPI 实际运行并生成类型后启用
// type _WarehouseCompat = Warehouse extends _GeneratedWarehouse
//   ? _GeneratedWarehouse extends Warehouse
//     ? true
//     : 'Warehouse 与生成类型字段不一致（生成类型有额外字段）'
//   : 'Warehouse 与生成类型不兼容（缺少字段或类型不匹配）';

// ============ 类型安全 API 客户端 ============

/**
 * 类型安全的 Warehouse API 客户端
 *
 * 与手写 warehouseApi 完全兼容：
 * - list() → Promise<ApiResponse<PaginatedResponse<Warehouse>>>
 * - get() → Promise<ApiResponse<Warehouse>>
 * - create() → Promise<ApiResponse<Warehouse>>
 * - update() → Promise<ApiResponse<Warehouse>>
 * - delete() → Promise<ApiResponse<string>>
 *
 * 优势：
 * 1. 一行代码生成完整 CRUD（替代 6+ 手写方法）
 * 2. 返回类型自动推导（与手写 API 一致）
 * 3. 请求参数类型安全（CreateWarehouseRequest 自动校验）
 * 4. 可直接替换现有 import，无需修改调用方
 */
export const typedWarehouseApi = createTypedApiClient<
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest
>(apiClient.wms, '/warehouses');

export default typedWarehouseApi;
