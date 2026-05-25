import apiClient from './client';
import type { ApiResponse } from './client';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  status: string;
  initiator_id?: string;
  data?: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface Approval {
  id: string;
  workflow_instance_id: string;
  task_name: string;
  assignee_id?: string;
  status: string;
  comment?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export const flowApi = {
  listWorkflows: async () => {
    return apiClient.flow.get<ApiResponse<Workflow[]>>('/api/v1/workflows');
  },

  createWorkflow: async (data: { name: string; description?: string }) => {
    return apiClient.flow.post<ApiResponse<Workflow>>('/api/v1/workflows', data);
  },

  listInstances: async () => {
    return apiClient.flow.get<ApiResponse<WorkflowInstance[]>>('/api/v1/instances');
  },

  createInstance: async (data: { workflow_id: string; initiator_id?: string }) => {
    return apiClient.flow.post<ApiResponse<WorkflowInstance>>('/api/v1/instances', data);
  },

  listApprovals: async () => {
    return apiClient.flow.get<ApiResponse<Approval[]>>('/api/v1/approvals');
  },

  health: async () => {
    return apiClient.flow.get<ApiResponse<string>>('/health');
  },
};
