import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  LowcodeApp,
  CreateLowcodeAppRequest,
  UpdateLowcodeAppRequest,
  LowcodePaginationParams,
} from './types';

// 应用 CRUD：对应 AppListPage / AppManagementPage
export const lowcodeAppsApi = {
  list: async (
    params?: LowcodePaginationParams
  ): Promise<ApiResponse<{ items: LowcodeApp[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiClient.lowcode.get<{ items: LowcodeApp[]; total: number }>(
      `/apps${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<LowcodeApp>> => {
    return apiClient.lowcode.get<LowcodeApp>(`/apps/${id}`);
  },

  create: async (data: CreateLowcodeAppRequest): Promise<ApiResponse<LowcodeApp>> => {
    return apiClient.lowcode.post<LowcodeApp>('/apps', data);
  },

  update: async (
    id: string,
    data: UpdateLowcodeAppRequest
  ): Promise<ApiResponse<LowcodeApp>> => {
    return apiClient.lowcode.put<LowcodeApp>(`/apps/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.lowcode.delete<{ success: boolean }>(`/apps/${id}`);
  },

  publish: async (id: string): Promise<ApiResponse<LowcodeApp>> => {
    return apiClient.lowcode.post<LowcodeApp>(`/apps/${id}/publish`);
  },

  unpublish: async (id: string): Promise<ApiResponse<LowcodeApp>> => {
    return apiClient.lowcode.post<LowcodeApp>(`/apps/${id}/unpublish`);
  },

  duplicate: async (id: string): Promise<ApiResponse<LowcodeApp>> => {
    return apiClient.lowcode.post<LowcodeApp>(`/apps/${id}/duplicate`);
  },

  export: async (id: string): Promise<ApiResponse<{ url: string }>> => {
    return apiClient.lowcode.get<{ url: string }>(`/apps/${id}/export`);
  },

  import: async (data: { code: string; file_url: string }): Promise<ApiResponse<LowcodeApp>> => {
    return apiClient.lowcode.post<LowcodeApp>('/apps/import', data);
  },
};
