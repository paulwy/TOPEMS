import { createRequest } from '@topems/shared-utils';

export type ReportCategory = 'finance' | 'hr' | 'sales' | 'inventory';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface Report {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: string;
  lastGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportData {
  id: string;
  reportId: string;
  title: string;
  description?: string;
  columns: string[];
  data: Record<string, any>[];
  rowCount: number;
  generatedAt: string;
  format: ExportFormat;
}

export interface ReportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  reportDataId?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: ReportCategory;
  reportType: string;
  columns: string[];
  filters: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: ReportCategory;
  reportType: string;
  columns: string[];
  filters?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: ReportCategory;
  reportType?: string;
  columns?: string[];
  filters?: Record<string, any>;
  isActive?: boolean;
}

export interface ReportSchedule {
  id: string;
  name: string;
  templateId: string;
  templateName?: string;
  scheduleType: 'cron' | 'interval' | 'one_time';
  scheduleExpression: string;
  parameters: Record<string, any>;
  recipients: string[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  name: string;
  templateId: string;
  scheduleType: 'cron' | 'interval' | 'one_time';
  scheduleExpression: string;
  parameters?: Record<string, any>;
  recipients: string[];
}

export interface UpdateScheduleRequest {
  name?: string;
  templateId?: string;
  scheduleType?: 'cron' | 'interval' | 'one_time';
  scheduleExpression?: string;
  parameters?: Record<string, any>;
  recipients?: string[];
  status?: 'active' | 'paused';
}

export interface GenerateReportRequest {
  reportId: string;
  format: ExportFormat;
  parameters?: Record<string, any>;
}

const api = createRequest('/api/report');

export const reportApi = {
  listReports: async (params?: { category?: ReportCategory; keyword?: string }): Promise<Report[]> => {
    const response = await api.get('/reports', { params });
    return response.data;
  },

  getReport: async (id: string): Promise<Report> => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  generateReport: async (data: GenerateReportRequest): Promise<ReportStatus> => {
    const response = await api.post('/reports/generate', data);
    return response.data;
  },

  getReportStatus: async (taskId: string): Promise<ReportStatus> => {
    const response = await api.get(`/reports/status/${taskId}`);
    return response.data;
  },

  downloadReport: async (reportDataId: string): Promise<Blob> => {
    const response = await api.get(`/reports/download/${reportDataId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  listTemplates: async (params?: { category?: ReportCategory }): Promise<ReportTemplate[]> => {
    const response = await api.get('/templates', { params });
    return response.data;
  },

  createTemplate: async (data: CreateTemplateRequest): Promise<ReportTemplate> => {
    const response = await api.post('/templates', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: UpdateTemplateRequest): Promise<ReportTemplate> => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  listSchedules: async (): Promise<ReportSchedule[]> => {
    const response = await api.get('/schedules');
    return response.data;
  },

  createSchedule: async (data: CreateScheduleRequest): Promise<ReportSchedule> => {
    const response = await api.post('/schedules', data);
    return response.data;
  },

  updateSchedule: async (id: string, data: UpdateScheduleRequest): Promise<ReportSchedule> => {
    const response = await api.put(`/schedules/${id}`, data);
    return response.data;
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  },
};
