import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  AutomationVariable,
  CreateAutomationVariableRequest,
  UpdateAutomationVariableRequest,
  AutomationVariableScope,
} from './types';

// 自动化环境变量 / 密钥管理：对应 AutomationVariablesPage
export const automationVariablesApi = {
  list: async (params?: {
    scope?: AutomationVariableScope;
    rule_id?: string;
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<ApiResponse<{ items: AutomationVariable[]; total: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.scope) searchParams.set('scope', params.scope);
    if (params?.rule_id) searchParams.set('rule_id', params.rule_id);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiClient.automation.get<{ items: AutomationVariable[]; total: number }>(
      `/variables${qs ? `?${qs}` : ''}`
    );
  },

  get: async (key: string): Promise<ApiResponse<AutomationVariable>> => {
    return apiClient.automation.get<AutomationVariable>(
      `/variables/${encodeURIComponent(key)}`
    );
  },

  create: async (
    data: CreateAutomationVariableRequest
  ): Promise<ApiResponse<AutomationVariable>> => {
    return apiClient.automation.post<AutomationVariable>('/variables', data);
  },

  update: async (
    key: string,
    data: UpdateAutomationVariableRequest
  ): Promise<ApiResponse<AutomationVariable>> => {
    return apiClient.automation.put<AutomationVariable>(
      `/variables/${encodeURIComponent(key)}`,
      data
    );
  },

  remove: async (key: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.automation.delete<{ success: boolean }>(
      `/variables/${encodeURIComponent(key)}`
    );
  },

  /** 解密密钥明文（仅授权角色可调用） */
  reveal: async (key: string): Promise<ApiResponse<{ value: string }>> => {
    return apiClient.automation.get<{ value: string }>(
      `/variables/${encodeURIComponent(key)}/reveal`
    );
  },

  /** 批量导入变量 */
  bulkImport: async (
    variables: CreateAutomationVariableRequest[]
  ): Promise<ApiResponse<{ imported: number; skipped: number }>> => {
    return apiClient.automation.post<{ imported: number; skipped: number }>(
      '/variables/bulk-import',
      { variables }
    );
  },
};
