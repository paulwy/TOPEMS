/**
 * V72.5 第三批 类型安全 API 绑定 — AI Document
 *
 * 基于 OpenAPI 生成类型（operationId: _document_list / _document_get / _document_delete），
 * 使用 AdaptedQuery / TypedApiResponse 模式。
 *
 * 路径映射说明：
 *   前端 apiClient.ai.get('/documents')     → OpenAPI GET /api/ai/documents → operation _document_list
 *   前端 apiClient.ai.get('/documents/{id}') → OpenAPI GET /api/ai/documents/{id} → operation _document_get
 *   前端 apiClient.ai.delete('/documents/{id}') → OpenAPI DELETE /api/ai/documents/{id} → operation _document_delete
 *
 * 注意：OpenAPI 中 /api/ai/documents 仅有 GET（list），无 POST/PUT/DELETE。
 * create/update 在前端代码中存在但 OpenAPI 未生成对应 operation，此处仅绑定已匹配的 operation。
 *
 * 使用方式：
 *   import { documentTypedApi } from './documentTyped';
 *   const res = await documentTypedApi.list({ page: 1, pagesize: 20 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import type { Document, PaginationParams, PaginatedResult } from './types';
import {
  toOpenApiParams,
  type AdaptedQuery,
  type TypedApiResponse,
} from '@topems/shared-types';

export const documentTypedApi = {
  /**
   * _document_list operation（openapi: GET /api/ai/documents）
   * Query Params: { page, pagesize, search, category }（AdaptedQuery 后 camelCase）
   */
  list: async (
    params?: AdaptedQuery<'_document_list'> | PaginationParams,
  ): Promise<TypedApiResponse<PaginatedResult<Document>>> => {
    return apiClient.ai.get('/documents', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  /**
   * _document_get operation（openapi: GET /api/ai/documents/{id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Document, '_document_get'>> => {
    return apiClient.ai.get(`/documents/${id}`);
  },

  /**
   * _document_delete operation（openapi: DELETE /api/ai/documents/{id}）
   */
  delete: async (id: string): Promise<TypedApiResponse<string, '_document_delete'>> => {
    return apiClient.ai.delete(`/documents/${id}`);
  },
};

export default documentTypedApi;
