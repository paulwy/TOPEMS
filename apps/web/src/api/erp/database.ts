import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface TableInfo {
  table_name: string;
  table_type: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  ordinal_position: number;
}

export interface TableDetail {
  table_name: string;
  schema_name: string;
  columns: ColumnInfo[];
  row_count: number | null;
}

interface TableListParams {
  schema?: string;
  search?: string;
}

export interface DbChange {
  id: string;
  change_type: string;
  table_name: string;
  column_name?: string;
  old_definition?: unknown;
  new_definition?: unknown;
  sql_statement: string;
  executed_by?: string;
  executed_at: string;
  backup_data?: unknown;
}

interface DbChangeListParams {
  page?: number;
  page_size?: number;
  table_name?: string;
}

interface PaginatedDbChanges {
  items: DbChange[];
  total: number;
  page: number;
  page_size: number;
}

export const databaseApi = {
  async listTables(params?: TableListParams): Promise<ApiResponse<TableInfo[]>> {
    return apiClient.erp.get<TableInfo[]>('/db/tables', { params });
  },

  async getTableDetail(tableName: string): Promise<ApiResponse<TableDetail>> {
    return apiClient.erp.get<TableDetail>(`/db/tables/${tableName}`);
  },

  async listDbChanges(params?: DbChangeListParams): Promise<ApiResponse<PaginatedDbChanges>> {
    return apiClient.erp.get<PaginatedDbChanges>('/db/changes', { params });
  },
};
