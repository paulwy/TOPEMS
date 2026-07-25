/**
 * Schema Registry API — 元数据驱动的动态 API 客户端
 *
 * 对接后端 /api/master-data/schema-registry 端点
 * 提供 Schema 注册、查询、动态数据 CRUD 能力
 *
 * 注意: BASE_PATH 使用相对路径，由 apiClient.master 的 baseURL (`/api/master-data`) 拼接
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

// ============ 类型定义 ============

export interface SchemaDefinition {
  id: string;
  name: string;
  title: string;
  description?: string;
  schema_json: Record<string, unknown>;
  table_name: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSchemaRequest {
  name: string;
  title: string;
  description?: string;
  schema_json: Record<string, unknown>;
}

export interface UpdateSchemaRequest {
  title?: string;
  description?: string;
  schema_json?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ListSchemaQuery {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
}

export interface DynamicDataRecord {
  id: string;
  schema_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListDataQuery {
  page?: number;
  page_size?: number;
  search?: string;
}

// ============ Schema 管理 API ============

const BASE_PATH = '/schema-registry';

export const schemaRegistryApi = {
  // Schema CRUD
  createSchema: async (
    data: CreateSchemaRequest
  ): Promise<ApiResponse<SchemaDefinition>> => {
    return apiClient.master.post(`${BASE_PATH}/schemas`, data);
  },

  listSchemas: async (
    params?: ListSchemaQuery
  ): Promise<ApiResponse<PaginatedResponse<SchemaDefinition>>> => {
    return apiClient.master.get(`${BASE_PATH}/schemas`, { params });
  },

  getSchema: async (id: string): Promise<ApiResponse<SchemaDefinition>> => {
    return apiClient.master.get(`${BASE_PATH}/schemas/${id}`);
  },

  updateSchema: async (
    id: string,
    data: UpdateSchemaRequest
  ): Promise<ApiResponse<SchemaDefinition>> => {
    return apiClient.master.put(`${BASE_PATH}/schemas/${id}`, data);
  },

  deleteSchema: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.master.delete(`${BASE_PATH}/schemas/${id}`);
  },

  // 动态数据 CRUD
  createData: async (
    schemaId: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<DynamicDataRecord>> => {
    return apiClient.master.post(`${BASE_PATH}/schemas/${schemaId}/data`, data);
  },

  listData: async (
    schemaId: string,
    params?: ListDataQuery
  ): Promise<ApiResponse<PaginatedResponse<DynamicDataRecord> & { schema: { id: string; name: string; title: string } }>> => {
    return apiClient.master.get(`${BASE_PATH}/schemas/${schemaId}/data`, { params });
  },

  getData: async (
    schemaId: string,
    recordId: string
  ): Promise<ApiResponse<DynamicDataRecord>> => {
    return apiClient.master.get(`${BASE_PATH}/schemas/${schemaId}/data/${recordId}`);
  },

  updateData: async (
    schemaId: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<DynamicDataRecord>> => {
    return apiClient.master.put(`${BASE_PATH}/schemas/${schemaId}/data/${recordId}`, data);
  },

  deleteData: async (
    schemaId: string,
    recordId: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.master.delete(`${BASE_PATH}/schemas/${schemaId}/data/${recordId}`);
  },
};

export default schemaRegistryApi;
