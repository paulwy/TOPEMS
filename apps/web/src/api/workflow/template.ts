import apiClient from '../client';
import type { WorkflowTemplate, ListParams } from './types';

export const templateApi = {
  listTemplates: (params?: ListParams) => {
    return apiClient.workflow.get(`/templates`, { params });
  },

  getTemplate: (id: string) => {
    return apiClient.workflow.get(`/templates/${id}`);
  },

  createTemplate: (data: Partial<WorkflowTemplate>) => {
    return apiClient.workflow.post('/templates', data);
  },

  updateTemplate: (id: string, data: Partial<WorkflowTemplate>) => {
    return apiClient.workflow.put(`/templates/${id}`, data);
  },

  deleteTemplate: (id: string) => {
    return apiClient.workflow.delete(`/templates/${id}`);
  },

  copyTemplate: (id: string, data?: { name?: string }) => {
    return apiClient.workflow.post(`/templates/${id}/copy`, data);
  },

  exportTemplate: (id: string) => {
    return apiClient.workflow.get(`/templates/${id}/export`);
  },

  importTemplate: (data: { file: File; name?: string }) => {
    return apiClient.workflow.post('/templates/import', data);
  },
};
