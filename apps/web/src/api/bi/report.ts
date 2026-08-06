import apiClient from '../client';
import type { Report, ReportSchedule, ReportExportJob } from './types';
import type { CrudOperations } from '@/hooks/useCrudQueries';

export async function fetchReports(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  reportType?: string;
}) {
  return await apiClient.bi.get('/analytics/report', { params });
}

export async function fetchReport(id: string) {
  return await apiClient.bi.get(`/analytics/report/${id}`);
}

export async function createReport(data: Partial<Report>) {
  return await apiClient.bi.post('/analytics/report', data);
}

export async function updateReport(id: string, data: Partial<Report>) {
  return await apiClient.bi.put(`/analytics/report/${id}`, data);
}

export async function deleteReport(id: string) {
  return await apiClient.bi.delete(`/analytics/report/${id}`);
}

export const reportCrudApi: CrudOperations<Report> = {
  list: (params?) =>
    fetchReports({
      page: params?.page as number,
      pageSize: params?.pagesize as number,
      ...(params as unknown as Record<string, unknown>),
    }),
  get: fetchReport,
  create: createReport,
  update: updateReport,
  delete: deleteReport,
};

export async function exportReport(id: string, format: 'pdf' | 'excel' | 'csv' | 'word') {
  return await apiClient.bi.post(`/analytics/report/${id}/export`, { format });
}

export async function listExportJobs(reportId: string) {
  return await apiClient.bi.get(`/analytics/report/${reportId}/exports`);
}

export async function getExportJob(jobId: string) {
  return await apiClient.bi.get(`/analytics/report/exports/${jobId}`);
}

export async function downloadExport(jobId: string) {
  return await apiClient.bi.get(`/analytics/report/exports/${jobId}/download`, {
    responseType: 'blob',
  });
}

export async function listSchedules(reportId: string) {
  return await apiClient.bi.get(`/analytics/report/${reportId}/schedules`);
}

export async function createSchedule(reportId: string, data: Partial<ReportSchedule>) {
  return await apiClient.bi.post(`/analytics/report/${reportId}/schedules`, data);
}

export async function updateSchedule(scheduleId: string, data: Partial<ReportSchedule>) {
  return await apiClient.bi.put(`/analytics/report/schedules/${scheduleId}`, data);
}

export async function deleteSchedule(scheduleId: string) {
  return await apiClient.bi.delete(`/analytics/report/schedules/${scheduleId}`);
}

export async function runSchedule(scheduleId: string) {
  return await apiClient.bi.post(`/analytics/report/schedules/${scheduleId}/run`);
}

export async function toggleSchedule(scheduleId: string, enabled: boolean) {
  return await apiClient.bi.post(`/analytics/report/schedules/${scheduleId}/toggle`, {
    enabled,
  });
}
