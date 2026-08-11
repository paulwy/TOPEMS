/**
 * V72.5 第二批 类型安全 API 绑定 — SRM Supplier
 *
 * 基于 OpenAPI 生成类型（operationId: srm_list_suppliers 等），
 * 使用 AdaptedQuery / AdaptedRequestBody / TypedApiResponse 模式：
 *   - 编译期：参数/请求体/响应类型由 operations['srm_list_suppliers'] 精确推导
 *   - 运行时：toOpenApiParams / toOpenApiRequestBody 自动 camelCase → snake_case 适配
 *
 * 注意：operationId 经 aggregate.py 去重为 `srm_*` 前缀（与 erp/scm 同名 handler 区分）。
 *
 * 使用方式：
 *   import { supplierTypedApi } from './supplierTyped';
 *   const res = await supplierTypedApi.list({ page: 1, pageSize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type { Supplier, CreateSupplierRequest } from './index';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const supplierTypedApi = {
  /**
   * srm_list_suppliers operation（openapi: GET /api/srm/suppliers）
   * Query Params: { page, pageSize, search, status, category, sortBy, sortOrder }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'srm_list_suppliers'>
  ): Promise<TypedPaginatedResponse<Supplier>> => {
    return apiClient.srm.get('/suppliers', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * srm_get_supplier operation（openapi: GET /api/srm/suppliers/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Supplier, 'srm_get_supplier'>> => {
    return apiClient.srm.get(`/suppliers/${id}`);
  },

  /**
   * srm_create_supplier operation（openapi: POST /api/srm/suppliers）
   * Request Body: CreateSupplierRequest schema（发送前 adaptReverse → snake_case）
   */
  create: async (
    data: AdaptedRequestBody<'srm_create_supplier'> | CreateSupplierRequest
  ): Promise<TypedApiResponse<Supplier, 'srm_create_supplier'>> => {
    return apiClient.srm.post('/suppliers', toOpenApiRequestBody(data as Record<string, unknown>));
  },

  /**
   * srm_update_supplier operation（openapi: PUT /api/srm/suppliers/{id}）
   */
  update: async (
    id: string,
    data: AdaptedRequestBody<'srm_update_supplier'> | CreateSupplierRequest
  ): Promise<TypedApiResponse<Supplier, 'srm_update_supplier'>> => {
    return apiClient.srm.put(
      `/suppliers/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /**
   * srm_delete_supplier operation（openapi: DELETE /api/srm/suppliers/{id}）
   */
  delete: async (id: string): Promise<TypedApiResponse<string, 'srm_delete_supplier'>> => {
    return apiClient.srm.delete(`/suppliers/${id}`);
  },
};

export default supplierTypedApi;
