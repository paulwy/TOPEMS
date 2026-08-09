/**
 * V72.5 第三批 类型安全 API 绑定 — Monitor Alert
 *
 * 基于 OpenAPI 生成类型（operationId: list_alerts / get_alert / update_alert），
 * 使用 AdaptedQuery / TypedApiResponse 模式。
 *
 * 路径映射说明：
 *   前端 apiClient.monitor.get('/alerts')     → OpenAPI GET /api/monitor/alerts → operation list_alerts
 *   前端 apiClient.monitor.get('/alerts/{id}') → OpenAPI GET /api/monitor/alerts/{id} → operation get_alert
 *   前端 apiClient.monitor.put('/alerts/{id}/acknowledge') → 前端特有，OpenAPI 无对应 operation
 *   前端 apiClient.monitor.put('/alerts/{id}/resolve')     → 前端特有，OpenAPI 无对应 operation
 *
 * 注意：OpenAPI 中 /api/monitor/alerts 仅有 GET（list），无 POST（create）。
 * /api/monitor/alerts/{id} 有 GET 和 POST（update_alert），无 DELETE。
 * acknowledge/resolve 在 OpenAPI 中映射到 /api/monitor/alerts/acknowledge 和 /api/monitor/alerts/resolve
 * （批量操作，operationId: acknowledge_alerts / resolve_alerts），与前端单条操作路径不同。
 *
 * 使用方式：
 *   import { alertTypedApi } from './alertTyped';
 *   const res = await alertTypedApi.list({ page: 1, pagesize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type { Alert, AlertQueryParams } from './index';
import {
  toOpenApiParams,
  type AdaptedQuery,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const alertTypedApi = {
  /**
   * list_alerts operation（openapi: GET /api/monitor/alerts）
   * Query Params: { page, pagesize, severity, status, service_name }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_alerts'> | AlertQueryParams,
  ): Promise<TypedPaginatedResponse<Alert>> => {
    return apiClient.monitor.get('/alerts', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * get_alert operation（openapi: GET /api/monitor/alerts/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Alert, 'get_alert'>> => {
    return apiClient.monitor.get(`/alerts/${id}`);
  },
};

export default alertTypedApi;
