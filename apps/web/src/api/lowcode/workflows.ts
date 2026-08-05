import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  LowcodeWorkflow,
  CreateLowcodeWorkflowRequest,
  UpdateLowcodeWorkflowRequest,
  LowcodePaginationParams,
} from './types';

// 低代码内嵌工作流 CRUD：对应 WorkflowConfigPage
// 注意：这是低代码模块内部的工作流（form_submit 触发等），
// 与 /api/core/flow 的 BPM 工作流（workflow 模块）不同。
export const lowcodeWorkflowsApi = {
  list: async (
    params?: LowcodePaginationParams & { app_id?: string }
  ): Promise<ApiResponse<{ items: LowcodeWorkflow[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.app_id) searchParams.set('app_id', params.app_id);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return apiClient.lowcode.get<{ items: LowcodeWorkflow[]; total: number }>(
      `/workflows${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<LowcodeWorkflow>> => {
    return apiClient.lowcode.get<LowcodeWorkflow>(`/workflows/${id}`);
  },

  create: async (
    data: CreateLowcodeWorkflowRequest
  ): Promise<ApiResponse<LowcodeWorkflow>> => {
    return apiClient.lowcode.post<LowcodeWorkflow>('/workflows', data);
  },

  update: async (
    id: string,
    data: UpdateLowcodeWorkflowRequest
  ): Promise<ApiResponse<LowcodeWorkflow>> => {
    return apiClient.lowcode.put<LowcodeWorkflow>(`/workflows/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.lowcode.delete<{ success: boolean }>(`/workflows/${id}`);
  },

  // 启用工作流
  enable: async (id: string): Promise<ApiResponse<LowcodeWorkflow>> => {
    return apiClient.lowcode.post<LowcodeWorkflow>(`/workflows/${id}/enable`);
  },

  // 禁用工作流
  disable: async (id: string): Promise<ApiResponse<LowcodeWorkflow>> => {
    return apiClient.lowcode.post<LowcodeWorkflow>(`/workflows/${id}/disable`);
  },

  // 获取某应用下所有工作流
  listByApp: async (appId: string): Promise<ApiResponse<LowcodeWorkflow[]>> => {
    return apiClient.lowcode.get<LowcodeWorkflow[]>(`/apps/${appId}/workflows`);
  },
};
