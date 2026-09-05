import { apiClient } from '../client';

export const reportApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/reports`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/reports/${id}`);
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
    return apiClient.pm.post(`/projects/${projectId}/reports`, data);
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
    return apiClient.pm.post(`/projects/${projectId}/reports/generate`, data);
  },
};

export const reportTemplateApi = {
  list: async () => {
    return apiClient.pm.get('/report-templates');
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/report-templates/${id}`);
  },

  create: async (data: {
    template_code: string;
    template_name: string;
    report_type: string;
    content: Record<string, unknown>;
    created_by?: string;
  }) => {
    return apiClient.pm.post('/report-templates', data);
  },

  update: async (
    id: string,
    data: {
      template_name?: string;
      content?: Record<string, unknown>;
    }
  ) => {
    return apiClient.pm.put(`/report-templates/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/report-templates/${id}`);
  },
};

export default reportApi;
