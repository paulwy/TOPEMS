/**
 * V72.5 第三批 类型安全 API 绑定 — EHS Incident
 *
 * 基于 OpenAPI 生成类型（operationId: list_accidents / report_accident / get_accident /
 * update_accident / delete_accident），使用 AdaptedQuery / AdaptedRequestBody /
 * TypedApiResponse 模式。
 *
 * 路径映射说明：
 *   前端 apiClient.ehs.get('/incidents') → OpenAPI GET /api/ehs/incidents → operation list_accidents
 *   注意：OpenAPI 中 /api/ehs/incidents 路径的 operationId 使用 accident 命名，
 *   前端业务概念为 incident，语义一致仅命名不同。
 *
 * 使用方式：
 *   import { incidentTypedApi } from './incidentTyped';
 *   const res = await incidentTypedApi.list({ page: 1, pagesize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type { Incident, CreateIncidentRequest, ListQueryParams } from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const incidentTypedApi = {
  /**
   * list_accidents operation（openapi: GET /api/ehs/incidents）
   * Query Params: { page, pagesize, search, status }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_accidents'> | ListQueryParams
  ): Promise<TypedPaginatedResponse<Incident>> => {
    return apiClient.ehs.get('/incidents', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * get_accident operation（openapi: GET /api/ehs/incidents/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Incident, 'get_accident'>> => {
    return apiClient.ehs.get(`/incidents/${id}`);
  },

  /**
   * report_accident operation（openapi: POST /api/ehs/incidents）
   * Request Body: CreateIncidentRequest（发送前 adaptReverse → snake_case）
   */
  create: async (
    data: AdaptedRequestBody<'report_accident'> | CreateIncidentRequest
  ): Promise<TypedApiResponse<Incident, 'report_accident'>> => {
    return apiClient.ehs.post('/incidents', toOpenApiRequestBody(data as Record<string, unknown>));
  },

  /**
   * update_accident operation（openapi: PUT /api/ehs/incidents/{id}）
   */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_accident'> | Partial<CreateIncidentRequest>
  ): Promise<TypedApiResponse<Incident, 'update_accident'>> => {
    return apiClient.ehs.put(
      `/incidents/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /**
   * delete_accident operation（openapi: DELETE /api/ehs/incidents/{id}）
   */
  delete: async (id: string): Promise<TypedApiResponse<void, 'delete_accident'>> => {
    return apiClient.ehs.delete(`/incidents/${id}`);
  },
};

export default incidentTypedApi;
