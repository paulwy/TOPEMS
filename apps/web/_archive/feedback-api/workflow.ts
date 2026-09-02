/**
 * Feedback · 自动化工作流 API 绑定
 *
 * 后端: svc/feedback/src/handlers.rs
 * 路由:
 *   GET    /feedback/workflows
 *   POST   /feedback/workflows
 *   GET    /feedback/workflows/{id}
 *   PUT    /feedback/workflows/{id}
 *   DELETE /feedback/workflows/{id}
 *   POST   /feedback/workflows/{id}/trigger
 *   GET    /feedback/workflows/{id}/history
 *   GET    /feedback/workflow-triggers
 *   POST   /feedback/workflow-triggers
 *   GET    /feedback/workflow-triggers/{id}
 *   PUT    /feedback/workflow-triggers/{id}
 *   DELETE /feedback/workflow-triggers/{id}
 *   GET    /feedback/workflow-actions
 *   POST   /feedback/workflow-actions
 *   GET    /feedback/workflow-actions/{id}
 *   PUT    /feedback/workflow-actions/{id}
 *   DELETE /feedback/workflow-actions/{id}
 *   POST   /feedback/workflows/validate
 *   GET    /feedback/workflows/stats
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type TriggerType = 'event' | 'schedule' | 'api';
export type ActionType =
  'assign' | 'change_status' | 'send_notification' | 'create_task' | 'escalate' | 'webhook';

export interface WorkflowRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  trigger_type: TriggerType;
  trigger_config: {
    event?: string;
    schedule?: string;
    conditions?: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
      value: string;
    }>;
  };
  actions: Array<{
    type: ActionType;
    config: Record<string, unknown>;
  }>;
  priority: number;
  times_triggered: number;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  type: TriggerType;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowAction {
  id: string;
  workflow_id: string;
  type: ActionType;
  name: string;
  config: Record<string, unknown>;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger_type: TriggerType;
  trigger_config: WorkflowRule['trigger_config'];
  actions: WorkflowRule['actions'];
  priority?: number;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  trigger_type?: TriggerType;
  trigger_config?: WorkflowRule['trigger_config'];
  actions?: WorkflowRule['actions'];
  priority?: number;
}

export interface ValidateRequest {
  trigger_type: TriggerType;
  trigger_config: WorkflowRule['trigger_config'];
  actions: WorkflowRule['actions'];
}

export interface WorkflowHistory {
  id: string;
  workflow_id: string;
  feedback_id: string;
  trigger_reason: string;
  actions_executed: Array<{
    action_type: ActionType;
    status: 'success' | 'failed';
    message?: string;
  }>;
  executed_at: string;
  duration_ms: number;
}

export interface WorkflowStats {
  total_workflows: number;
  active_workflows: number;
  total_triggers_today: number;
  successful_triggers: number;
  failed_triggers: number;
  by_type: Array<{
    type: TriggerType;
    count: number;
  }>;
}

export const workflowApi = {
  // ==================== 工作流规则管理 ====================

  listWorkflows: async (params?: {
    status?: WorkflowStatus;
    trigger_type?: TriggerType;
    is_active?: boolean;
    search?: string;
  }): Promise<ApiResponse<WorkflowRule[]>> => {
    return apiClient.feedback.get('/feedback/workflows', { params });
  },

  getWorkflow: async (id: string): Promise<ApiResponse<WorkflowRule>> => {
    return apiClient.feedback.get(`/feedback/workflows/${id}`);
  },

  createWorkflow: async (data: CreateWorkflowRequest): Promise<ApiResponse<WorkflowRule>> => {
    return apiClient.feedback.post('/feedback/workflows', data);
  },

  updateWorkflow: async (
    id: string,
    data: UpdateWorkflowRequest
  ): Promise<ApiResponse<WorkflowRule>> => {
    return apiClient.feedback.put(`/feedback/workflows/${id}`, data);
  },

  deleteWorkflow: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedback/workflows/${id}`);
  },

  triggerWorkflow: async (
    id: string,
    data?: { feedback_id?: string }
  ): Promise<ApiResponse<WorkflowHistory>> => {
    return apiClient.feedback.post(`/feedback/workflows/${id}/trigger`, data);
  },

  getWorkflowHistory: async (
    id: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<WorkflowHistory[]>> => {
    return apiClient.feedback.get(`/feedback/workflows/${id}/history`, { params });
  },

  // ==================== 触发器管理 ====================

  listTriggers: async (workflowId: string): Promise<ApiResponse<WorkflowTrigger[]>> => {
    return apiClient.feedback.get('/feedback/workflow-triggers', {
      params: { workflow_id: workflowId },
    });
  },

  createTrigger: async (
    data: Omit<WorkflowTrigger, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<WorkflowTrigger>> => {
    return apiClient.feedback.post('/feedback/workflow-triggers', data);
  },

  getTrigger: async (id: string): Promise<ApiResponse<WorkflowTrigger>> => {
    return apiClient.feedback.get(`/feedback/workflow-triggers/${id}`);
  },

  updateTrigger: async (
    id: string,
    data: Partial<Omit<WorkflowTrigger, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ApiResponse<WorkflowTrigger>> => {
    return apiClient.feedback.put(`/feedback/workflow-triggers/${id}`, data);
  },

  deleteTrigger: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedback/workflow-triggers/${id}`);
  },

  // ==================== 动作管理 ====================

  listActions: async (workflowId: string): Promise<ApiResponse<WorkflowAction[]>> => {
    return apiClient.feedback.get('/feedback/workflow-actions', {
      params: { workflow_id: workflowId },
    });
  },

  createAction: async (
    data: Omit<WorkflowAction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<WorkflowAction>> => {
    return apiClient.feedback.post('/feedback/workflow-actions', data);
  },

  getAction: async (id: string): Promise<ApiResponse<WorkflowAction>> => {
    return apiClient.feedback.get(`/feedback/workflow-actions/${id}`);
  },

  updateAction: async (
    id: string,
    data: Partial<Omit<WorkflowAction, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ApiResponse<WorkflowAction>> => {
    return apiClient.feedback.put(`/feedback/workflow-actions/${id}`, data);
  },

  deleteAction: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedback/workflow-actions/${id}`);
  },

  // ==================== 验证与统计 ====================

  validateWorkflow: async (
    data: ValidateRequest
  ): Promise<ApiResponse<{ valid: boolean; errors: string[] }>> => {
    return apiClient.feedback.post('/feedback/workflows/validate', data);
  },

  getWorkflowStats: async (): Promise<ApiResponse<WorkflowStats>> => {
    return apiClient.feedback.get('/feedback/workflows/stats');
  },
};

export default workflowApi;
