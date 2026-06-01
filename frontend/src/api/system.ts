import apiClient from './client';
import type { ApiResponse } from './client';

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
  extra_data?: any;
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
  old_definition?: any;
  new_definition?: any;
  sql_statement: string;
  executed_by?: string;
  executed_at: string;
  backup_data?: any;
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
  page_size?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const dictTypeApi = {
  async list(params?: PaginationParams & { category?: string; status?: string }): Promise<ApiResponse<PaginatedResult<DictType>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/dict-types${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<DictType>> {
    return apiClient.erp.get(`/api/v1/dict-types/${id}`);
  },
  
  async create(data: Partial<DictType>): Promise<ApiResponse<DictType>> {
    return apiClient.erp.post('/api/v1/dict-types', data);
  },
  
  async update(id: string, data: Partial<DictType>): Promise<ApiResponse<DictType>> {
    return apiClient.erp.put(`/api/v1/dict-types/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/v1/dict-types/${id}`);
  },
};

export const dictItemApi = {
  async list(dictTypeId: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResult<DictItem>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/dict-types/${dictTypeId}/items${queryString ? '?' + queryString : ''}`);
  },
  
  async get(id: string): Promise<ApiResponse<DictItem>> {
    return apiClient.erp.get(`/api/v1/dict-items/${id}`);
  },
  
  async create(data: Partial<DictItem>): Promise<ApiResponse<DictItem>> {
    return apiClient.erp.post('/api/v1/dict-items', data);
  },
  
  async update(id: string, data: Partial<DictItem>): Promise<ApiResponse<DictItem>> {
    return apiClient.erp.put(`/api/v1/dict-items/${id}`, data);
  },
  
  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/v1/dict-items/${id}`);
  },
};

export const dbStructureApi = {
  async listTables(params?: { schema?: string; search?: string }): Promise<ApiResponse<TableInfo[]>> {
    const searchParams = new URLSearchParams();
    if (params?.schema) searchParams.set('schema', params.schema);
    if (params?.search) searchParams.set('search', params.search);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/db/tables${queryString ? '?' + queryString : ''}`);
  },
  
  async getTableDetail(tableName: string): Promise<ApiResponse<TableDetail>> {
    return apiClient.erp.get(`/api/v1/db/tables/${tableName}`);
  },
  
  async previewAddColumn(data: { table_name: string; column: DbColumnDefinition }): Promise<ApiResponse<SqlPreview>> {
    return apiClient.erp.post('/api/v1/db/columns/preview', data);
  },
  
  async addColumn(data: { table_name: string; column: DbColumnDefinition }): Promise<ApiResponse<string>> {
    return apiClient.erp.post('/api/v1/db/columns', data);
  },
  
  async modifyColumn(tableName: string, columnName: string, column: DbColumnDefinition): Promise<ApiResponse<string>> {
    return apiClient.erp.put(`/api/v1/db/columns/${tableName}/${columnName}`, { table_name: tableName, column_name: columnName, column });
  },
  
  async dropColumn(tableName: string, columnName: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/v1/db/columns/${tableName}/${columnName}`);
  },
  
  async listChanges(params?: PaginationParams & { table_name?: string }): Promise<ApiResponse<PaginatedResult<DbChange>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.table_name) searchParams.set('table_name', params.table_name);
    
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/v1/db/changes${queryString ? '?' + queryString : ''}`);
  },
};
