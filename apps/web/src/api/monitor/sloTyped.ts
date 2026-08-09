/**
 * V72.5 第三批 类型安全 API 绑定 — Monitor SLO
 *
 * 基于 OpenAPI 生成类型（operationId: list_slos / create_slo / get_slo /
 * update_slo / delete_slo），使用 AdaptedQuery / AdaptedRequestBody / TypedApiResponse 模式。
 *
 * 路径映射说明：
 *   前端 apiClient.monitor.get('/slos')      → OpenAPI GET /api/monitor/slos → list_slos
 *   前端 apiClient.monitor.get('/slos/{id}') → OpenAPI GET /api/monitor/slos/{id} → get_slo
 *   前端 apiClient.monitor.post('/slos')     → OpenAPI POST /api/monitor/slos → create_slo
 *   前端 apiClient.monitor.put('/slos/{id}') → OpenAPI PUT /api/monitor/slos/{id} → update_slo
 *   前端 apiClient.monitor.delete('/slos/{id}') → OpenAPI DELETE /api/monitor/slos/{id} → delete_slo
 *
 * 使用方式：
 *   import { sloTypedApi } from './sloTyped';
 *   const res = await sloTypedApi.list({ page: 1, pageSize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type { Slo, SloRequest, SloQuery } from './metrics';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const sloTypedApi = {
  /**
   * list_slos operation（openapi: GET /api/monitor/slos）
   * Query Params: { serviceName, sloType, status, keyword }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_slos'> | SloQuery,
  ): Promise<TypedPaginatedResponse<Slo>> => {
    return apiClient.monitor.get('/slos', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * get_slo operation（openapi: GET /api/monitor/slos/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Slo, 'get_slo'>> => {
    return apiClient.monitor.get(`/slos/${id}`);
  },

  /**
   * create_slo operation（openapi: POST /api/monitor/slos）
   * Request Body: SloRequest（发送前 adaptReverse → snake_case）
   */
  create: async (
    data: AdaptedRequestBody<'create_slo'> | SloRequest,
  ): Promise<TypedApiResponse<Slo, 'create_slo'>> => {
    return apiClient.monitor.post(
      '/slos',
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  /**
   * update_slo operation（openapi: PUT /api/monitor/slos/{id}）
   */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_slo'> | SloRequest,
  ): Promise<TypedApiResponse<Slo, 'update_slo'>> => {
    return apiClient.monitor.put(
      `/slos/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  /**
   * delete_slo operation（openapi: DELETE /api/monitor/slos/{id}）
   */
  delete: async (id: string): Promise<TypedApiResponse<{ id: string }, 'delete_slo'>> => {
    return apiClient.monitor.delete(`/slos/${id}`);
  },
};

export default sloTypedApi;
