import apiClient from '../client';
import type { Report, ReportSchedule } from './types';
import type { CrudOperations } from '@/hooks/useCrudQueries';

// ============================================================================
// BI Report API（统一使用复数路径 /api/bi/reports）
// 后端实现位置: svc/analytics/src/modules/report/
// - report.rs:    /reports, /reports/{id}, /reports/{id}/export, /reports/{id}/run
// - template.rs:  /templates, /templates/{id}
// - schedule.rs:  /schedules, /schedules/{id}, /schedules/{id}/execute, /schedules/{id}/history
// - subscription.rs: /subscriptions
// ============================================================================

export async function fetchReports(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  reportType?: string;
}) {
  // 后端: GET /api/bi/reports
  return await apiClient.bi.get('/reports', { params });
}

export async function fetchReport(id: string) {
  // 后端: GET /api/bi/reports/{id}
  return await apiClient.bi.get(`/reports/${id}`);
}

export async function createReport(data: Partial<Report>) {
  // 后端: POST /api/bi/reports
  return await apiClient.bi.post('/reports', data);
}

export async function updateReport(id: string, data: Partial<Report>) {
  // 后端: PUT /api/bi/reports/{id}
  return await apiClient.bi.put(`/reports/${id}`, data);
}

export async function deleteReport(id: string) {
  // 后端: DELETE /api/bi/reports/{id}
  return await apiClient.bi.delete(`/reports/${id}`);
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
  // 后端: POST /api/bi/reports/{id}/export
  return await apiClient.bi.post(`/reports/${id}/export`, { format });
}

// TODO: 后端暂未实现导出任务管理端点，待添加
// - GET /api/bi/reports/{reportId}/exports
// - GET /api/bi/reports/exports/{jobId}
// - GET /api/bi/reports/exports/{jobId}/download
export async function listExportJobs(reportId: string) {
  return await apiClient.bi.get(`/reports/${reportId}/exports`);
}

export async function getExportJob(jobId: string) {
  return await apiClient.bi.get(`/reports/exports/${jobId}`);
}

export async function downloadExport(jobId: string) {
  return await apiClient.bi.get(`/reports/exports/${jobId}/download`, {
    responseType: 'blob',
  });
}

// 调度管理：后端使用独立的 /schedules 路径，通过 report_id 筛选
export async function listSchedules(reportId?: string) {
  // 后端: GET /api/bi/schedules?report_id={reportId}
  const params = reportId ? { report_id: reportId } : undefined;
  return await apiClient.bi.get('/schedules', { params });
}

export async function createSchedule(reportId: string, data: Partial<ReportSchedule>) {
  // 后端: POST /api/bi/schedules（body 中包含 report_id）
  return await apiClient.bi.post('/schedules', { ...data, report_id: reportId });
}

export async function updateSchedule(scheduleId: string, data: Partial<ReportSchedule>) {
  // 后端: PUT /api/bi/schedules/{id}
  return await apiClient.bi.put(`/schedules/${scheduleId}`, data);
}

export async function deleteSchedule(scheduleId: string) {
  // 后端: DELETE /api/bi/schedules/{id}
  return await apiClient.bi.delete(`/schedules/${scheduleId}`);
}

export async function runSchedule(scheduleId: string) {
  // 后端: POST /api/bi/schedules/{id}/execute
  return await apiClient.bi.post(`/schedules/${scheduleId}/execute`);
}

// TODO: 后端暂未实现调度切换端点，待添加
// - POST /api/bi/schedules/{id}/toggle
export async function toggleSchedule(scheduleId: string, enabled: boolean) {
  return await apiClient.bi.post(`/schedules/${scheduleId}/toggle`, {
    enabled,
  });
}
