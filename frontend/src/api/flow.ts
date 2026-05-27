import apiClient from './client';
import type { ApiResponse } from './client';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition?: WorkflowDefinition;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDefinition {
  version: string;
  nodes: ApprovalNode[];
  start_node: string;
  end_nodes: string[];
}

export interface ApprovalNode {
  node_id: string;
  name: string;
  approvers: string[];
  approval_type: 'single' | 'counter' | 'or';
  conditions?: Condition[];
  timeout_hours?: number;
  auto_action?: string;
  notification_users?: string[];
}

export interface Condition {
  field: string;
  operator: string;
  value: any;
}

export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  status: string;
  current_node?: string;
  initiator_id?: string;
  data?: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface Approval {
  id: string;
  workflow_instance_id: string;
  node_id: string;
  task_name: string;
  assignee_id?: string;
  status: string;
  approval_type: 'single' | 'counter' | 'or';
  comment?: string;
  approved_by?: string;
  approved_at?: string;
  timeout_at?: string;
  created_at: string;
}

export interface ApprovalRecord {
  id: string;
  approval_id: string;
  action: string;
  user_id: string;
  user_name: string;
  comment?: string;
  previous_status: string;
  new_status: string;
  created_at: string;
}

export interface ApprovalQuery {
  workflow_instance_id?: string;
  status?: string;
  assignee_id?: string;
}

export interface RecordQuery {
  approval_id?: string;
  user_id?: string;
}

export const flowApi = {
  listWorkflows: async (): Promise<ApiResponse<Workflow[]>> => {
    return apiClient.flow.get<Workflow[]>('/api/v1/workflows');
  },

  getWorkflow: async (id: string): Promise<ApiResponse<Workflow>> => {
    return apiClient.flow.get<Workflow>(`/api/v1/workflows/${id}`);
  },

  createWorkflow: async (data: { 
    name: string; 
    description?: string;
    definition?: WorkflowDefinition;
  }): Promise<ApiResponse<Workflow>> => {
    return apiClient.flow.post<Workflow>('/api/v1/workflows', data);
  },

  updateWorkflow: async (id: string, data: {
    name: string;
    description?: string;
    definition?: WorkflowDefinition;
  }): Promise<ApiResponse<Workflow>> => {
    return apiClient.flow.put<Workflow>(`/api/v1/workflows/${id}`, data);
  },

  deleteWorkflow: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.flow.delete<void>(`/api/v1/workflows/${id}`);
  },

  listInstances: async (): Promise<ApiResponse<WorkflowInstance[]>> => {
    return apiClient.flow.get<WorkflowInstance[]>('/api/v1/instances');
  },

  getInstance: async (id: string): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.flow.get<WorkflowInstance>(`/api/v1/instances/${id}`);
  },

  createInstance: async (data: { 
    workflow_id: string; 
    initiator_id?: string;
    data?: any;
  }): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.flow.post<WorkflowInstance>('/api/v1/instances', data);
  },

  updateInstanceStatus: async (id: string, status: string): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.flow.patch<WorkflowInstance>(
      `/api/v1/instances/${id}/status`,
      { status }
    );
  },

  listApprovals: async (query?: ApprovalQuery): Promise<ApiResponse<Approval[]>> => {
    const params = new URLSearchParams();
    if (query?.workflow_instance_id) params.append('workflow_instance_id', query.workflow_instance_id);
    if (query?.status) params.append('status', query.status);
    if (query?.assignee_id) params.append('assignee_id', query.assignee_id);
    
    const queryString = params.toString();
    const url = queryString ? `/api/v1/approvals?${queryString}` : '/api/v1/approvals';
    return apiClient.flow.get<Approval[]>(url);
  },

  getApproval: async (id: string): Promise<ApiResponse<Approval>> => {
    return apiClient.flow.get<Approval>(`/api/v1/approvals/${id}`);
  },

  createApproval: async (data: {
    workflow_instance_id: string;
    node_id: string;
    task_name: string;
    assignee_id?: string;
    approval_type?: 'single' | 'counter' | 'or';
    timeout_hours?: number;
  }): Promise<ApiResponse<Approval>> => {
    return apiClient.flow.post<Approval>('/api/v1/approvals', data);
  },

  approve: async (id: string, data: {
    comment?: string;
    user_id?: string;
    user_name?: string;
  }): Promise<ApiResponse<Approval>> => {
    return apiClient.flow.post<Approval>(
      `/api/v1/approvals/${id}/action`,
      { status: 'approved', ...data }
    );
  },

  reject: async (id: string, data: {
    comment?: string;
    user_id?: string;
    user_name?: string;
  }): Promise<ApiResponse<Approval>> => {
    return apiClient.flow.post<Approval>(
      `/api/v1/approvals/${id}/action`,
      { status: 'rejected', ...data }
    );
  },

  delegate: async (id: string, data: {
    delegate_to: string;
    delegate_to_name: string;
    reason?: string;
    user_id: string;
    user_name: string;
  }): Promise<ApiResponse<Approval>> => {
    return apiClient.flow.post<Approval>(
      `/api/v1/approvals/${id}/delegate`,
      data
    );
  },

  addComment: async (id: string, data: {
    content: string;
    user_id: string;
    user_name: string;
  }): Promise<ApiResponse<Comment>> => {
    return apiClient.flow.post<Comment>(
      `/api/v1/approvals/${id}/comment`,
      data
    );
  },

  getComments: async (id: string): Promise<ApiResponse<Comment[]>> => {
    return apiClient.flow.get<Comment[]>(`/api/v1/approvals/${id}/comments`);
  },

  getPendingApprovals: async (): Promise<ApiResponse<Approval[]>> => {
    return apiClient.flow.get<Approval[]>('/api/v1/approvals/pending');
  },

  getCompletedApprovals: async (): Promise<ApiResponse<Approval[]>> => {
    return apiClient.flow.get<Approval[]>('/api/v1/approvals/completed');
  },

  processTimeout: async (id: string): Promise<ApiResponse<Approval>> => {
    return apiClient.flow.post<Approval>(`/api/v1/approvals/${id}/timeout`, {});
  },

  listRecords: async (query?: RecordQuery): Promise<ApiResponse<ApprovalRecord[]>> => {
    const params = new URLSearchParams();
    if (query?.approval_id) params.append('approval_id', query.approval_id);
    if (query?.user_id) params.append('user_id', query.user_id);
    
    const queryString = params.toString();
    const url = queryString ? `/api/v1/records?${queryString}` : '/api/v1/records';
    return apiClient.flow.get<ApprovalRecord[]>(url);
  },

  getRecordsByApproval: async (approvalId: string): Promise<ApiResponse<ApprovalRecord[]>> => {
    return apiClient.flow.get<ApprovalRecord[]>(
      `/api/v1/records/${approvalId}`
    );
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.flow.get<string>('/health');
  },
};
