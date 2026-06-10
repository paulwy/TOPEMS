import apiClient from './client';
import type { ApiResponse } from './client';

// ========== 类型定义 ==========

export interface StatisticsResponse {
  total_workflows: number;
  active_workflows: number;
  total_instances: number;
  running_instances: number;
  completed_instances: number;
  rejected_instances: number;
  total_approvals: number;
  pending_approvals: number;
  approved_approvals: number;
  rejected_approvals: number;
  avg_approval_time: number;
  approval_rate: number;
  rejection_rate: number;
  workflow_stats: WorkflowStat[];
  monthly_data: MonthlyData[];
}

export interface PerformanceStats {
  total_requests: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  slow_requests_count: number;
  slow_requests_threshold_ms: number;
}

export interface WorkflowStat {
  workflow_id: string;
  workflow_name: string;
  instance_count: number;
  completion_rate: number;
  avg_duration: number;
}

export interface MonthlyData {
  month: string;
  instances_started: number;
  instances_completed: number;
  approvals_processed: number;
}

export interface Condition {
  field: string;
  operator: string;
  value: any;
}

export type ApprovalType = 'single' | 'counter' | 'or';

export interface ApprovalNode {
  node_id: string;
  name: string;
  approvers: string[];
  approval_type: ApprovalType;
  conditions?: Condition[];
  timeout_hours?: number;
  auto_action?: string;
  notification_users?: string[];
  next_nodes?: string[];
}

export interface WorkflowDefinition {
  version: string;
  nodes: ApprovalNode[];
  start_node: string;
  end_nodes: string[];
  timeout_action?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition | any;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  definition?: WorkflowDefinition | any;
  is_active?: boolean;
  created_by?: string;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition | any;
  is_active?: boolean;
}

export interface WorkflowInstance {
  id: string;
  workflow_id?: string;
  status: 'pending' | 'running' | 'completed' | 'rejected' | string;
  current_node?: string;
  initiator_id?: string;
  data?: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface CreateWorkflowInstanceRequest {
  workflow_id: string;
  initiator_id?: string;
  data?: any;
}

export interface Approval {
  id: string;
  workflow_instance_id?: string;
  node_id?: string;
  task_name: string;
  assignee_id?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  approval_type?: string;
  comment?: string;
  approved_by?: string;
  approved_at?: string;
  timeout_at?: string;
  created_at: string;
}

export interface CreateApprovalRequest {
  workflow_instance_id: string;
  node_id?: string;
  task_name: string;
  assignee_id?: string;
  approval_type?: string;
  timeout_hours?: number;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version: string;
  definition: any;
  change_description?: string;
  created_by?: string;
  created_at: string;
  is_active: boolean;
}

export interface CreateVersionRequest {
  version: string;
  definition?: any;
  change_description?: string;
  created_by?: string;
}

export interface RollbackRequest {
  to_version: string;
  reason?: string;
  rolled_back_by?: string;
}

export interface ProcessApprovalRequest {
  action: 'approve' | 'reject';
  comment?: string;
  actor_id: string;
  actor_name?: string;
  delegate_to?: string;
  delegate_to_name?: string;
}

export interface ApprovalRecord {
  id: string;
  approval_id: string;
  action: string;
  actor_id: string;
  actor_name?: string;
  comment?: string;
  previous_status: string;
  new_status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  notification_type: string;
  workflow_instance_id?: string;
  approval_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationRequest {
  user_id?: string;
  title: string;
  content: string;
  notification_type: string;
  workflow_instance_id?: string;
  approval_id?: string;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  workflow_id?: string;
  assignee_id?: string;
  initiator_id?: string;
  user_id?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ========== 通用工具函数 ==========

function buildQueryString(params?: ListParams): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

interface CrudOperations<T> {
  list: (params?: ListParams) => Promise<ApiResponse<PaginatedResult<T>>>;
  get: (id: string) => Promise<ApiResponse<T>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: string, data: Partial<T>) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<string>>;
}

function createCrudApi<T>(endpoint: string): CrudOperations<T> {
  return {
    list: (params?: ListParams) => {
      const queryString = buildQueryString(params);
      return apiClient.flow.get(`${endpoint}${queryString}`);
    },

    get: (id: string) => {
      return apiClient.flow.get(`${endpoint}/${id}`);
    },

    create: (data: Partial<T>) => {
      return apiClient.flow.post(endpoint, data);
    },

    update: (id: string, data: Partial<T>) => {
      return apiClient.flow.put(`${endpoint}/${id}`, data);
    },

    delete: (id: string) => {
      return apiClient.flow.delete(`${endpoint}/${id}`);
    },
  };
}

// ========== 工作流 API ==========

export const workflowApi = {
  ...createCrudApi<Workflow>('/api/v1/workflows'),

  listWorkflows: (params?: ListParams) => createCrudApi<Workflow>('/api/v1/workflows').list(params),

  getWorkflow: (id: string) => createCrudApi<Workflow>('/api/v1/workflows').get(id),

  createWorkflow: (data: CreateWorkflowRequest) => createCrudApi<Workflow>('/api/v1/workflows').create(data),

  updateWorkflow: (id: string, data: UpdateWorkflowRequest) =>
    createCrudApi<Workflow>('/api/v1/workflows').update(id, data),

  deleteWorkflow: (id: string) => createCrudApi<Workflow>('/api/v1/workflows').delete(id),

  getVersions: (workflowId: string, params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/workflows/${workflowId}/versions${queryString}`);
  },

  createVersion: (workflowId: string, data: CreateVersionRequest) => {
    return apiClient.flow.post(`/api/v1/workflows/${workflowId}/versions`, data);
  },

  getVersion: (workflowId: string, versionId: string) => {
    return apiClient.flow.get(`/api/v1/workflows/${workflowId}/versions/${versionId}`);
  },

  activateVersion: (workflowId: string, versionId: string) => {
    return apiClient.flow.post(`/api/v1/workflows/${workflowId}/versions/${versionId}/activate`);
  },

  rollback: (workflowId: string, data: RollbackRequest) => {
    return apiClient.flow.post(`/api/v1/workflows/${workflowId}/rollback`, data);
  },

  compareVersions: (workflowId: string, version1: string, version2: string) => {
    return apiClient.flow.get(`/api/v1/workflows/${workflowId}/compare/${version1}/${version2}`);
  },

  deleteVersion: (workflowId: string, versionId: string) => {
    return apiClient.flow.delete(`/api/v1/workflows/${workflowId}/versions/${versionId}`);
  },
};

// ========== 实例 API ==========

export const instanceApi = {
  list: (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/instances${queryString}`);
  },

