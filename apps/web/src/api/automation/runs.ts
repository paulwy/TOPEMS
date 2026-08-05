import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { AutomationRun, AutomationRunListParams } from './types';

// 自动化执行历史：对应 AutomationRunsPage
export const automationRunsApi = {
  list: async (
    params?: AutomationRunListParams
  ): Promise<ApiResponse<{ items: AutomationRun[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.rule_id) searchParams.set('rule_id', params.rule_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.start_time) searchParams.set('start_time', params.start_time);
    if (params?.end_time) searchParams.set('end_time', params.end_time);
    const qs = searchParams.toString();
    return apiClient.automation.get<{ items: AutomationRun[]; total: number }>(
      `/runs${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<AutomationRun>> => {
    return apiClient.automation.get<AutomationRun>(`/runs/${id}`);
  },

  /** 重试某次失败运行 */
  retry: async (id: string): Promise<ApiResponse<{ run_id: string }>> => {
    return apiClient.automation.post<{ run_id: string }>(`/runs/${id}/retry`);
  },

  /** 取消运行中任务 */
  cancel: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.automation.post<{ success: boolean }>(`/runs/${id}/cancel`);
  },

  /** 获取运行步骤明细（含每步输入/输出） */
  getSteps: async (id: string): Promise<ApiResponse<NonNullable<AutomationRun['steps']>>> => {
    return apiClient.automation.get<NonNullable<AutomationRun['steps']>>(`/runs/${id}/steps`);
  },

  /** 获取运行日志（流式或分页文本） */
  getLogs: async (
    id: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<ApiResponse<{ lines: string[]; total: number; truncated: boolean }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    const qs = searchParams.toString();
    return apiClient.automation.get<{ lines: string[]; total: number; truncated: boolean }>(
      `/runs/${id}/logs${qs ? `?${qs}` : ''}`
    );
  },

  /** 批量清理历史运行记录 */
  purge: async (params: {
    before?: string;
    status?: string;
  }): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.automation.post<{ deleted: number }>('/runs/purge', params);
  },
};
