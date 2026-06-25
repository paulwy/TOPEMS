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
  data?: WorkflowData;
}

export interface WorkflowData {
  type?: string;
  scope?: string;
  usageCount?: number;
  applicant?: string;
  name?: string;
  [key: string]: any;
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

export interface ApprovalTask {
  id: string;
  workflow_instance_id?: string;
  workflow_id?: string;
  workflow_name?: string;
  node_id?: string;
  node_name?: string;
  task_name: string;
  assignee_id?: string;
  assignee_name?: string;
  initiator_id?: string;
  initiator_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'completed' | string;
  approval_type?: string;
  comment?: string;
  approved_by?: string;
  approved_at?: string;
  timeout_at?: string;
  priority?: 'low' | 'medium' | 'high';
  data?: any;
  created_at: string;
  updated_at?: string;
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

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  type?: string;
  scope?: string;
  definition?: WorkflowDefinition | any;
  usage_count?: number;
  is_active?: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowHistory {
  id: string;
  workflow_instance_id?: string;
  workflow_id?: string;
  workflow_name?: string;
  action: string;
  actor_id?: string;
  actor_name?: string;
  node_id?: string;
  node_name?: string;
  status_before?: string;
  status_after?: string;
  comment?: string;
  data?: any;
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
      return apiClient.flow.get(endpoint, { params });
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
  ...createCrudApi<Workflow>('/api/flow/workflows'),

  listWorkflows: (params?: ListParams) =>
    createCrudApi<Workflow>('/api/flow/workflows').list(params),

  getWorkflow: (id: string) => createCrudApi<Workflow>('/api/flow/workflows').get(id),

  createWorkflow: (data: CreateWorkflowRequest) =>
    createCrudApi<Workflow>('/api/flow/workflows').create(data),

  updateWorkflow: (id: string, data: UpdateWorkflowRequest) =>
    createCrudApi<Workflow>('/api/flow/workflows').update(id, data),

  deleteWorkflow: (id: string) => createCrudApi<Workflow>('/api/flow/workflows').delete(id),

  deploy: (id: string) => {
    return apiClient.flow.post(`/api/flow/workflows/${id}/deploy`);
  },

  activate: (id: string) => {
    return apiClient.flow.post(`/api/flow/workflows/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.flow.post(`/api/flow/workflows/${id}/deactivate`);
  },

  getVersions: (workflowId: string, params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/workflows/${workflowId}/versions`, {
      params,
    });
  },

  createVersion: (workflowId: string, data: CreateVersionRequest) => {
    return apiClient.flow.post(`/api/flow/workflows/${workflowId}/versions`, data);
  },

  getVersion: (workflowId: string, versionId: string) => {
    return apiClient.flow.get(`/api/flow/workflows/${workflowId}/versions/${versionId}`);
  },

  activateVersion: (workflowId: string, versionId: string) => {
    return apiClient.flow.post(`/api/flow/workflows/${workflowId}/versions/${versionId}/activate`);
  },

  rollback: (workflowId: string, data: RollbackRequest) => {
    return apiClient.flow.post(`/api/flow/workflows/${workflowId}/rollback`, data);
  },

  compareVersions: (workflowId: string, version1: string, version2: string) => {
    return apiClient.flow.get(`/api/flow/workflows/${workflowId}/compare/${version1}/${version2}`);
  },

  deleteVersion: (workflowId: string, versionId: string) => {
    return apiClient.flow.delete(`/api/flow/workflows/${workflowId}/versions/${versionId}`);
  },
};

// ========== 实例 API ==========

export const instanceApi = {
  list: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/instances`, { params });
  },

  start: (data: CreateWorkflowInstanceRequest) => {
    return apiClient.flow.post('/api/flow/instances', data);
  },

  get: (id: string) => {
    return apiClient.flow.get(`/api/flow/instances/${id}`);
  },

  getDetails: (id: string) => {
    return apiClient.flow.get(`/api/flow/instances/${id}/details`);
  },

  listInstances: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/instances`, { params });
  },

  getInstance: (id: string) => {
    return apiClient.flow.get(`/api/flow/instances/${id}`);
  },

