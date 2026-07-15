import apiClient from '../client';
import type { ApiResponse } from '../client';
import { systemParamsApi } from './params';
import { systemAuditApi } from './audit';

export type { SystemConfig, CacheConfig, LogConfig, SystemParams } from './types';
export type { AuditLog, AuditLogQueryParams, PaginatedAuditLogs } from './types';

export interface DictType {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DictItem {
  id: string;
  dict_type_id: string;
  code: string;
  name: string;
  value?: string;
  sort_order: number;
  parent_id?: string;
  extra_data?: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TableInfo {
  table_name: string;
  table_type: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  character_maximum_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
  ordinal_position: number;
}

export interface TableDetail {
  table_name: string;
  schema_name: string;
  columns: ColumnInfo[];
  row_count?: number;
}

export interface DbChange {
  id: string;
  change_type: string;
  table_name: string;
  column_name?: string;
  old_definition?: Record<string, unknown>;
  new_definition?: Record<string, unknown>;
  sql_statement: string;
  executed_by?: string;
  executed_at: string;
  backup_data?: unknown;
}

export interface DbColumnDefinition {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  default_value?: string;
  max_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
  comment?: string;
}

export interface SqlPreview {
  sql: string;
  warning?: string;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export const dictTypeApi = {
  async list(
    params?: PaginationParams & { category?: string; status?: string }
  ): Promise<ApiResponse<PaginatedResult<DictType>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.core.get(`/dict/dict-types${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<DictType>> {
    return apiClient.core.get(`/dict/dict-types/${id}`);
  },

  async create(data: Partial<DictType>): Promise<ApiResponse<DictType>> {
    return apiClient.core.post('/dict/dict-types', data);
  },

  async update(id: string, data: Partial<DictType>): Promise<ApiResponse<DictType>> {
    return apiClient.core.put(`/dict/dict-types/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.core.delete(`/dict/dict-types/${id}`);
  },
};

export interface BatchCreateDictItemRequest {
  dict_type_id: string;
  items: Partial<DictItem>[];
}

export interface DictItemExport {
  code: string;
  name: string;
  value?: string;
  sort_order: number;
  status: string;
}

export const dictItemApi = {
  async list(
    dictTypeId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<DictItem>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    return apiClient.core.get(
      `/dict/dict-types/${dictTypeId}/items${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<DictItem>> {
    return apiClient.core.get(`/dict/dict-items/${id}`);
  },

  async create(data: Partial<DictItem>): Promise<ApiResponse<DictItem>> {
    return apiClient.core.post('/dict/dict-items', data);
  },

  async update(id: string, data: Partial<DictItem>): Promise<ApiResponse<DictItem>> {
    return apiClient.core.put(`/dict/dict-items/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.core.delete(`/dict/dict-items/${id}`);
  },

  async batchCreate(data: BatchCreateDictItemRequest): Promise<ApiResponse<DictItem[]>> {
    return apiClient.core.post('/dict/dict-items/batch', data);
  },

  async export(dictTypeId: string): Promise<string> {
    const response = await apiClient.core.get(`/dict/dict-types/${dictTypeId}/items/export`, {
      responseType: 'text',
    });
    return response.data;
  },
};

export const dbStructureApi = {
  async listTables(params?: {
    schema?: string;
    search?: string;
  }): Promise<ApiResponse<TableInfo[]>> {
    const searchParams = new URLSearchParams();
    if (params?.schema) searchParams.set('schema', params.schema);
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/system/db/tables${queryString ? `?${queryString}` : ''}`);
  },

  async getTableDetail(tableName: string): Promise<ApiResponse<TableDetail>> {
    return apiClient.erp.get(`/system/db/tables/${tableName}`);
  },

  async previewAddColumn(data: {
    table_name: string;
    column: DbColumnDefinition;
  }): Promise<ApiResponse<SqlPreview>> {
    return apiClient.erp.post('/system/db/columns/preview', data);
  },

  async addColumn(data: {
    table_name: string;
    column: DbColumnDefinition;
  }): Promise<ApiResponse<string>> {
    return apiClient.erp.post('/system/db/columns', data);
  },

  async modifyColumn(
    tableName: string,
    columnName: string,
    column: DbColumnDefinition
  ): Promise<ApiResponse<string>> {
    return apiClient.erp.put(`/system/db/columns/${tableName}/${columnName}`, {
      table_name: tableName,
      column_name: columnName,
      column,
    });
  },

  async dropColumn(tableName: string, columnName: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/system/db/columns/${tableName}/${columnName}`);
  },

  async listChanges(
    params?: PaginationParams & { table_name?: string }
  ): Promise<ApiResponse<PaginatedResult<DbChange>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.table_name) searchParams.set('table_name', params.table_name);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/system/db/changes${queryString ? `?${queryString}` : ''}`);
  },
};

export { systemParamsApi, systemAuditApi };

export default { dictTypeApi, dictItemApi, dbStructureApi, systemParamsApi, systemAuditApi };
