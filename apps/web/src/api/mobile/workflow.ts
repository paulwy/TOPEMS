/**
 * Mobile · 移动端工作流 (Workflow) API 绑定
 *
 * 路由:
 *   GET    /mobile/workflow/instances
 *   GET    /mobile/workflow/instances/{id}
 *   POST   /mobile/workflow/instances/{id}/action
 *   GET    /mobile/workflow/tasks
 *   POST   /mobile/workflow/tasks/{id}/complete
 *   GET    /mobile/workflow/definitions
 *   GET    /mobile/workflow/pending-count
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'suspended';
export type WorkflowAction = 'approve' | 'reject' | 'delegate' | 'transfer' | 'complete' | 'cancel';

export interface WorkflowInstance {
  id: string;
  tenant_id?: string;
  definition_id: string;
  definition_name: string;
  title: string;
  status: WorkflowStatus;
  current_node_name?: string;
  assignee?: string;
  assignee_name?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  form_data?: Record<string, unknown>;
  business_key?: string;
  business_type?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowTask {
  id: string;
  instance_id: string;
  instance_title: string;
  node_id: string;
  node_name: string;
  task_type: 'user_task' | 'service_task' | 'script_task';
  assignee?: string;
  assignee_name?: string;
  status: 'pending' | 'claimed' | 'completed' | 'delegated' | 'expired';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
  claimed_at?: string;
  completed_at?: string;
  form_data?: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  code: string;
  description?: string;
  version: number;
  category?: string;
  is_active: boolean;
  node_count: number;
  created_at: string;
  updated_at: string;
}

export interface PendingTaskCount {
  total: number;
  urgent: number;
  overdue: number;
  by_type: Array<{
    type: string;
    count: number;
  }>;
  by_priority: Array<{
    priority: string;
    count: number;
  }>;
}

export interface WorkflowActionRequest {
  action: WorkflowAction;
  comment?: string;
  assignee?: string;
  form_data?: Record<string, unknown>;
}

export const workflowApi = {
  listInstances: async (params?: {
    status?: WorkflowStatus;
    definition_id?: string;
    assignee?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: WorkflowInstance[]; total: number }>> => {
    return apiClient.mobile.get('/mobile/workflow/instances', { params });
  },

  getInstance: async (id: string): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.mobile.get(`/mobile/workflow/instances/${id}`);
  },

  performAction: async (
    id: string,
    data: WorkflowActionRequest
  ): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.mobile.post(`/mobile/workflow/instances/${id}/action`, data);
  },

  listTasks: async (params?: {
    status?: WorkflowTask['status'];
    assignee?: string;
    priority?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: WorkflowTask[]; total: number }>> => {
    return apiClient.mobile.get('/mobile/workflow/tasks', { params });
  },

  completeTask: async (
    id: string,
    data?: { comment?: string; form_data?: Record<string, unknown> }
  ): Promise<ApiResponse<WorkflowTask>> => {
    return apiClient.mobile.post(`/mobile/workflow/tasks/${id}/complete`, data || {});
  },

  listDefinitions: async (params?: {
    category?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<WorkflowDefinition[]>> => {
    return apiClient.mobile.get('/mobile/workflow/definitions', { params });
  },

  getPendingCount: async (): Promise<ApiResponse<PendingTaskCount>> => {
    return apiClient.mobile.get('/mobile/workflow/pending-count');
  },
};

export default workflowApi;
