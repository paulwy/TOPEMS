import apiClient from './client';

export interface Report {
  id: string;
  name: string;
  description: string;
  type: 'chart' | 'table' | 'dashboard';
  lastGenerated: string;
  category: string;
}

export interface GenerateReportRequest {
  reportId: string;
  params?: Record<string, unknown>;
}

export interface ReportDataResponse {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export const reportsApi = {
  getReports: async (params?: {
    page?: number;
    pageSize?: number;
    category?: string;
  }): Promise<{ items: Report[]; total: number }> => {
    const response = await apiClient.get('/reports', { params });
    return response.data;
  },

  getReportById: async (id: string): Promise<Report> => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },

  generateReport: async (data: GenerateReportRequest): Promise<ReportDataResponse> => {
    const response = await apiClient.post('/reports/generate', data);
    return response.data;
  },

  exportReport: async (id: string, format: 'pdf' | 'excel' | 'csv'): Promise<Blob> => {
    const response = await apiClient.get(`/reports/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  refreshReport: async (id: string): Promise<Report> => {
    const response = await apiClient.post(`/reports/${id}/refresh`);
    return response.data;
  },
};
