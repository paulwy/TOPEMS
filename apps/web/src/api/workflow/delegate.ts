import apiClient from '../client';
import type {
  WorkflowDelegate,
  CreateWorkflowDelegateRequest,
  UpdateWorkflowDelegateRequest,
  ListParams,
} from './types';
import { createCrudApi } from './utils';

export const delegateApi = {
  ...createCrudApi<WorkflowDelegate>('/delegates'),

  listDelegates: (params?: ListParams) =>
    createCrudApi<WorkflowDelegate>('/delegates').list(params),

  getDelegate: (id: string) => createCrudApi<WorkflowDelegate>('/delegates').get(id),

  createDelegate: (data: CreateWorkflowDelegateRequest) =>
    createCrudApi<WorkflowDelegate>('/delegates').create(data),

  updateDelegate: (id: string, data: UpdateWorkflowDelegateRequest) =>
    createCrudApi<WorkflowDelegate>('/delegates').update(id, data),

  deleteDelegate: (id: string) => createCrudApi<WorkflowDelegate>('/delegates').delete(id),

  activate: (id: string) => {
    return apiClient.workflow.post(`/delegates/${id}/activate`);
  },

  deactivate: (id: string) => {
    return apiClient.workflow.post(`/delegates/${id}/deactivate`);
  },

  getMyDelegates: (params?: ListParams) => {
    return apiClient.workflow.get('/delegates/my', { params });
  },

  getMyAttorneys: (params?: ListParams) => {
    return apiClient.workflow.get('/delegates/my/attorneys', { params });
  },

  getActiveDelegate: (userId?: string) => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.workflow.get('/delegates/active', { params });
  },

  getDelegateWorkflows: (id: string) => {
    return apiClient.workflow.get(`/delegates/${id}/workflows`);
  },

  checkDelegation: (workflowId: string, userId?: string) => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.workflow.get(`/delegates/check/${workflowId}`, { params });
  },
};
