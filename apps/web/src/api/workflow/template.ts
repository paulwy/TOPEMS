import apiClient from '../client';
import type { WorkflowTemplate, ListParams } from './types';

export const templateApi = {
  listTemplates: (params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/templates`, { params });
  },

  getTemplate: (id: string) => {
    return apiClient.workflow.get(`/api/flow/templates/${id}`);
  },

  createTemplate: (data: Partial<WorkflowTemplate>) => {
    return apiClient.workflow.post('/api/flow/templates', data);
  },

  updateTemplate: (id: string, data: Partial<WorkflowTemplate>) => {
    return apiClient.workflow.put(`/api/flow/templates/${id}`, data);
  },

  deleteTemplate: (id: string) => {
    return apiClient.workflow.delete(`/api/flow/templates/${id}`);
  },

  copyTemplate: (id: string, data?: { name?: string }) => {
    return apiClient.workflow.post(`/api/flow/templates/${id}/copy`, data);
  },

  exportTemplate: (id: string) => {
    return apiClient.workflow.get(`/api/flow/templates/${id}/export`);
  },

  importTemplate: (data: { file: File; name?: string }) => {
    return apiClient.workflow.post('/api/flow/templates/import', data);
  },
};
