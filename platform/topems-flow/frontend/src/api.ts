import axios from 'axios';
import {
  ApiResponse,
  Workflow,
  WorkflowInstance,
  Approval,
  ApprovalRecord,
  InstanceDetailsResponse,
  CreateWorkflowRequest,
  StartInstanceRequest,
  ProcessApprovalRequest,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8004';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Workflows
export const getWorkflows = async (isActive?: boolean): Promise<ApiResponse<Workflow[]>> => {
  const params = isActive !== undefined ? { is_active: isActive } : {};
  const response = await api.get('/api/v1/workflows', { params });
  return response.data;
};

export const getWorkflow = async (id: string): Promise<ApiResponse<Workflow>> => {
  const response = await api.get(`/api/v1/workflows/${id}`);
  return response.data;
};

export const createWorkflow = async (data: CreateWorkflowRequest): Promise<ApiResponse<Workflow>> => {
  const response = await api.post('/api/v1/workflows', data);
  return response.data;
};

export const updateWorkflow = async (
  id: string,
  data: Partial<CreateWorkflowRequest> & { is_active?: boolean }
): Promise<ApiResponse<Workflow>> => {
  const response = await api.put(`/api/v1/workflows/${id}`, data);
  return response.data;
};

export const deleteWorkflow = async (id: string): Promise<ApiResponse<void>> => {
  const response = await api.delete(`/api/v1/workflows/${id}`);
  return response.data;
};

// Instances
export const getInstances = async (
  workflowId?: string,
  status?: string,
  initiatorId?: string
): Promise<ApiResponse<WorkflowInstance[]>> => {
  const params: any = {};
  if (workflowId) params.workflow_id = workflowId;
  if (status) params.status = status;
  if (initiatorId) params.initiator_id = initiatorId;
  const response = await api.get('/api/v1/instances', { params });
  return response.data;
};

export const getInstance = async (id: string): Promise<ApiResponse<WorkflowInstance>> => {
  const response = await api.get(`/api/v1/instances/${id}`);
  return response.data;
};

export const getInstanceDetails = async (id: string): Promise<ApiResponse<InstanceDetailsResponse>> => {
  const response = await api.get(`/api/v1/instances/${id}/details`);
  return response.data;
};

export const startInstance = async (data: StartInstanceRequest): Promise<ApiResponse<WorkflowInstance>> => {
  const response = await api.post('/api/v1/instances', data);
  return response.data;
};

// Approvals
export const getApprovals = async (
  instanceId?: string,
  assigneeId?: string,
  status?: string
): Promise<ApiResponse<Approval[]>> => {
  const params: any = {};
  if (instanceId) params.workflow_instance_id = instanceId;
  if (assigneeId) params.assignee_id = assigneeId;
  if (status) params.status = status;
  const response = await api.get('/api/v1/approvals', { params });
  return response.data;
};

export const getApproval = async (id: string): Promise<ApiResponse<Approval>> => {
  const response = await api.get(`/api/v1/approvals/${id}`);
  return response.data;
};

export const processApproval = async (
  id: string,
  data: ProcessApprovalRequest
): Promise<ApiResponse<{ approval: Approval; instance?: WorkflowInstance }>> => {
  const response = await api.post(`/api/v1/approvals/${id}/process`, data);
  return response.data;
};

// Approval Records
export const getApprovalRecords = async (approvalId?: string, actorId?: string): Promise<ApiResponse<ApprovalRecord[]>> => {
  const params: any = {};
  if (approvalId) params.approval_id = approvalId;
  if (actorId) params.actor_id = actorId;
  const response = await api.get('/api/v1/records', { params });
  return response.data;
};

export const getRecordsByApproval = async (approvalId: string): Promise<ApiResponse<ApprovalRecord[]>> => {
  const response = await api.get(`/api/v1/records/${approvalId}`);
  return response.data;
};

export const healthCheck = async (): Promise<string> => {
  const response = await api.get('/health');
  return response.data;
};
