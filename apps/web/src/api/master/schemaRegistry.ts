import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

/**
 * Schema Registry 元数据驱动动态 API
 * 契约（svc/master-data/src/modules/schema_registry.rs）：
 * Schema CRUD /schemas + 动态数据 CRUD /schemas/{id}/data
 * 前端经 apiClient.master 访问（/api/master-data/schema-registry）
 */

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

export interface SchemaQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  is_active?: boolean;
}

export interface DynamicDataRecord {
  id: string;
  schema_id: string;
  schema_name?: string;
  data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export const schemaRegistryApi = {
  // ===== Schema CRUD =====
  list: async (
    params?: SchemaQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SchemaDefinition>>> => {
    return apiClient.master.get('/schema-registry/schemas', { params });
  },

  get: async (id: string): Promise<ApiResponse<SchemaDefinition>> => {
    return apiClient.master.get(`/schema-registry/schemas/${id}`);
  },

  create: async (data: CreateSchemaRequest): Promise<ApiResponse<SchemaDefinition>> => {
    return apiClient.master.post('/schema-registry/schemas', data);
  },

  update: async (id: string, data: UpdateSchemaRequest): Promise<ApiResponse<SchemaDefinition>> => {
    return apiClient.master.put(`/schema-registry/schemas/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.master.delete(`/schema-registry/schemas/${id}`);
  },

  // ===== 动态数据 CRUD =====
  listData: async (
    schemaId: string,
    params?: { page?: number; pageSize?: number; search?: string }
  ): Promise<ApiResponse<PaginatedResponse<DynamicDataRecord>>> => {
    return apiClient.master.get(`/schema-registry/schemas/${schemaId}/data`, { params });
  },

  getData: async (schemaId: string, recordId: string): Promise<ApiResponse<DynamicDataRecord>> => {
    return apiClient.master.get(`/schema-registry/schemas/${schemaId}/data/${recordId}`);
  },

  createData: async (
    schemaId: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<DynamicDataRecord>> => {
    return apiClient.master.post(`/schema-registry/schemas/${schemaId}/data`, data);
  },

  updateData: async (
    schemaId: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<DynamicDataRecord>> => {
    return apiClient.master.put(`/schema-registry/schemas/${schemaId}/data/${recordId}`, data);
  },

  removeData: async (
    schemaId: string,
    recordId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.master.delete(`/schema-registry/schemas/${schemaId}/data/${recordId}`);
  },
};

export default schemaRegistryApi;
