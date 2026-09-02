import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  LowcodeDataModel,
  CreateLowcodeDataModelRequest,
  UpdateLowcodeDataModelRequest,
  LowcodePaginationParams,
} from './types';

// 数据模型 CRUD：对应 DataModelListPage
export const lowcodeDataModelsApi = {
  list: async (
    params?: LowcodePaginationParams & { app_id?: string }
  ): Promise<ApiResponse<{ items: LowcodeDataModel[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.app_id) searchParams.set('app_id', params.app_id);
    const qs = searchParams.toString();
    return apiClient.lowcode.get<{ items: LowcodeDataModel[]; total: number }>(
      `/data-models${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<LowcodeDataModel>> => {
    return apiClient.lowcode.get<LowcodeDataModel>(`/data-models/${id}`);
  },

  create: async (data: CreateLowcodeDataModelRequest): Promise<ApiResponse<LowcodeDataModel>> => {
    return apiClient.lowcode.post<LowcodeDataModel>('/data-models', data);
  },

  update: async (
    id: string,
    data: UpdateLowcodeDataModelRequest
  ): Promise<ApiResponse<LowcodeDataModel>> => {
    return apiClient.lowcode.put<LowcodeDataModel>(`/data-models/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.lowcode.delete<{ success: boolean }>(`/data-models/${id}`);
  },

  // 根据模型定义生成物理表（materialized = true）
  materialize: async (id: string): Promise<ApiResponse<LowcodeDataModel>> => {
    return apiClient.lowcode.post<LowcodeDataModel>(`/data-models/${id}/materialize`);
  },

  // 获取某应用下所有模型（下拉选择用）
  listByApp: async (appId: string): Promise<ApiResponse<LowcodeDataModel[]>> => {
    return apiClient.lowcode.get<LowcodeDataModel[]>(`/apps/${appId}/data-models`);
  },
};
