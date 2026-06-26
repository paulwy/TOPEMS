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
    return apiClient.workflow.post(`/api/flow/workflows/${id}/deploy`);
  },

  activate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/workflows/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/workflows/${id}/deactivate`);
  },

  getVersions: (workflowId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/workflows/${workflowId}/versions`, {
      params,
    });
  },

  createVersion: (workflowId: string, data: CreateVersionRequest) => {
    return apiClient.workflow.post(`/api/flow/workflows/${workflowId}/versions`, data);
  },

  getVersion: (workflowId: string, versionId: string) => {
    return apiClient.workflow.get(`/api/flow/workflows/${workflowId}/versions/${versionId}`);
  },

  activateVersion: (workflowId: string, versionId: string) => {
    return apiClient.workflow.post(`/api/flow/workflows/${workflowId}/versions/${versionId}/activate`);
  },

  rollback: (workflowId: string, data: RollbackRequest) => {
    return apiClient.workflow.post(`/api/flow/workflows/${workflowId}/rollback`, data);
  },

  compareVersions: (workflowId: string, version1: string, version2: string) => {
    return apiClient.workflow.get(`/api/flow/workflows/${workflowId}/compare/${version1}/${version2}`);
  },

  deleteVersion: (workflowId: string, versionId: string) => {
    return apiClient.workflow.delete(`/api/flow/workflows/${workflowId}/versions/${versionId}`);
  },
};
