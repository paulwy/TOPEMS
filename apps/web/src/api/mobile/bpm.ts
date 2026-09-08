/**
 * Mobile · 移动端 BPM 流程引擎 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 BPM/Workflow 服务客户端)
 * 路由:
 *   GET    /mobile/workflow/definitions
 *   GET    /mobile/workflow/definitions/{id}
 *   POST   /mobile/workflow/instances
 *   GET    /mobile/workflow/instances
 *   GET    /mobile/workflow/instances/{id}
 *   POST   /mobile/workflow/instances/{id}/tasks/{taskId}/claim
 *   POST   /mobile/workflow/instances/{id}/tasks/{taskId}/complete
 *   POST   /mobile/workflow/instances/{id}/cancel
 *   POST   /mobile/workflow/instances/{id}/suspend
 *   POST   /mobile/workflow/instances/{id}/resume
 *   GET    /mobile/workflow/tasks/pending
 *   GET    /mobile/workflow/tasks/{id}
 *   POST   /mobile/workflow/tasks/{id}/delegate
 *   GET    /mobile/workflow/instances/{id}/history
 *   GET    /mobile/workflow/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type BpmDefinitionStatus = 'draft' | 'active' | 'archived';
export type BpmInstanceStatus = 'pending' | 'running' | 'completed' | 'suspended' | 'cancelled';
export type BpmTaskStatus = 'pending' | 'claimed' | 'in_progress' | 'completed' | 'delegated';
export type BpmTaskAction = 'approve' | 'reject' | 'delegate' | 'add_comment';

export interface BpmDefinition {
  id: string;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  status: BpmDefinitionStatus;
  version: number;
  version_id?: string;
  trigger_type?: 'manual' | 'event' | 'schedule';
  created_at: string;
  updated_at: string;
}

export interface BpmInstance {
  id: string;
  definition_id: string;
  definition_name: string;
  status: BpmInstanceStatus;
  initiator: string;
  initiator_name?: string;
  current_tasks: BpmTask[];
  completed_steps: number;
  total_steps: number;
  progress: number;
  started_at: string;
  completed_at?: string;
  suspended_at?: string;
  context?: Record<string, unknown>;
}

export interface BpmTask {
  id: string;
  instance_id: string;
  node_id: string;
  node_name: string;
  type: 'user' | 'service' | 'gateway' | 'timer';
  status: BpmTaskStatus;
  assignee?: string;
  assignee_name?: string;
  claimed_at?: string;
  completed_at?: string;
  form_data?: Record<string, unknown>;
  due_date?: string;
}

export interface BpmHistory {
  id: string;
  instance_id: string;
  task_id?: string;
  action: BpmTaskAction;
  actor: string;
  actor_name?: string;
  comment?: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface BpmStats {
  total_definitions: number;
  active_definitions: number;
  total_instances: number;
  running_instances: number;
  completed_instances: number;
  cancelled_instances: number;
  pending_tasks: number;
  by_status: Array<{
    status: BpmInstanceStatus;
    count: number;
  }>;
  top_definitions: Array<{
    name: string;
    count: number;
  }>;
}

export interface StartBpmInstanceRequest {
  definition_id: string;
  initiator?: string;
  context?: Record<string, unknown>;
}

export interface CompleteBpmTaskRequest {
  action: BpmTaskAction;
  form_data?: Record<string, unknown>;
  comment?: string;
}

export interface DelegateBpmTaskRequest {
  assignee_id: string;
  reason?: string;
}

export const bpmApi = {
  // ==================== 流程定义 ====================

  listDefinitions: async (params?: {
    keyword?: string;
    status?: BpmDefinitionStatus;
    category?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<BpmDefinition>>> => {
    return apiClient.mobile.get('workflow/definitions', { params });
  },

  getDefinition: async (id: string): Promise<ApiResponse<BpmDefinition>> => {
    return apiClient.mobile.get(`workflow/definitions/${id}`);
  },

  // ==================== 流程实例 ====================

  startInstance: async (data: StartBpmInstanceRequest): Promise<ApiResponse<BpmInstance>> => {
    return apiClient.mobile.post('workflow/instances', data);
  },

  listInstances: async (params?: {
    definition_id?: string;
    status?: BpmInstanceStatus;
    initiator?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<BpmInstance>>> => {
    return apiClient.mobile.get('workflow/instances', { params });
  },

  getInstance: async (id: string): Promise<ApiResponse<BpmInstance>> => {
    return apiClient.mobile.get(`workflow/instances/${id}`);
  },

  cancelInstance: async (id: string): Promise<ApiResponse<BpmInstance>> => {
    return apiClient.mobile.post(`workflow/instances/${id}/cancel`);
  },

  suspendInstance: async (id: string): Promise<ApiResponse<BpmInstance>> => {
    return apiClient.mobile.post(`workflow/instances/${id}/suspend`);
  },

  resumeInstance: async (id: string): Promise<ApiResponse<BpmInstance>> => {
    return apiClient.mobile.post(`workflow/instances/${id}/resume`);
  },

  // ==================== 任务管理 ====================

  listPendingTasks: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<BpmTask>>> => {
    return apiClient.mobile.get('workflow/tasks/pending', { params });
  },

  getTask: async (id: string): Promise<ApiResponse<BpmTask>> => {
    return apiClient.mobile.get(`workflow/tasks/${id}`);
  },

  claimTask: async (instanceId: string, taskId: string): Promise<ApiResponse<BpmTask>> => {
    return apiClient.mobile.post(`workflow/instances/${instanceId}/tasks/${taskId}/claim`);
  },

  completeTask: async (
    instanceId: string,
    taskId: string,
    data: CompleteBpmTaskRequest
  ): Promise<ApiResponse<BpmTask>> => {
    return apiClient.mobile.post(
      `/mobile/workflow/instances/${instanceId}/tasks/${taskId}/complete`,
      data
    );
  },

  delegateTask: async (
    taskId: string,
    data: DelegateBpmTaskRequest
  ): Promise<ApiResponse<BpmTask>> => {
    return apiClient.mobile.post(`workflow/tasks/${taskId}/delegate`, data);
  },

  // ==================== 历史记录与统计 ====================

  getInstanceHistory: async (instanceId: string): Promise<ApiResponse<BpmHistory[]>> => {
    return apiClient.mobile.get(`workflow/instances/${instanceId}/history`);
  },

  getWorkflowStats: async (): Promise<ApiResponse<BpmStats>> => {
    return apiClient.mobile.get('workflow/stats');
  },
};

export default bpmApi;
