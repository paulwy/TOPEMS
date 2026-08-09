/**
 * V72.5 第三批 类型安全 API 绑定 — EHS Hazard (Safety Hazard)
 *
 * 基于 OpenAPI 生成类型（operationId: list_risks / create_risk / get_risk / update_risk / delete_risk），
 * 使用 AdaptedQuery / AdaptedRequestBody / TypedApiResponse 模式：
 *   - 编译期：参数/请求体/响应类型由 operations['list_risks'] 精确推导
 *   - 运行时：toOpenApiParams / toOpenApiRequestBody 自动 camelCase → snake_case 适配
 *
 * 路径映射说明：
 *   前端 apiClient.ehs.get('/hazards') → OpenAPI GET /api/ehs/hazards → operation list_risks
 *   注意：OpenAPI 中 /api/ehs/hazards 路径的 operationId 为 list_risks/create_risk，
 *   而非 list_hazards（后者映射到 /api/ehs/issues 路径）。
 *
 * 使用方式：
 *   import { hazardTypedApi } from './hazardTyped';
 *   const res = await hazardTypedApi.list({ page: 1, pagesize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type {
  SafetyHazard,
  CreateSafetyHazardRequest,
  ListQueryParams,
} from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const hazardTypedApi = {
  /**
   * list_risks operation（openapi: GET /api/ehs/hazards）
   * Query Params: { page, pagesize, search, status }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_risks'> | ListQueryParams,
  ): Promise<TypedPaginatedResponse<SafetyHazard>> => {
    return apiClient.ehs.get('/hazards', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * get_risk operation（openapi: GET /api/ehs/hazards/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<SafetyHazard, 'get_risk'>> => {
    return apiClient.ehs.get(`/hazards/${id}`);
  },

  /**
   * create_risk operation（openapi: POST /api/ehs/hazards）
   * Request Body: CreateSafetyHazardRequest（发送前 adaptReverse → snake_case）
   */
  create: async (
    data: AdaptedRequestBody<'create_risk'> | CreateSafetyHazardRequest,
  ): Promise<TypedApiResponse<SafetyHazard, 'create_risk'>> => {
    return apiClient.ehs.post(
      '/hazards',
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  /**
   * update_risk operation（openapi: PUT /api/ehs/hazards/{id}）
   */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_risk'> | Partial<CreateSafetyHazardRequest>,
  ): Promise<TypedApiResponse<SafetyHazard, 'update_risk'>> => {
    return apiClient.ehs.put(
      `/hazards/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  /**
   * delete_risk operation（openapi: DELETE /api/ehs/hazards/{id}）
   */
  delete: async (id: string): Promise<TypedApiResponse<void, 'delete_risk'>> => {
    return apiClient.ehs.delete(`/hazards/${id}`);
  },
};

export default hazardTypedApi;
