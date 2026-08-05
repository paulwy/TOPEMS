import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  LowcodePage,
  CreateLowcodePageRequest,
  UpdateLowcodePageRequest,
  LowcodePaginationParams,
} from './types';

// 页面 CRUD + 预览发布：对应 PageListPage / PageDesignPage
export const lowcodePagesApi = {
  list: async (
    params?: LowcodePaginationParams & { app_id?: string; type?: string }
  ): Promise<ApiResponse<{ items: LowcodePage[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.app_id) searchParams.set('app_id', params.app_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    const qs = searchParams.toString();
    return apiClient.lowcode.get<{ items: LowcodePage[]; total: number }>(
      `/pages${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<LowcodePage>> => {
    return apiClient.lowcode.get<LowcodePage>(`/pages/${id}`);
  },

  create: async (data: CreateLowcodePageRequest): Promise<ApiResponse<LowcodePage>> => {
    return apiClient.lowcode.post<LowcodePage>('/pages', data);
  },

  update: async (
    id: string,
    data: UpdateLowcodePageRequest
  ): Promise<ApiResponse<LowcodePage>> => {
    return apiClient.lowcode.put<LowcodePage>(`/pages/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.lowcode.delete<{ success: boolean }>(`/pages/${id}`);
  },

  // 发布页面
  publish: async (id: string): Promise<ApiResponse<LowcodePage>> => {
    return apiClient.lowcode.post<LowcodePage>(`/pages/${id}/publish`);
  },

  // 预览页面（返回渲染所需的完整组件树，不依赖已发布版本）
  preview: async (id: string): Promise<ApiResponse<LowcodePage>> => {
    return apiClient.lowcode.get<LowcodePage>(`/pages/${id}/preview`);
  },

  // 设为应用首页
  setAsHome: async (id: string): Promise<ApiResponse<LowcodePage>> => {
    return apiClient.lowcode.post<LowcodePage>(`/pages/${id}/set-home`);
  },

  // 获取某应用下所有页面（下拉选择用）
  listByApp: async (appId: string): Promise<ApiResponse<LowcodePage[]>> => {
    return apiClient.lowcode.get<LowcodePage[]>(`/apps/${appId}/pages`);
  },

  // 阶段二预留：表单提交时触发 automation rule 的钩子
  // onFormSubmitHook: async (pageId, formId, payload) => ...
};
