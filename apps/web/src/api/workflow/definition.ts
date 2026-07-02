import apiClient from '../client';
import type {
  Workflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  CreateVersionRequest,
  RollbackRequest,
  ListParams,
} from './types';
import { createCrudApi } from './utils';

export const workflowDefinitionApi = {
  ...createCrudApi<Workflow>('/workflows'),

  listWorkflows: (params?: ListParams) => createCrudApi<Workflow>('/workflows').list(params),

  getWorkflow: (id: string) => createCrudApi<Workflow>('/workflows').get(id),

  createWorkflow: (data: CreateWorkflowRequest) =>
    createCrudApi<Workflow>('/workflows').create(data),

  updateWorkflow: (id: string, data: UpdateWorkflowRequest) =>
    createCrudApi<Workflow>('/workflows').update(id, data),

  deleteWorkflow: (id: string) => createCrudApi<Workflow>('/workflows').delete(id),

  deploy: (id: string) => {
    return apiClient.workflow.post(`/workflows/${id}/deploy`);
  },

  activate: (id: string) => {
    return apiClient.workflow.post(`/workflows/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.workflow.post(`/workflows/${id}/deactivate`);
  },

  getVersions: (workflowId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/workflows/${workflowId}/versions`, {
      params,
    });
  },

  createVersion: (workflowId: string, data: CreateVersionRequest) => {
    return apiClient.workflow.post(`/workflows/${workflowId}/versions`, data);
  },

  getVersion: (workflowId: string, versionId: string) => {
    return apiClient.workflow.get(`/workflows/${workflowId}/versions/${versionId}`);
  },

  activateVersion: (workflowId: string, versionId: string) => {
    return apiClient.workflow.post(`/workflows/${workflowId}/versions/${versionId}/activate`);
  },

  rollback: (workflowId: string, data: RollbackRequest) => {
    return apiClient.workflow.post(`/workflows/${workflowId}/rollback`, data);
  },

  compareVersions: (workflowId: string, version1: string, version2: string) => {
    return apiClient.workflow.get(`/workflows/${workflowId}/compare/${version1}/${version2}`);
  },

  deleteVersion: (workflowId: string, versionId: string) => {
    return apiClient.workflow.delete(`/workflows/${workflowId}/versions/${versionId}`);
  },

  exportWorkflow: (id: string) => {
    return apiClient.workflow.get(`/workflows/${id}/export`);
  },

  importWorkflow: (data: FormData) => {
    return apiClient.workflow.post('/workflows/import', data);
  },

  copyWorkflow: (id: string, data?: { name?: string }) => {
    return apiClient.workflow.post(`/workflows/${id}/copy`, data);
  },
};