  cancelInstance: (id: string) => {
    return apiClient.flow.post(`/api/flow/instances/${id}/cancel`);
  },

  suspendInstance: (id: string) => {
    return apiClient.flow.post(`/api/flow/instances/${id}/suspend`);
  },

  resumeInstance: (id: string) => {
    return apiClient.flow.post(`/api/flow/instances/${id}/resume`);
  },

  delete: (id: string) => {
    return apiClient.flow.delete(`/api/flow/instances/${id}`);
  },
};

// ========== 审批 API ==========

export const approvalApi = {
  list: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/approvals`, { params });
  },

  create: (data: CreateApprovalRequest) => {
    return apiClient.flow.post('/api/flow/approvals', data);
  },

  get: (id: string) => {
    return apiClient.flow.get(`/api/flow/approvals/${id}`);
  },

  process: (id: string, data: ProcessApprovalRequest) => {
    return apiClient.flow.post(`/api/flow/approvals/${id}/process`, data);
  },

  listApprovals: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/approvals`, { params });
  },

  getRecords: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/records`, { params });
  },

  getRecordsByApproval: (approvalId: string) => {
    return apiClient.flow.get(`/api/flow/records/${approvalId}`);
  },
};

export const approvalTaskApi = {
  listApprovalTasks: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/approval-tasks`, { params });
  },

  getApprovalTask: (id: string) => {
    return apiClient.flow.get(`/api/flow/approval-tasks/${id}`);
  },

  approveTask: (id: string, data?: { comment?: string; actor_id?: string }) => {
    return apiClient.flow.post(`/api/flow/approval-tasks/${id}/approve`, data);
  },

  rejectTask: (id: string, data?: { comment?: string; actor_id?: string }) => {
    return apiClient.flow.post(`/api/flow/approval-tasks/${id}/reject`, data);
  },

  delegateTask: (id: string, data: { delegate_to: string; delegate_to_name?: string }) => {
    return apiClient.flow.post(`/api/flow/approval-tasks/${id}/delegate`, data);
  },

  reassignTask: (id: string, data: { assignee_id: string; assignee_name?: string }) => {
    return apiClient.flow.post(`/api/flow/approval-tasks/${id}/reassign`, data);
  },

  claimTask: (id: string) => {
    return apiClient.flow.post(`/api/flow/approval-tasks/${id}/claim`);
  },

  unclaimTask: (id: string) => {
    return apiClient.flow.post(`/api/flow/approval-tasks/${id}/unclaim`);
  },
};

// ========== 通知 API ==========

export const notificationApi = {
  list: (userId: string, params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/notifications/${userId}`, { params });
  },

  getCount: (userId: string) => {
    return apiClient.flow.get(`/api/flow/notifications/${userId}/count`);
  },

  markAsRead: (userId: string) => {
    return apiClient.flow.post(`/api/flow/notifications/${userId}/read`);
  },

  create: (data: CreateNotificationRequest) => {
    return apiClient.flow.post('/api/flow/notifications', data);
  },

  listNotifications: (userId: string, params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/notifications/${userId}`, { params });
  },
};

export const templateApi = {
  listTemplates: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/templates`, { params });
  },

  getTemplate: (id: string) => {
    return apiClient.flow.get(`/api/flow/templates/${id}`);
  },

  createTemplate: (data: Partial<WorkflowTemplate>) => {
    return apiClient.flow.post('/api/flow/templates', data);
  },

  updateTemplate: (id: string, data: Partial<WorkflowTemplate>) => {
    return apiClient.flow.put(`/api/flow/templates/${id}`, data);
  },

  deleteTemplate: (id: string) => {
    return apiClient.flow.delete(`/api/flow/templates/${id}`);
  },

  copyTemplate: (id: string, data?: { name?: string }) => {
    return apiClient.flow.post(`/api/flow/templates/${id}/copy`, data);
  },

  exportTemplate: (id: string) => {
    return apiClient.flow.get(`/api/flow/templates/${id}/export`);
  },

  importTemplate: (data: { file: File | any; name?: string }) => {
    return apiClient.flow.post('/api/flow/templates/import', data);
  },
};

export const settingApi = {
  listSettings: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/settings`, { params });
  },

  getSetting: (id: string) => {
    return apiClient.flow.get(`/api/flow/settings/${id}`);
  },

  updateSetting: (id: string, data: { value?: string }) => {
    return apiClient.flow.put(`/api/flow/settings/${id}`, data);
  },

  getSettingByKey: (key: string) => {
    return apiClient.flow.get(`/api/flow/settings/key/${key}`);
  },

  batchUpdateSettings: (data: { settings: { id: string; value: string }[] }) => {
    return apiClient.flow.post('/api/flow/settings/batch', data);
  },

  resetSetting: (id: string) => {
    return apiClient.flow.post(`/api/flow/settings/${id}/reset`);
  },
};

