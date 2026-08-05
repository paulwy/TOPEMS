import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  LowcodeDataSource,
  CreateLowcodeDataSourceRequest,
  UpdateLowcodeDataSourceRequest,
  DataSourceTestResult,
  LowcodePaginationParams,
} from './types';

// 数据源 CRUD + 测试连接：对应 DataSourcePage
export const lowcodeDataSourcesApi = {
  list: async (
    params?: LowcodePaginationParams & { app_id?: string }
  ): Promise<ApiResponse<{ items: LowcodeDataSource[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.app_id) searchParams.set('app_id', params.app_id);
    const qs = searchParams.toString();
    return apiClient.lowcode.get<{ items: LowcodeDataSource[]; total: number }>(
      `/data-sources${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<LowcodeDataSource>> => {
    return apiClient.lowcode.get<LowcodeDataSource>(`/data-sources/${id}`);
  },

  create: async (
    data: CreateLowcodeDataSourceRequest
  ): Promise<ApiResponse<LowcodeDataSource>> => {
    return apiClient.lowcode.post<LowcodeDataSource>('/data-sources', data);
  },

  update: async (
    id: string,
    data: UpdateLowcodeDataSourceRequest
  ): Promise<ApiResponse<LowcodeDataSource>> => {
    return apiClient.lowcode.put<LowcodeDataSource>(`/data-sources/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.lowcode.delete<{ success: boolean }>(`/data-sources/${id}`);
  },

  // 测试连接（不保存）
  testConnection: async (
    data: CreateLowcodeDataSourceRequest
  ): Promise<ApiResponse<DataSourceTestResult>> => {
    return apiClient.lowcode.post<DataSourceTestResult>('/data-sources/test', data);
  },

  // 对已保存的数据源执行测试连接
  testById: async (id: string): Promise<ApiResponse<DataSourceTestResult>> => {
    return apiClient.lowcode.post<DataSourceTestResult>(`/data-sources/${id}/test`);
  },
};
