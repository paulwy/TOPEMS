/**
 * V72.5 第三批 类型安全 API 绑定 — Monitor Business Metric
 *
 * 基于 OpenAPI 生成类型（operationId: list_business_metrics / create_business_metric /
 * get_business_metric / update_business_metric / delete_business_metric），
 * 使用 AdaptedQuery / AdaptedRequestBody / TypedApiResponse 模式。
 *
 * 路径映射说明：
 *   前端 apiClient.monitor.get('/business-metrics')      → OpenAPI GET /api/monitor/business-metrics → list_business_metrics
 *   前端 apiClient.monitor.get('/business-metrics/{id}') → OpenAPI GET /api/monitor/business-metrics/{id} → get_business_metric
 *   前端 apiClient.monitor.post('/business-metrics')     → OpenAPI POST /api/monitor/business-metrics → create_business_metric
 *   前端 apiClient.monitor.put('/business-metrics/{id}') → OpenAPI PUT /api/monitor/business-metrics/{id} → update_business_metric
 *   前端 apiClient.monitor.delete('/business-metrics/{id}') → OpenAPI DELETE /api/monitor/business-metrics/{id} → delete_business_metric
 *
 * 使用方式：
 *   import { metricTypedApi } from './metricTyped';
 *   const res = await metricTypedApi.list({ page: 1, pageSize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type {
  BusinessMetric,
  BusinessMetricRequest,
  BusinessMetricQuery,
} from './metrics';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const metricTypedApi = {
  /**
   * list_business_metrics operation（openapi: GET /api/monitor/business-metrics）
   * Query Params: { category, serviceName, status, keyword }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'list_business_metrics'> | BusinessMetricQuery,
  ): Promise<TypedPaginatedResponse<BusinessMetric>> => {
    return apiClient.monitor.get('/business-metrics', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * get_business_metric operation（openapi: GET /api/monitor/business-metrics/{id}）
   */
  get: async (
    id: string,
  ): Promise<TypedApiResponse<BusinessMetric, 'get_business_metric'>> => {
    return apiClient.monitor.get(`/business-metrics/${id}`);
  },

  /**
   * create_business_metric operation（openapi: POST /api/monitor/business-metrics）
   * Request Body: BusinessMetricRequest（发送前 adaptReverse → snake_case）
   */
  create: async (
    data: AdaptedRequestBody<'create_business_metric'> | BusinessMetricRequest,
  ): Promise<TypedApiResponse<BusinessMetric, 'create_business_metric'>> => {
    return apiClient.monitor.post(
      '/business-metrics',
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  /**
   * update_business_metric operation（openapi: PUT /api/monitor/business-metrics/{id}）
   */
  update: async (
    id: string,
    data: AdaptedRequestBody<'update_business_metric'> | BusinessMetricRequest,
  ): Promise<TypedApiResponse<BusinessMetric, 'update_business_metric'>> => {
    return apiClient.monitor.put(
      `/business-metrics/${id}`,
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  /**
   * delete_business_metric operation（openapi: DELETE /api/monitor/business-metrics/{id}）
   */
  delete: async (
    id: string,
  ): Promise<TypedApiResponse<{ id: string }, 'delete_business_metric'>> => {
    return apiClient.monitor.delete(`/business-metrics/${id}`);
  },
};

export default metricTypedApi;
