import apiClient from '../client';
import type {
  WorkflowDelegate,
  CreateWorkflowDelegateRequest,
  UpdateWorkflowDelegateRequest,
  ListParams,
} from './types';
import { createCrudApi } from './utils';

export const delegateApi = {
  ...createCrudApi<WorkflowDelegate>('/api/flow/delegates'),

  listDelegates: (params?: ListParams) =>
    createCrudApi<WorkflowDelegate>('/api/flow/delegates').list(params),

  getDelegate: (id: string) =>
    createCrudApi<WorkflowDelegate>('/api/flow/delegates').get(id),

  createDelegate: (data: CreateWorkflowDelegateRequest) =>
    createCrudApi<WorkflowDelegate>('/api/flow/delegates').create(data),

  updateDelegate: (id: string, data: UpdateWorkflowDelegateRequest) =>
    createCrudApi<WorkflowDelegate>('/api/flow/delegates').update(id, data),

  deleteDelegate: (id: string) =>
    createCrudApi<WorkflowDelegate>('/api/flow/delegates').delete(id),

  activate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/delegates/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.workflow.post(`/api/flow/delegates/${id}/deactivate`);
  },

  getMyDelegates: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/delegates/my', { params });
  },

  getMyAttorneys: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/delegates/my/attorneys', { params });
  },

  getActiveDelegate: (userId?: string) => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.workflow.get('/api/flow/delegates/active', { params });
  },

  getDelegateWorkflows: (id: string) => {
    return apiClient.workflow.get(`/api/flow/delegates/${id}/workflows`);
  },

  checkDelegation: (workflowId: string, userId?: string) => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.workflow.get(`/api/flow/delegates/check/${workflowId}`, { params });
  },
};
