/**
 * V72.5 第三批 类型安全 API 绑定 — AI QA History
 *
 * 基于 OpenAPI 生成类型（operationId: _qa_history / _qa_delete_history / _qa_batch_delete_history），
 * 使用 AdaptedQuery / TypedApiResponse 模式。
 *
 * 路径映射说明：
 *   前端 apiClient.ai.get('/qa/history')         → OpenAPI GET /api/ai/qa/history → operation _qa_history
 *   前端 apiClient.ai.delete('/qa/history/{id}') → OpenAPI DELETE /api/ai/qa/history/{id} → operation _qa_delete_history
 *   前端 apiClient.ai.post('/qa/history/batch-delete') → OpenAPI POST /api/ai/qa/history/batch-delete → operation _qa_batch_delete_history
 *
 * 使用方式：
 *   import { qaTypedApi } from './qaTyped';
 *   const res = await qaTypedApi.listHistory({ page: 1, pagesize: 20 });
 *   if (res.success) { console.log(res.data.history); }
 */

import apiClient from '../client';
import type { QAHistoryItem } from './types';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
} from '@topems/shared-types';

/** QA 历史列表响应类型（前端手写，OpenAPI 未生成详细 schema） */
interface QAHistoryListResponse {
  history: QAHistoryItem[];
  total: number;
}

/** QA 批量删除响应类型 */
interface QABatchDeleteResponse {
  deleted_count: number;
  message: string;
}

export const qaTypedApi = {
  /**
   * _qa_history operation（openapi: GET /api/ai/qa/history）
   * Query Params: { page, pagesize, query }（AdaptedQuery 后 camelCase）
   */
  listHistory: async (
    params?: AdaptedQuery<'_qa_history'>
  ): Promise<TypedApiResponse<QAHistoryListResponse, '_qa_history'>> => {
    return apiClient.ai.get('/qa/history', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * _qa_delete_history operation（openapi: DELETE /api/ai/qa/history/{id}）
   */
  deleteHistory: async (id: string): Promise<TypedApiResponse<string, '_qa_delete_history'>> => {
    return apiClient.ai.delete(`/qa/history/${id}`);
  },

  /**
   * _qa_batch_delete_history operation（openapi: POST /api/ai/qa/history/batch-delete）
   * Request Body: { ids: string[] }（发送前 adaptReverse → snake_case）
   */
  batchDeleteHistory: async (
    data: AdaptedRequestBody<'_qa_batch_delete_history'> | { ids: string[] }
  ): Promise<TypedApiResponse<QABatchDeleteResponse, '_qa_batch_delete_history'>> => {
    return apiClient.ai.post(
      '/qa/history/batch-delete',
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },
};

export default qaTypedApi;
