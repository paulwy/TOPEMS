import apiClient from './client';
import type { ApiResponse } from './client';

export type ReportType =
  | 'rs_project_progress'
  | 'rs_experiment_record'
  | 'lims_inspection_stats'
  | 'lims_sample_summary'
  | 'qms_quality_analysis'
  | 'qms_defect_stats'
  | 'ehs_safety_check'
  | 'ehs_risk_assessment'
  | 'srm_supplier_eval'
  | 'srm_purchase_stats'
  | 'pdm_production_stats'
  | 'pdm_process_summary';

export type ExportFormat = 'excel' | 'pdf' | 'csv';

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface ReportConfig {
  report_type: ReportType;
  format: ExportFormat;
  title: string;
  description?: string;
  columns: string[];
  date_range?: DateRange;
  filters?: Record<string, string>;
}

export interface ReportTemplate {
  id: string;
  name: string;
  report_type: ReportType;
  columns: string[];
  description?: string;
  created_at: string;
}

export interface ReportData {
  id: string;
  config: ReportConfig;
  template?: ReportTemplate;
  data: Record<string, any>[];
  row_count: number;
  created_at: string;
}

export interface CreateReportRequest {
  config: ReportConfig;
  use_template?: string;
}

export interface ExportReportRequest {
  format: ExportFormat;
  custom_filename?: string;
}

export interface ExportResult {
  filename: string;
  format: string;
  content_type: string;
  row_count: number;
  report_type: string;
  download_url: string;
}

export interface ReportTypeInfo {
  type: ReportType;
  name: string;
  module: string;
}

// 报表中心专用统计类型
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalCompanies: number;
  totalDepartments: number;
  totalEmployees: number;
  recentActivities: number;
}

export interface UserGrowthDataPoint {
  month: string;
  新增用户: number;
  活跃用户: number;
}

export interface RoleDistributionDataPoint {
  name: string;
  value: number;
}

export interface ActivityTypeDataPoint {
  name: string;
  count: number;
}

export interface ReportsCenterStats {
  dashboard: DashboardStats;
  userGrowth: UserGrowthDataPoint[];
  roleDistribution: RoleDistributionDataPoint[];
  activityTypes: ActivityTypeDataPoint[];
}

export const reportApi = {
  listReports: async (): Promise<ApiResponse<ReportData[]>> => {
    return apiClient.report.get<ReportData[]>('/api/v1/reports');
  },

  getReport: async (id: string): Promise<ApiResponse<ReportData>> => {
    return apiClient.report.get<ReportData>(`/api/v1/reports/${id}`);
  },

  createReport: async (data: CreateReportRequest): Promise<ApiResponse<ReportData>> => {
    return apiClient.report.post<ReportData>('/api/v1/reports', data);
  },

  deleteReport: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.report.delete<boolean>(`/api/v1/reports/${id}`);
  },

  exportReport: async (id: string, data: ExportReportRequest): Promise<ApiResponse<ExportResult>> => {
    return apiClient.report.post<ExportResult>(`/api/v1/reports/${id}/export`, data);
  },

  listTemplates: async (): Promise<ApiResponse<ReportTemplate[]>> => {
    return apiClient.report.get<ReportTemplate[]>('/api/v1/templates');
  },

  createTemplate: async (data: Omit<ReportTemplate, 'id' | 'created_at'>): Promise<ApiResponse<ReportTemplate>> => {
    return apiClient.report.post<ReportTemplate>('/api/v1/templates', data);
  },

  listReportTypes: async (): Promise<ApiResponse<ReportTypeInfo[]>> => {
    return apiClient.report.get<ReportTypeInfo[]>('/api/v1/report-types');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.report.get<string>('/health');
  },

  // 报表中心专用统计API
  getReportsCenterStats: async (): Promise<ApiResponse<ReportsCenterStats>> => {
    return apiClient.report.get<ReportsCenterStats>('/api/v1/reports-center/stats');
  },

  // 导出统计报表
  exportStatsReport: async (reportType: 'users' | 'permissions' | 'activities', format: ExportFormat): Promise<ApiResponse<ExportResult>> => {
    return apiClient.report.post<ExportResult>(`/api/v1/reports-center/export/${reportType}`, { format });
  },
};
