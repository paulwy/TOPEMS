import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  LowcodeForm,
  CreateLowcodeFormRequest,
  UpdateLowcodeFormRequest,
  LowcodePaginationParams,
} from './types';

// 表单 CRUD + 预览：对应 FormListPage / FormDesignPage
export const lowcodeFormsApi = {
  list: async (
    params?: LowcodePaginationParams & { app_id?: string }
  ): Promise<ApiResponse<{ items: LowcodeForm[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.app_id) searchParams.set('app_id', params.app_id);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiClient.lowcode.get<{ items: LowcodeForm[]; total: number }>(
      `/forms${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<LowcodeForm>> => {
    return apiClient.lowcode.get<LowcodeForm>(`/forms/${id}`);
  },

  create: async (data: CreateLowcodeFormRequest): Promise<ApiResponse<LowcodeForm>> => {
    return apiClient.lowcode.post<LowcodeForm>('/forms', data);
  },

  update: async (
    id: string,
    data: UpdateLowcodeFormRequest
  ): Promise<ApiResponse<LowcodeForm>> => {
    return apiClient.lowcode.put<LowcodeForm>(`/forms/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.lowcode.delete<{ success: boolean }>(`/forms/${id}`);
  },

  // 发布表单
  publish: async (id: string): Promise<ApiResponse<LowcodeForm>> => {
    return apiClient.lowcode.post<LowcodeForm>(`/forms/${id}/publish`);
  },

  // 预览表单（返回渲染所需的完整 schema，不依赖已发布版本）
  preview: async (id: string): Promise<ApiResponse<LowcodeForm>> => {
    return apiClient.lowcode.get<LowcodeForm>(`/forms/${id}/preview`);
  },

  // 获取某应用下所有表单（下拉选择用）
  listByApp: async (appId: string): Promise<ApiResponse<LowcodeForm[]>> => {
    return apiClient.lowcode.get<LowcodeForm[]>(`/apps/${appId}/forms`);
  },
};
