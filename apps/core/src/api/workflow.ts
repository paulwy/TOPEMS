import { createRequest } from '@topems/shared-utils';
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTask,
  PaginatedResponse,
} from '@topems/shared-types';

const api = createRequest('/api/flow');

export interface WorkflowTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  definition?: WorkflowDefinition;
  isActive: boolean;
  usageCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category?: string;
  isActive?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export const workflowApi = {
  listDefinitions: async (
    params?: ListParams
  ): Promise<PaginatedResponse<WorkflowDefinition>> => {
    const response = await api.get('/definitions', { params });
    return response.data;
  },

  getDefinition: async (id: string): Promise<WorkflowDefinition> => {
    const response = await api.get(`/definitions/${id}`);
    return response.data;
  },

  createDefinition: async (
    data: Partial<WorkflowDefinition>
  ): Promise<WorkflowDefinition> => {
    const response = await api.post('/definitions', data);
    return response.data;
  },

  updateDefinition: async (
    id: string,
    data: Partial<WorkflowDefinition>
  ): Promise<WorkflowDefinition> => {
    const response = await api.put(`/definitions/${id}`, data);
    return response.data;
  },

  deleteDefinition: async (id: string): Promise<void> => {
    await api.delete(`/definitions/${id}`);
  },

  listInstances: async (
    params?: ListParams
  ): Promise<PaginatedResponse<WorkflowInstance>> => {
    const response = await api.get('/instances', { params });
    return response.data;
  },

  getInstance: async (id: string): Promise<WorkflowInstance> => {
    const response = await api.get(`/instances/${id}`);
    return response.data;
  },

  startInstance: async (
    definitionId: string,
    variables?: Record<string, any>
  ): Promise<WorkflowInstance> => {
    const response = await api.post('/instances', { definitionId, variables });
    return response.data;
  },

  cancelInstance: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/instances/${id}/cancel`, { reason });
  },

  listTasks: async (
    params?: ListParams
  ): Promise<PaginatedResponse<WorkflowTask>> => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  getTask: async (id: string): Promise<WorkflowTask> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  completeTask: async (
    taskId: string,
    action: string,
    comment?: string,
    variables?: Record<string, any>
  ): Promise<void> => {
    await api.post(`/tasks/${taskId}/complete`, { action, comment, variables });
  },

  claimTask: async (taskId: string, userId: string): Promise<void> => {
    await api.post(`/tasks/${taskId}/claim`, { userId });
  },

  listTemplates: async (
    params?: ListParams
  ): Promise<PaginatedResponse<WorkflowTemplate>> => {
    const response = await api.get('/templates', { params });
    return response.data;
  },

  getTemplate: async (id: string): Promise<WorkflowTemplate> => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  createTemplate: async (
    data: Partial<WorkflowTemplate>
  ): Promise<WorkflowTemplate> => {
    const response = await api.post('/templates', data);
    return response.data;
  },

  updateTemplate: async (
    id: string,
    data: Partial<WorkflowTemplate>
  ): Promise<WorkflowTemplate> => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  activateTemplate: async (id: string): Promise<void> => {
    await api.post(`/templates/${id}/activate`);
  },

  deactivateTemplate: async (id: string): Promise<void> => {
    await api.post(`/templates/${id}/deactivate`);
  },

  getTemplateCategories: async (): Promise<string[]> => {
    const response = await api.get('/templates/categories');
    return response.data;
  },
};
