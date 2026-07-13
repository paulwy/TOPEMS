import type { DataSource, TableInfo, ColumnInfo } from './types';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const listDataSources = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}): Promise<ApiResponse<{ items: DataSource[]; total: number; page: number; pageSize: number }>> => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  if (params?.search) query.set('search', params.search);
  if (params?.type) query.set('type', params.type);
  const qs = query.toString();
  return apiClient.core.get(`/lowcode/data-sources${qs ? `?${qs}` : ''}`);
};

export const getDataSource = async (dsId: string): Promise<ApiResponse<DataSource>> => {
  return apiClient.core.get(`/lowcode/data-sources/${dsId}`);
};

export const createDataSource = async (
  data: Partial<DataSource>
): Promise<ApiResponse<DataSource>> => {
  return apiClient.core.post('/lowcode/data-sources', data);
};

export const updateDataSource = async (
  dsId: string,
  data: Partial<DataSource>
): Promise<ApiResponse<DataSource>> => {
  return apiClient.core.put(`/lowcode/data-sources/${dsId}`, data);
};

export const deleteDataSource = async (dsId: string): Promise<ApiResponse<string>> => {
  return apiClient.core.delete(`/lowcode/data-sources/${dsId}`);
};

export const testDataSource = async (dsId: string): Promise<ApiResponse<boolean>> => {
  return apiClient.core.post(`/lowcode/data-sources/${dsId}/test`);
};

export const listTables = async (dsId: string): Promise<ApiResponse<TableInfo[]>> => {
  return apiClient.core.get(`/lowcode/data-sources/${dsId}/tables`);
};

export const getTableInfo = async (
  dsId: string,
  tableName: string
): Promise<ApiResponse<{ table: TableInfo; columns: ColumnInfo[] }>> => {
  return apiClient.core.get(`/lowcode/data-sources/${dsId}/tables/${tableName}`);
};

export const dataSourceApi = {
  listDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSource,
  listTables,
  getTableInfo,
};
