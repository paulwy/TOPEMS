import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  AutomationRule,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  AutomationPaginationParams,
} from './types';

// 自动化规则 CRUD：对应 AutomationRulesPage
export const automationRulesApi = {
  list: async (
    params?: AutomationPaginationParams
  ): Promise<ApiResponse<{ items: AutomationRule[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.trigger_type) searchParams.set('trigger_type', params.trigger_type);
    const qs = searchParams.toString();
    return apiClient.automation.get<{ items: AutomationRule[]; total: number }>(
      `/rules${qs ? `?${qs}` : ''}`
    );
  },

  get: async (id: string): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.automation.get<AutomationRule>(`/rules/${id}`);
  },

  getByCode: async (code: string): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.automation.get<AutomationRule>(`/rules/by-code/${encodeURIComponent(code)}`);
  },

  create: async (data: CreateAutomationRuleRequest): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.automation.post<AutomationRule>('/rules', data);
  },

  update: async (
    id: string,
    data: UpdateAutomationRuleRequest
  ): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.automation.put<AutomationRule>(`/rules/${id}`, data);
  },

  remove: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.automation.delete<{ success: boolean }>(`/rules/${id}`);
  },

  enable: async (id: string): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.automation.post<AutomationRule>(`/rules/${id}/enable`);
  },

  disable: async (id: string): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.automation.post<AutomationRule>(`/rules/${id}/disable`);
  },

  duplicate: async (id: string): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.automation.post<AutomationRule>(`/rules/${id}/duplicate`);
  },

  /** 手动触发一次规则运行 */
  trigger: async (
    id: string,
    inputVariables?: Record<string, unknown>
  ): Promise<ApiResponse<{ run_id: string }>> => {
    return apiClient.automation.post<{ run_id: string }>(`/rules/${id}/trigger`, {
      input_variables: inputVariables ?? {},
    });
  },
};
