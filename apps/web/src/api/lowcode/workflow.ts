import type { WorkflowDefinition } from './types';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export const listWorkflows = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<
  ApiResponse<{ items: WorkflowDefinition[]; total: number; page: number; pageSize: number }>
> => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return apiClient.core.get(`/lowcode/workflows${qs ? `?${qs}` : ''}`);
};

export const getWorkflow = async (wfId: string): Promise<ApiResponse<WorkflowDefinition>> => {
  return apiClient.core.get(`/lowcode/workflows/${wfId}`);
};

export const createWorkflow = async (
  data: Partial<WorkflowDefinition>
): Promise<ApiResponse<WorkflowDefinition>> => {
  return apiClient.core.post('/lowcode/workflows', data);
};

export const updateWorkflow = async (
  wfId: string,
  data: Partial<WorkflowDefinition>
): Promise<ApiResponse<WorkflowDefinition>> => {
  return apiClient.core.put(`/lowcode/workflows/${wfId}`, data);
};

export const deleteWorkflow = async (wfId: string): Promise<ApiResponse<string>> => {
  return apiClient.core.delete(`/lowcode/workflows/${wfId}`);
};

export const publishWorkflow = async (
  wfId: string
): Promise<ApiResponse<WorkflowDefinition>> => {
  return apiClient.core.post(`/lowcode/workflows/${wfId}/publish`);
};

export const listWorkflowTasks = async (params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<ApiResponse<{ items: Record<string, unknown>[]; total: number; page: number; pageSize: number }>> => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return apiClient.core.get(`/lowcode/workflow-tasks${qs ? `?${qs}` : ''}`);
};

export const workflowApi = {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  publishWorkflow,
  listWorkflowTasks,
};