export const historyApi = {
  listHistory: (params?: ListParams) => {
    return apiClient.flow.get(`/api/flow/history`, { params });
  },

  getHistory: (id: string) => {
    return apiClient.flow.get(`/api/flow/history/${id}`);
  },

  getHistoryByInstance: (instanceId: string) => {
    return apiClient.flow.get(`/api/flow/history/instance/${instanceId}`);
  },

  getHistoryByWorkflow: (workflowId: string) => {
    return apiClient.flow.get(`/api/flow/history/workflow/${workflowId}`);
  },
};

// ========== 统一导出 ==========

export const flowApi = {
  workflows: workflowApi,
  instances: instanceApi,
  approvals: approvalApi,
  approvalTasks: approvalTaskApi,
  notifications: notificationApi,
  templates: templateApi,
  settings: settingApi,
  history: historyApi,

  listWorkflows: workflowApi.listWorkflows,
  getWorkflow: workflowApi.getWorkflow,
  createWorkflow: workflowApi.createWorkflow,
  updateWorkflow: workflowApi.updateWorkflow,
  deleteWorkflow: workflowApi.deleteWorkflow,
  deployWorkflow: workflowApi.deploy,
  activateWorkflow: workflowApi.activate,
  deactivateWorkflow: workflowApi.deactivate,

  listInstances: instanceApi.listInstances,
  startInstance: instanceApi.start,
  getInstance: instanceApi.getInstance,
  getInstanceDetails: instanceApi.getDetails,
  cancelInstance: instanceApi.cancelInstance,
  suspendInstance: instanceApi.suspendInstance,
  resumeInstance: instanceApi.resumeInstance,

  listApprovals: approvalApi.listApprovals,
  createApproval: approvalApi.create,
  getApproval: approvalApi.get,
  processApproval: approvalApi.process,

  listApprovalTasks: approvalTaskApi.listApprovalTasks,
  getApprovalTask: approvalTaskApi.getApprovalTask,
  approveTask: approvalTaskApi.approveTask,
  rejectTask: approvalTaskApi.rejectTask,
  delegateTask: approvalTaskApi.delegateTask,
  reassignTask: approvalTaskApi.reassignTask,

  listNotifications: notificationApi.listNotifications,
  getNotificationCount: notificationApi.getCount,
  markNotificationsAsRead: notificationApi.markAsRead,
  createNotification: notificationApi.create,

  listTemplates: templateApi.listTemplates,
  getTemplate: templateApi.getTemplate,
  createTemplate: templateApi.createTemplate,
  updateTemplate: templateApi.updateTemplate,
  deleteTemplate: templateApi.deleteTemplate,

  listSettings: settingApi.listSettings,
  getSetting: settingApi.getSetting,
  updateSetting: settingApi.updateSetting,

  listHistory: historyApi.listHistory,
  getHistory: historyApi.getHistory,

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
    return apiClient.flow.get('/api/flow/statistics');
  },

  getPerformance: async (): Promise<ApiResponse<PerformanceStats>> => {
    return apiClient.flow.get('/api/flow/performance');
  },

  resetPerformance: async (): Promise<ApiResponse<string>> => {
    return apiClient.flow.post('/api/flow/performance/reset');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.flow.get('/health');
  },
};

export default flowApi;
