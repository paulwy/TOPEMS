import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============ Types ============

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type WorkflowTriggerType = 'manual' | 'event' | 'schedule' | 'api';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type MappingStatus = 'active' | 'inactive' | 'draft';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  trigger_config?: Record<string, unknown>;
  entity_type: string;
  status: WorkflowStatus;
  version: string;
  steps: WorkflowStep[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'task' | 'notification' | 'auto_transform' | 'condition';
  config?: Record<string, unknown>;
  order: number;
  required?: boolean;
}

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  change_data?: Record<string, unknown>;
  status: ApprovalStatus;
  approvers?: string[];
  current_approver?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  rejected_at?: string;
  comments?: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_version: string;
  status: ExecutionStatus;
  trigger_type: WorkflowTriggerType;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  steps_completed: number;
  steps_total: number;
  error_message?: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
}

export interface WorkflowLog {
  id: string;
  execution_id: string;
  step_id: string;
  step_name: string;
  action: string;
  actor?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface WorkflowDashboard {
  total_workflows: number;
  active_workflows: number;
  pending_approvals: number;
  completed_today: number;
  failed_today: number;
  avg_execution_time_ms: number;
  approval_rate: number;
  recent_executions: WorkflowExecution[];
}

export interface DataMapping {
  id: string;
  name: string;
  source_entity: string;
  target_entity: string;
  source_field: string;
  target_field: string;
  transform_expression?: string;
  status: MappingStatus;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============ Request Types ============

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  trigger_config?: Record<string, unknown>;
  entity_type: string;
  steps: Omit<WorkflowStep, 'id'>[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  trigger_type?: WorkflowTriggerType;
  trigger_config?: Record<string, unknown>;
  entity_type?: string;
  steps?: Omit<WorkflowStep, 'id'>[];
}

export interface ListWorkflowsRequest {
  entity_type?: string;
  status?: WorkflowStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface CreateApprovalRequest {
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  change_data?: Record<string, unknown>;
  approvers?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ReviewApprovalRequest {
  action: 'approve' | 'reject' | 'escalate' | 'cancel';
  comment?: string;
}

export interface ExecuteWorkflowRequest {
  input_data?: Record<string, unknown>;
  trigger_type?: WorkflowTriggerType;
}

export interface CreateMappingRequest {
  name: string;
  source_entity: string;
  target_entity: string;
  source_field: string;
  target_field: string;
  transform_expression?: string;
}

export interface UpdateMappingRequest {
  name?: string;
  source_entity?: string;
  target_entity?: string;
  source_field?: string;
  target_field?: string;
  transform_expression?: string;
  status?: MappingStatus;
}

// ============ API ============

export const dataWorkflowAutomationApiV78 = {
  // ===== 工作流定义管理 =====
  async createWorkflow(data: CreateWorkflowRequest): Promise<ApiResponse<WorkflowDefinition>> {
    return apiClient.master.post<WorkflowDefinition>('/mdm-v78/workflows', data);
  },

  async getWorkflow(id: string): Promise<ApiResponse<WorkflowDefinition>> {
    return apiClient.master.get<WorkflowDefinition>(`/mdm-v78/workflows/${id}`);
  },

  async listWorkflows(
    params?: ListWorkflowsRequest
  ): Promise<ApiResponse<PaginatedResponse<WorkflowDefinition>>> {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('q', params.search);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<WorkflowDefinition>>(
      `/mdm-v78/workflows${s ? `?${s}` : ''}`
    );
  },

  async updateWorkflow(
    id: string,
    data: UpdateWorkflowRequest
  ): Promise<ApiResponse<WorkflowDefinition>> {
    return apiClient.master.put<WorkflowDefinition>(`/mdm-v78/workflows/${id}`, data);
  },

  async deleteWorkflow(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v78/workflows/${id}`);
  },

  async setWorkflowStatus(
    id: string,
    status: WorkflowStatus
  ): Promise<ApiResponse<WorkflowDefinition>> {
    return apiClient.master.patch<WorkflowDefinition>(`/mdm-v78/workflows/${id}/status`, {
      status,
    });
  },

  // ===== 数据变更审批 =====
  async createApproval(data: CreateApprovalRequest): Promise<ApiResponse<ApprovalRequest>> {
    return apiClient.master.post<ApprovalRequest>('/mdm-v78/approvals', data);
  },

  async getApproval(id: string): Promise<ApiResponse<ApprovalRequest>> {
    return apiClient.master.get<ApprovalRequest>(`/mdm-v78/approvals/${id}`);
  },

  async listApprovals(params?: {
    status?: ApprovalStatus;
    entity_type?: string;
    approver?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalRequest>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.approver) qs.set('approver', params.approver);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ApprovalRequest>>(
      `/mdm-v78/approvals${s ? `?${s}` : ''}`
    );
  },

  async reviewApproval(
    id: string,
    data: ReviewApprovalRequest
  ): Promise<ApiResponse<ApprovalRequest>> {
    return apiClient.master.post<ApprovalRequest>(`/mdm-v78/approvals/${id}/review`, data);
  },

  async getMyApprovals(params?: {
    status?: ApprovalStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalRequest>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<ApprovalRequest>>(
      `/mdm-v78/approvals/my${s ? `?${s}` : ''}`
    );
  },

  async getApprovalStats(): Promise<
    ApiResponse<{
      pending: number;
      approved: number;
      rejected: number;
      escalated: number;
      cancelled: number;
    }>
  > {
    return apiClient.master.get('/mdm-v78/approvals/stats');
  },

  // ===== 自动化工作流执行 =====
  async executeWorkflow(
    workflowId: string,
    data?: ExecuteWorkflowRequest
  ): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.master.post<WorkflowExecution>(
      `/mdm-v78/workflows/${workflowId}/execute`,
      data || {}
    );
  },

  async getExecution(id: string): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.master.get<WorkflowExecution>(`/mdm-v78/executions/${id}`);
  },

  async listExecutions(params?: {
    workflow_id?: string;
    status?: ExecutionStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<WorkflowExecution>>> {
    const qs = new URLSearchParams();
    if (params?.workflow_id) qs.set('workflow_id', params.workflow_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<WorkflowExecution>>(
      `/mdm-v78/executions${s ? `?${s}` : ''}`
    );
  },

  async cancelExecution(id: string): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.master.post<WorkflowExecution>(`/mdm-v78/executions/${id}/cancel`, {});
  },

  async retryExecution(id: string): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.master.post<WorkflowExecution>(`/mdm-v78/executions/${id}/retry`, {});
  },

  // ===== 工作流监控与日志 =====
  async listExecutionLogs(executionId: string): Promise<ApiResponse<WorkflowLog[]>> {
    return apiClient.master.get<WorkflowLog[]>(`/mdm-v78/executions/${executionId}/logs`);
  },

  async getWorkflowLogs(
    workflowId: string,
    params?: {
      limit?: number;
    }
  ): Promise<ApiResponse<WorkflowLog[]>> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.master.get<WorkflowLog[]>(
      `/mdm-v78/workflows/${workflowId}/logs${s ? `?${s}` : ''}`
    );
  },

  async getStepLogs(stepId: string): Promise<ApiResponse<WorkflowLog[]>> {
    return apiClient.master.get<WorkflowLog[]>(`/mdm-v78/steps/${stepId}/logs`);
  },

  async getErrorLogs(params?: {
    workflow_id?: string;
    limit?: number;
  }): Promise<ApiResponse<WorkflowLog[]>> {
    const qs = new URLSearchParams();
    if (params?.workflow_id) qs.set('workflow_id', params.workflow_id);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiClient.master.get<WorkflowLog[]>(`/mdm-v78/logs/errors${s ? `?${s}` : ''}`);
  },

  // ===== 数据映射与转换 =====
  async createMapping(data: CreateMappingRequest): Promise<ApiResponse<DataMapping>> {
    return apiClient.master.post<DataMapping>('/mdm-v78/mappings', data);
  },

  async getMapping(id: string): Promise<ApiResponse<DataMapping>> {
    return apiClient.master.get<DataMapping>(`/mdm-v78/mappings/${id}`);
  },

  async listMappings(params?: {
    source_entity?: string;
    target_entity?: string;
    status?: MappingStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<DataMapping>>> {
    const qs = new URLSearchParams();
    if (params?.source_entity) qs.set('source_entity', params.source_entity);
    if (params?.target_entity) qs.set('target_entity', params.target_entity);
    if (params?.status) qs.set('status', params.status);
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    const s = qs.toString();
    return apiClient.master.get<PaginatedResponse<DataMapping>>(
      `/mdm-v78/mappings${s ? `?${s}` : ''}`
    );
  },

  async updateMapping(id: string, data: UpdateMappingRequest): Promise<ApiResponse<DataMapping>> {
    return apiClient.master.put<DataMapping>(`/mdm-v78/mappings/${id}`, data);
  },

  async deleteMapping(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.master.delete<{ deleted: boolean }>(`/mdm-v78/mappings/${id}`);
  },

  async testMapping(
    id: string,
    sampleData?: Record<string, unknown>
  ): Promise<
    ApiResponse<{
      success: boolean;
      transformed_data?: Record<string, unknown>;
      error_message?: string;
    }>
  > {
    return apiClient.master.post(`/mdm-v78/mappings/${id}/test`, { sample_data: sampleData });
  },

  // ===== 工作流版本管理 =====
  async listWorkflowVersions(
    workflowId: string
  ): Promise<ApiResponse<{ versions: string[]; current: string }>> {
    return apiClient.master.get(`/mdm-v78/workflows/${workflowId}/versions`);
  },

  async getWorkflowVersion(
    workflowId: string,
    version: string
  ): Promise<ApiResponse<WorkflowDefinition>> {
    return apiClient.master.get<WorkflowDefinition>(
      `/mdm-v78/workflows/${workflowId}/versions/${version}`
    );
  },

  async promoteVersion(
    workflowId: string,
    version: string
  ): Promise<ApiResponse<WorkflowDefinition>> {
    return apiClient.master.post<WorkflowDefinition>(
      `/mdm-v78/workflows/${workflowId}/versions/${version}/promote`,
      {}
    );
  },

  async diffWorkflowVersions(
    workflowId: string,
    v1: string,
    v2: string
  ): Promise<
    ApiResponse<{
      added_steps: string[];
      removed_steps: string[];
      modified_steps: string[];
    }>
  > {
    return apiClient.master.get(`/mdm-v78/workflows/${workflowId}/diff?v1=${v1}&v2=${v2}`);
  },

  // ===== 工作流仪表板 =====
  async getDashboard(): Promise<ApiResponse<WorkflowDashboard>> {
    return apiClient.master.get<WorkflowDashboard>('/mdm-v78/dashboard');
  },

  async getWorkflowStats(): Promise<
    ApiResponse<{
      by_entity_type: Record<string, number>;
      by_trigger_type: Record<string, number>;
      avg_approval_time_ms: number;
      execution_success_rate: number;
    }>
  > {
    return apiClient.master.get('/mdm-v78/stats');
  },
};