  start: (data: CreateWorkflowInstanceRequest) => {
    return apiClient.flow.post('/api/v1/instances', data);
  },

  get: (id: string) => {
    return apiClient.flow.get(`/api/v1/instances/${id}`);
  },

  getDetails: (id: string) => {
    return apiClient.flow.get(`/api/v1/instances/${id}/details`);
  },

  listInstances: (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/instances${queryString}`);
  },
};

// ========== 审批 API ==========

export const approvalApi = {
  list: (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/approvals${queryString}`);
  },

  create: (data: CreateApprovalRequest) => {
    return apiClient.flow.post('/api/v1/approvals', data);
  },

  get: (id: string) => {
    return apiClient.flow.get(`/api/v1/approvals/${id}`);
  },

  process: (id: string, data: ProcessApprovalRequest) => {
    return apiClient.flow.post(`/api/v1/approvals/${id}/process`, data);
  },

  listApprovals: (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/approvals${queryString}`);
  },

  getRecords: (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/records${queryString}`);
  },

  getRecordsByApproval: (approvalId: string) => {
    return apiClient.flow.get(`/api/v1/records/${approvalId}`);
  },
};

// ========== 通知 API ==========

export const notificationApi = {
  list: (userId: string, params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/notifications/${userId}${queryString}`);
  },

  getCount: (userId: string) => {
    return apiClient.flow.get(`/api/v1/notifications/${userId}/count`);
  },

  markAsRead: (userId: string) => {
    return apiClient.flow.post(`/api/v1/notifications/${userId}/read`);
  },

  create: (data: CreateNotificationRequest) => {
    return apiClient.flow.post('/api/v1/notifications', data);
  },

  listNotifications: (userId: string, params?: ListParams) => {
    const queryString = buildQueryString(params);
    return apiClient.flow.get(`/api/v1/notifications/${userId}${queryString}`);
  },
};

// ========== 统一导出 ==========

export const flowApi = {
  workflows: workflowApi,
  instances: instanceApi,
  approvals: approvalApi,
  notifications: notificationApi,

  listWorkflows: workflowApi.listWorkflows,
  getWorkflow: workflowApi.getWorkflow,
  createWorkflow: workflowApi.createWorkflow,
  updateWorkflow: workflowApi.updateWorkflow,
  deleteWorkflow: workflowApi.deleteWorkflow,

  listInstances: instanceApi.listInstances,
  startInstance: instanceApi.start,
  getInstance: instanceApi.get,
  getInstanceDetails: instanceApi.getDetails,

  listApprovals: approvalApi.listApprovals,
  createApproval: approvalApi.create,
  getApproval: approvalApi.get,
  processApproval: approvalApi.process,

  listNotifications: notificationApi.listNotifications,
  getNotificationCount: notificationApi.getCount,
  markNotificationsAsRead: notificationApi.markAsRead,
  createNotification: notificationApi.create,

  getRecords: approvalApi.getRecords,
  getRecordsByApproval: approvalApi.getRecordsByApproval,

  getVersions: workflowApi.getVersions,
  createVersion: workflowApi.createVersion,
  getVersion: workflowApi.getVersion,
  activateVersion: workflowApi.activateVersion,
  rollbackVersion: workflowApi.rollback,
  compareVersions: workflowApi.compareVersions,
  deleteVersion: workflowApi.deleteVersion,

  getStatistics: async (): Promise<ApiResponse<StatisticsResponse>> => {
    return apiClient.flow.get('/api/v1/statistics');
  },

  getPerformance: async (): Promise<ApiResponse<PerformanceStats>> => {
    return apiClient.flow.get('/api/v1/performance');
  },

  resetPerformance: async (): Promise<ApiResponse<string>> => {
    return apiClient.flow.post('/api/v1/performance/reset');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.flow.get('/health');
  },
};

export default flowApi;
