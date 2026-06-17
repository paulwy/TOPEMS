import { createRequest } from '@topems/shared-utils';
import type { WorkflowDefinition, WorkflowInstance, WorkflowTask, PaginatedResponse } from '@topems/shared-types';

const api = createRequest('/core/api/flow');

export const workflowApi = {
  getDefinitions: async (params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<WorkflowDefinition>> => {
    const response = await api.get('/workflows', { params });
    return response.data;
  },

  getDefinition: async (id: string): Promise<WorkflowDefinition> => {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  createDefinition: async (data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> => {
    const response = await api.post('/workflows', data);
    return response.data;
  },

  updateDefinition: async (id: string, data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> => {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
  },

  deleteDefinition: async (id: string): Promise<void> => {
    await api.delete(`/workflows/${id}`);
  },

  getInstances: async (params?: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<WorkflowInstance>> => {
    const response = await api.get('/instances', { params });
    return response.data;
  },

  getInstance: async (id: string): Promise<WorkflowInstance> => {
    const response = await api.get(`/instances/${id}`);
    return response.data;
  },

  startInstance: async (definitionId: string, variables?: Record<string, any>): Promise<WorkflowInstance> => {
    const response = await api.post(`/instances/${definitionId}/start`, { variables });
    return response.data;
  },

  getTasks: async (params?: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<WorkflowTask>> => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  completeTask: async (taskId: string, action: string, comment?: string): Promise<void> => {
    await api.post(`/tasks/${taskId}/complete`, { action, comment });
  },

  rejectTask: async (taskId: string, comment?: string): Promise<void> => {
    await api.post(`/tasks/${taskId}/reject`, { comment });
  },
};
