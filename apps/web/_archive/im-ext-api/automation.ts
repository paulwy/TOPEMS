/**
 * IM · 聊天自动化 API 绑定
 *
 * 后端: IM 服务 /automation/*
 * 路由:
 *   POST   /automation/rules
 *   GET    /automation/rules
 *   GET    /automation/rules/:id
 *   PUT    /automation/rules/:id
 *   DELETE /automation/rules/:id
 *   POST   /automation/rules/:id/toggle
 *   POST   /automation/rules/:id/test
 *   POST   /automation/workflows/:id/trigger
 *   GET    /automation/history
 *   GET    /automation/stats
 *   GET    /automation/templates
 *   POST   /automation/rules/:id/duplicate
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type RuleStatus = 'enabled' | 'disabled';
export type RuleTriggerType = 'keyword' | 'regex' | 'intent' | 'time' | 'condition';
export type RuleActionType =
  | 'send_message'
  | 'create_task'
  | 'create_event'
  | 'create_ticket'
  | 'send_notification'
  | 'webhook'
  | 'assign_owner';
export type ExecutionStatus = 'success' | 'failed' | 'partial';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: RuleTriggerType;
    condition: string;
    chat_ids?: string[];
    user_ids?: string[];
  };
  action: {
    type: RuleActionType;
    params: Record<string, unknown>;
  };
  status: RuleStatus;
  execution_count: number;
  last_executed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationRuleRequest {
  name: string;
  description?: string;
  trigger: {
    type: RuleTriggerType;
    condition: string;
    chat_ids?: string[];
    user_ids?: string[];
  };
  action: {
    type: RuleActionType;
    params: Record<string, unknown>;
  };
}

export interface UpdateAutomationRuleRequest {
  name?: string;
  description?: string;
  trigger?: {
    type?: RuleTriggerType;
    condition?: string;
    chat_ids?: string[];
    user_ids?: string[];
  };
  action?: {
    type?: RuleActionType;
    params?: Record<string, unknown>;
  };
}

export interface ExecutionHistory {
  id: string;
  rule_id: string;
  rule_name: string;
  trigger_message_id?: string;
  trigger_chat_id?: string;
  status: ExecutionStatus;
  action_type: RuleActionType;
  result: Record<string, unknown>;
  execution_time_ms: number;
  error_message?: string;
  created_at: string;
}

export interface AutomationStats {
  total_rules: number;
  active_rules: number;
  total_executions: number;
  today_executions: number;
  success_rate: number;
  by_action_type: Record<RuleActionType, number>;
  failed_executions: number;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: {
    type: RuleTriggerType;
    condition: string;
  };
  action: {
    type: RuleActionType;
    params: Record<string, unknown>;
  };
  usage_count: number;
  is_premade: boolean;
}

export const imAutomationApi = {
  createAutomationRule: async (
    data: CreateAutomationRuleRequest
  ): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.im.post('/automation/rules', data);
  },

  listAutomationRules: async (params?: {
    status?: RuleStatus;
    trigger_type?: RuleTriggerType;
  }): Promise<ApiResponse<AutomationRule[]>> => {
    return apiClient.im.get('/automation/rules', { params });
  },

  getAutomationRule: async (id: string): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.im.get(`/automation/rules/${id}`);
  },

  updateAutomationRule: async (
    id: string,
    data: UpdateAutomationRuleRequest
  ): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.im.put(`/automation/rules/${id}`, data);
  },

  deleteAutomationRule: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient.im.delete(`/automation/rules/${id}`);
  },

  toggleRuleStatus: async (
    id: string,
    status: RuleStatus
  ): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.im.post(`/automation/rules/${id}/toggle`, { status });
  },

  testRule: async (
    id: string,
    testMessage: string
  ): Promise<
    ApiResponse<{
      triggered: boolean;
      actions: Array<{ type: RuleActionType; executed: boolean; result?: Record<string, unknown> }>;
    }>
  > => {
    return apiClient.im.post(`/automation/rules/${id}/test`, { test_message: testMessage });
  },

  triggerWorkflow: async (
    workflowId: string,
    params: Record<string, unknown>
  ): Promise<ApiResponse<{ execution_id: string; status: ExecutionStatus }>> => {
    return apiClient.im.post(`/automation/workflows/${workflowId}/trigger`, params);
  },

  getAutomationHistory: async (params?: {
    status?: ExecutionStatus;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ExecutionHistory[]>> => {
    return apiClient.im.get('/automation/history', { params });
  },

  getAutomationStats: async (): Promise<ApiResponse<AutomationStats>> => {
    return apiClient.im.get('/automation/stats');
  },

  getRuleTemplates: async (params?: {
    category?: string;
  }): Promise<ApiResponse<RuleTemplate[]>> => {
    return apiClient.im.get('/automation/templates', { params });
  },

  duplicateRule: async (id: string, newName?: string): Promise<ApiResponse<AutomationRule>> => {
    return apiClient.im.post(`/automation/rules/${id}/duplicate`, { new_name: newName });
  },
};
