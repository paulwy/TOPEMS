import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  workflow_type?: string;
  status: 'active' | 'inactive' | 'draft';
  definition?: Record<string, unknown>;
  version?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  business_type?: string;
  business_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  current_step?: string;
  current_assignee?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface StartWorkflowRequest {
  workflow_id: string;
  business_type?: string;
  business_id?: string;
  initial_data?: Record<string, unknown>;
}

export const workflowApi = {
  listWorkflows: (params?: { status?: string; type?: string }): Promise<ApiResponse<WorkflowDefinition[]>> => {
    return apiClient.pdm.get('/workflows', { params });
  },

  getWorkflow: (id: string): Promise<ApiResponse<WorkflowDefinition>> => {
    return apiClient.pdm.get(`/workflows/${id}`);
  },

  createWorkflow: (data: Partial<WorkflowDefinition>): Promise<ApiResponse<WorkflowDefinition>> => {
    return apiClient.pdm.post('/workflows', data);
  },

  updateWorkflow: (id: string, data: Partial<WorkflowDefinition>): Promise<ApiResponse<WorkflowDefinition>> => {
    return apiClient.pdm.put(`/workflows/${id}`, data);
  },

  startWorkflow: (data: StartWorkflowRequest): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.pdm.post('/workflows/start', data);
  },

  listInstances: (params?: {
    workflow_id?: string;
    status?: string;
  }): Promise<ApiResponse<WorkflowInstance[]>> => {
    return apiClient.pdm.get('/workflow-instances', { params });
  },

  getInstance: (id: string): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.pdm.get(`/workflow-instances/${id}`);
  },

  advanceInstance: (id: string, data?: { action?: string; comment?: string }): Promise<ApiResponse<WorkflowInstance>> => {
    return apiClient.pdm.post(`/workflow-instances/${id}/advance`, data || {});
  },
};

export default workflowApi;