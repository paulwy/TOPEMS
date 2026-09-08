/**
 * Mobile · 移动端数据报表 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 BI/Reporting 服务客户端)
 * 路由:
 *   GET    /mobile/reports
 *   GET    /mobile/reports/{id}
 *   POST   /mobile/reports
 *   POST   /mobile/reports/{id}/generate
 *   POST   /mobile/reports/{id}/export
 *   GET    /mobile/reports/categories
 *   GET    /mobile/dashboards
 *   GET    /mobile/dashboards/{id}
 *   POST   /mobile/dashboards
 *   GET    /mobile/dashboards/{id}/widgets
 *   POST   /mobile/dashboards/{id}/widgets
 *   DELETE /mobile/dashboards/{id}/widgets/{widgetId}
 *   GET    /mobile/data/query
 *   POST   /mobile/data/query
 *   GET    /mobile/data/export
 *   POST   /mobile/data/schedule
 *   GET    /mobile/data/schedules
 *   DELETE /mobile/data/schedules/{id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ReportStatus = 'draft' | 'published' | 'archived';
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  status: ReportStatus;
  category?: string;
  dashboard_id?: string;
  last_generated_at?: string;
  next_scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  report_count?: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_default: boolean;
  widgets: DashboardWidget[];
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  type: 'chart' | 'table' | 'kpi' | 'gauge' | 'map';
  title: string;
  data_source: string;
  config: Record<string, unknown>;
  position: { row: number; col: number; w: number; h: number };
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  execution_time_ms: number;
}

export interface ExportResult {
  file_url: string;
  file_name: string;
  file_size: number;
  expires_at?: string;
}

export interface Schedule {
  id: string;
  name: string;
  frequency: ScheduleFrequency;
  cron_expression: string;
  report_id?: string;
  dashboard_id?: string;
  recipients: string[];
  format: ExportFormat;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

export interface CreateReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  category?: string;
  dashboard_id?: string;
}

export interface GenerateReportRequest {
  parameters?: Record<string, unknown>;
  date_range?: { start: string; end: string };
}

export interface ExportReportRequest {
  format: ExportFormat;
  parameters?: Record<string, unknown>;
  date_range?: { start: string; end: string };
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  category?: string;
  is_default?: boolean;
}

export interface CreateWidgetRequest {
  type: DashboardWidget['type'];
  title: string;
  data_source: string;
  config?: Record<string, unknown>;
  position?: DashboardWidget['position'];
}

export interface QueryRequest {
  data_source: string;
  sql?: string;
  parameters?: Record<string, unknown>;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  sort?: Array<{ field: string; order: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
}

export interface CreateScheduleRequest {
  name: string;
  frequency: ScheduleFrequency;
  cron_expression?: string;
  report_id?: string;
  dashboard_id?: string;
  recipients: string[];
  format: ExportFormat;
}

export const reportApi = {
  // ==================== 报表管理 ====================

  listReports: async (params?: {
    type?: ReportType;
    status?: ReportStatus;
    category?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Report>>> => {
    return apiClient.mobile.get('reports', { params });
  },

  getReport: async (id: string): Promise<ApiResponse<Report>> => {
    return apiClient.mobile.get(`reports/${id}`);
  },

  createReport: async (data: CreateReportRequest): Promise<ApiResponse<Report>> => {
    return apiClient.mobile.post('reports', data);
  },

  generateReport: async (
    id: string,
    data?: GenerateReportRequest
  ): Promise<ApiResponse<Report>> => {
    return apiClient.mobile.post(`reports/${id}/generate`, data);
  },

  exportReport: async (
    id: string,
    data: ExportReportRequest
  ): Promise<ApiResponse<ExportResult>> => {
    return apiClient.mobile.post(`reports/${id}/export`, data);
  },

  listReportCategories: async (): Promise<ApiResponse<ReportCategory[]>> => {
    return apiClient.mobile.get('reports/categories');
  },

  // ==================== 仪表盘管理 ====================

  listDashboards: async (params?: {
    category?: string;
    is_default?: boolean;
  }): Promise<ApiResponse<Dashboard[]>> => {
    return apiClient.mobile.get('dashboards', { params });
  },

  getDashboard: async (id: string): Promise<ApiResponse<Dashboard>> => {
    return apiClient.mobile.get(`dashboards/${id}`);
  },

  createDashboard: async (data: CreateDashboardRequest): Promise<ApiResponse<Dashboard>> => {
    return apiClient.mobile.post('dashboards', data);
  },

  listDashboardWidgets: async (dashboardId: string): Promise<ApiResponse<DashboardWidget[]>> => {
    return apiClient.mobile.get(`dashboards/${dashboardId}/widgets`);
  },

  addDashboardWidget: async (
    dashboardId: string,
    data: CreateWidgetRequest
  ): Promise<ApiResponse<DashboardWidget>> => {
    return apiClient.mobile.post(`dashboards/${dashboardId}/widgets`, data);
  },

  removeDashboardWidget: async (
    dashboardId: string,
    widgetId: string
  ): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`dashboards/${dashboardId}/widgets/${widgetId}`);
  },

  // ==================== 数据查询与导出 ====================

  queryData: async (data: QueryRequest): Promise<ApiResponse<QueryResult>> => {
    return apiClient.mobile.post('data/query', data);
  },

  exportData: async (params: {
    data_source: string;
    format: ExportFormat;
    filters?: string;
  }): Promise<ApiResponse<ExportResult>> => {
    return apiClient.mobile.get('data/export', { params });
  },

  // ==================== 定时调度 ====================

  createSchedule: async (data: CreateScheduleRequest): Promise<ApiResponse<Schedule>> => {
    return apiClient.mobile.post('data/schedule', data);
  },

  listSchedules: async (): Promise<ApiResponse<Schedule[]>> => {
    return apiClient.mobile.get('data/schedules');
  },

  deleteSchedule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.mobile.delete(`data/schedules/${id}`);
  },
};

export default reportApi;
