import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

// ============ Types ============

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
}

export interface TableDetail {
  table_name: string;
  schema_name: string;
  columns: ColumnInfo[];
  row_count?: number;
}

export interface DbChange {
  id: string;
  table_name: string;
  change_type: string;
  description: string;
  executed_at: string;
  executed_by?: string;
}

export interface SqlPreview {
  sql: string;
  warning?: string;
}

export interface AddColumnRequest {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable?: boolean;
  default_value?: string;
  description?: string;
}

export interface ModifyColumnRequest {
  data_type?: string;
  is_nullable?: boolean;
  default_value?: string;
  description?: string;
}

export interface DropColumnRequest {
  confirm: boolean;
  reason?: string;
}

export interface DbChangeListResponse {
  items: DbChange[];
  total: number;
}

export interface TableQueryParams {
  schema?: string;
  search?: string;
}

export interface DbChangeQueryParams extends PaginationParams {
  table_name?: string;
}

// ============ Helper ============

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

// ============ API ============

export const dbStructureApi = {
  async listTables(params?: TableQueryParams): Promise<ApiResponse<TableInfo[]>> {
    const sp = new URLSearchParams();
    if (params?.schema) sp.set('schema', params.schema);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString();
    return apiClient.erp.get<TableInfo[]>(`/db/tables${qs ? `?${qs}` : ''}`);
  },

  async getTableDetail(tableName: string): Promise<ApiResponse<TableDetail>> {
    return apiClient.erp.get<TableDetail>(`/db/tables/${tableName}`);
  },

  async previewAddColumn(data: AddColumnRequest): Promise<ApiResponse<SqlPreview>> {
    return apiClient.erp.post<SqlPreview>('/db/columns/preview', data);
  },

  async addColumn(
    data: AddColumnRequest
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.erp.post<{ success: boolean; message: string }>('/db/columns', data);
  },

  async modifyColumn(
    tableName: string,
    columnName: string,
    data: ModifyColumnRequest
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.erp.put<{ success: boolean; message: string }>(
      `/db/columns/${tableName}/${columnName}`,
      data
    );
  },

  async dropColumn(
    tableName: string,
    columnName: string,
    data: DropColumnRequest
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const sp = new URLSearchParams();
    sp.set('confirm', data.confirm.toString());
    if (data.reason) sp.set('reason', data.reason);
    return apiClient.erp.delete<{ success: boolean; message: string }>(
      `/db/columns/${tableName}/${columnName}?${sp.toString()}`
    );
  },

  async listChanges(params?: DbChangeQueryParams): Promise<ApiResponse<DbChangeListResponse>> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) sp.set('pagesize', ps);
    if (params?.table_name) sp.set('table_name', params.table_name);
    const qs = sp.toString();
    return apiClient.erp.get<DbChangeListResponse>(`/db/changes${qs ? `?${qs}` : ''}`);
  },
};
