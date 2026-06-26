import { apiClient } from '../client';
import type { ProjectReport, ReportTemplate } from './types';

export const reportApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/reports`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/reports/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      report_code?: string;
      report_name: string;
      report_type: string;
      report_period?: string;
      generated_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/projects/${projectId}/reports`, data);
  },

  generate: async (
    projectId: string,
    data: {
      report_code?: string;
      report_name: string;
      report_type: string;
      report_period?: string;
      generated_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/projects/${projectId}/reports/generate`, data);
  },
};

export const reportTemplateApi = {
  list: async () => {
    return apiClient.pm.get('/api/pm/report-templates');
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/report-templates/${id}`);
  },

  create: async (data: {
    template_code: string;
    template_name: string;
    report_type: string;
    content: Record<string, any>;
    created_by?: string;
  }) => {
    return apiClient.pm.post('/api/pm/report-templates', data);
  },

  update: async (
    id: string,
    data: {
      template_name?: string;
      content?: Record<string, any>;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/report-templates/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/api/pm/report-templates/${id}`);
  },
};

export default reportApi;
