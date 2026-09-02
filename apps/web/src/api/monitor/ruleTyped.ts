/**
 * V72.5 第三批 类型安全 API 绑定 — Monitor Alert Rule
 *
 * 基于 OpenAPI 生成类型（operationId: list_rules / create_rule / get_rule /
 * update_rule / delete_rule），使用 AdaptedQuery / AdaptedRequestBody / TypedApiResponse 模式。
 *
 * 路径映射说明：
 *   前端 apiClient.monitor.get('/rules')      → OpenAPI GET /api/monitor/rules → list_rules
 *   前端 apiClient.monitor.get('/rules/{id}') → OpenAPI GET /api/monitor/rules/{id} → get_rule
 *   前端 apiClient.monitor.post('/rules')     → OpenAPI POST /api/monitor/rules → create_rule
 *   前端 apiClient.monitor.put('/rules/{id}') → OpenAPI PUT /api/monitor/rules/{id} → update_rule
 *   前端 apiClient.monitor.delete('/rules/{id}') → OpenAPI DELETE /api/monitor/rules/{id} → delete_rule
 *
 * 注意：前端 rules API 返回 AlertRuleRecord[]（非分页），与 business-metrics/slos 的分页模式不同。
 *
 * 使用方式：
 *   import { ruleTypedApi } from './ruleTyped';
 *   const res = await ruleTypedApi.list();
 *   if (res.success) { console.log(res.data); }
 */

import apiClient from '../client';
import type { AlertRuleRecord, AlertRuleCreateRequest } from './metrics';
import {
  toOpenApiRequestBody,
  type AdaptedRequestBody,
  type TypedApiResponse,
} from '@topems/shared-types';

export const ruleTypedApi = {
  /**
   * list_rules operation（openapi: GET /api/monitor/rules）
   * 返回 AlertRuleRecord[]（非分页，与 business-metrics/slos 不同）
   */
  list: async (): Promise<TypedApiResponse<AlertRuleRecord[]>> => {
    return apiClient.monitor.get('/rules');
  },

  /**
   * get_rule operation（openapi: GET /api/monitor/rules/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<AlertRuleRecord>> => {
    return apiClient.monitor.get(`/rules/${id}`);
  },

  /**
   * create_rule operation（openapi: POST /api/monitor/rules）
   * Request Body: AlertRuleCreateRequest（发送前 adaptReverse → snake_case）
   */
  create: async (
    data: AdaptedRequestBody<'create_rule'> | AlertRuleCreateRequest
  ): Promise<TypedApiResponse<AlertRuleRecord>> => {
    return apiClient.monitor.post('/rules', toOpenApiRequestBody(data as Record<string, unknown>));
  },

  /**
   * update_rule operation（openapi: PUT /api/monitor/rules/{id}）
   */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_rule'> | AlertRuleCreateRequest
  ): Promise<TypedApiResponse<AlertRuleRecord>> => {
    return apiClient.monitor.put(
      `/rules/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  /**
   * delete_rule operation（openapi: DELETE /api/monitor/rules/{id}）
   */
  delete: async (id: string): Promise<TypedApiResponse<{ id: string }>> => {
    return apiClient.monitor.delete(`/rules/${id}`);
  },
};

export default ruleTypedApi;
