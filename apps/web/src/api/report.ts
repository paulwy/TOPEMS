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

export interface DataSourceConfig {
  source_type: string;
  connection_string?: string;
  query: string;
  params: Record<string, any>;
}

export interface LayoutConfig {
  layout_type: string;
  orientation: string;
  papersize: string;
  margins: Record<string, any>;
  sections: Record<string, any>;
}

export interface FilterConfig {
  conditions: Record<string, any>[];
  date_range?: Record<string, any>;
  sort_by: Record<string, any>[];
}

export interface StyleConfig {
  theme: string;
  colors: Record<string, any>;
  fonts: Record<string, any>;
  borders: Record<string, any>;
  header_style: Record<string, any>;
  body_style: Record<string, any>;
}

export interface ReportTemplate {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  report_type: ReportType;
  data_source: DataSourceConfig;
  layout_config: LayoutConfig;
  filter_config: FilterConfig;
  style_config: StyleConfig;
  columns: Record<string, any>[];
  outputformat: string;
  isactive: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateRequest {
  name: string;
  code: string;
  description?: string;
  category: string;
  report_type: ReportType;
  isactive: boolean;
  data_source: DataSourceConfig;
  layout_config: LayoutConfig;
  filter_config: FilterConfig;
  style_config: StyleConfig;
  columns: Record<string, any>[];
  outputformat: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  report_type?: ReportType;
  data_source?: DataSourceConfig;
  layout_config?: LayoutConfig;
  filter_config?: FilterConfig;
  style_config?: StyleConfig;
  columns?: Record<string, any>[];
  outputformat?: string;
  isactive?: boolean;
}

export interface CreateReportFromTemplateRequest {
  template_id: string;
  report_name?: string;
  parameters?: Record<string, any>;
  created_by: string;
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

export type ScheduleType = 'cron' | 'interval' | 'one_time';

export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface ReportSchedule {
  id: string;
  name: string;
  template_id: string;
  template_name?: string;
  schedule_type: ScheduleType;
  schedule_expression: string;
  parameters: Record<string, unknown>;
  recipients: string[];
  status: ScheduleStatus;
  last_run_at?: string;
  next_run_at?: string;
  run_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleRequest {
  name: string;
  template_id: string;
  schedule_type: ScheduleType;
  schedule_expression: string;
  parameters?: Record<string, unknown>;
  recipients: string[];
}

export interface UpdateScheduleRequest {
  name?: string;
  template_id?: string;
  schedule_type?: ScheduleType;
  schedule_expression?: string;
  parameters?: Record<string, unknown>;
  recipients?: string[];
  status?: ScheduleStatus;
}

export interface ScheduleExecutionRecord {
  id: string;
  schedule_id: string;
  schedule_name: string;
  status: string;
  output_path?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export type SubscriptionFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface ReportSubscription {
  id: string;
  template_id: string;
  template_name?: string;
  user_id: string;
  email?: string;
  frequency: SubscriptionFrequency;
  enabled: boolean;
  created_at: string;
}

export interface CreateSubscriptionRequest {
  template_id: string;
  user_id: string;
  email?: string;
  frequency: SubscriptionFrequency;
  enabled?: boolean;
}

export interface UpdateSubscriptionRequest {
  template_id?: string;
  user_id?: string;
  email?: string;
  frequency?: SubscriptionFrequency;
  enabled?: boolean;
}

export const reportApi = {
  listReports: async (): Promise<ApiResponse<ReportData[]>> => {
    return apiClient.report.get<ReportData[]>('/reports');
  },

  getReport: async (id: string): Promise<ApiResponse<ReportData>> => {
    return apiClient.report.get<ReportData>(`/report/reports/${id}`);
  },

  createReport: async (data: CreateReportRequest): Promise<ApiResponse<ReportData>> => {
    return apiClient.report.post<ReportData>('/reports', data);
  },

  createReportFromTemplate: async (
    data: CreateReportFromTemplateRequest
  ): Promise<ApiResponse<ReportData>> => {
    return apiClient.report.post<ReportData>('/report/reports/from-template', data);
  },

  updateReport: async (
    id: string,
    data: Partial<ReportConfig>
  ): Promise<ApiResponse<ReportData>> => {
    return apiClient.report.put<ReportData>(`/report/reports/${id}`, data);
  },

  deleteReport: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.report.delete<boolean>(`/report/reports/${id}`);
  },

  exportReport: async (
    id: string,
    data: ExportReportRequest
  ): Promise<ApiResponse<ExportResult>> => {
    return apiClient.report.post<ExportResult>(`/report/reports/${id}/export`, data);
  },

  runReport: async (id: string): Promise<ApiResponse<ReportData>> => {
    return apiClient.report.post<ReportData>(`/report/reports/${id}/run`);
  },

  listTemplates: async (): Promise<ApiResponse<ReportTemplate[]>> => {
    return apiClient.report.get<ReportTemplate[]>('/templates');
  },

  getTemplate: async (id: string): Promise<ApiResponse<ReportTemplate>> => {
    return apiClient.report.get<ReportTemplate>(`/report/templates/${id}`);
  },

  createTemplate: async (
    data: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<ReportTemplate>> => {
    return apiClient.report.post<ReportTemplate>('/templates', data);
  },

  updateTemplate: async (
    id: string,
    data: Partial<ReportTemplate>
  ): Promise<ApiResponse<ReportTemplate>> => {
    return apiClient.report.put<ReportTemplate>(`/report/templates/${id}`, data);
  },

  deleteTemplate: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.report.delete<boolean>(`/report/templates/${id}`);
  },

  listReportTypes: async (): Promise<ApiResponse<ReportTypeInfo[]>> => {
    return apiClient.report.get<ReportTypeInfo[]>('/report-types');
  },

  listSchedules: async (): Promise<ApiResponse<ReportSchedule[]>> => {
    return apiClient.report.get<ReportSchedule[]>('/schedules');
  },

  getSchedule: async (id: string): Promise<ApiResponse<ReportSchedule>> => {
    return apiClient.report.get<ReportSchedule>(`/report/schedules/${id}`);
  },

  createSchedule: async (data: CreateScheduleRequest): Promise<ApiResponse<ReportSchedule>> => {
    return apiClient.report.post<ReportSchedule>('/schedules', data);
  },

  updateSchedule: async (
    id: string,
    data: UpdateScheduleRequest
  ): Promise<ApiResponse<ReportSchedule>> => {
    return apiClient.report.put<ReportSchedule>(`/report/schedules/${id}`, data);
  },

  deleteSchedule: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.report.delete<boolean>(`/report/schedules/${id}`);
  },

  executeSchedule: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.report.post<boolean>(`/report/schedules/${id}/execute`);
  },

  getExecutionHistory: async (id: string): Promise<ApiResponse<ScheduleExecutionRecord[]>> => {
    return apiClient.report.get<ScheduleExecutionRecord[]>(`/report/schedules/${id}/history`);
  },

  listSubscriptions: async (): Promise<ApiResponse<ReportSubscription[]>> => {
    return apiClient.report.get<ReportSubscription[]>('/subscriptions');
  },

  getSubscription: async (id: string): Promise<ApiResponse<ReportSubscription>> => {
    return apiClient.report.get<ReportSubscription>(`/report/subscriptions/${id}`);
  },

  createSubscription: async (
    data: CreateSubscriptionRequest
  ): Promise<ApiResponse<ReportSubscription>> => {
    return apiClient.report.post<ReportSubscription>('/subscriptions', data);
  },

  updateSubscription: async (
    id: string,
    data: UpdateSubscriptionRequest
  ): Promise<ApiResponse<ReportSubscription>> => {
    return apiClient.report.put<ReportSubscription>(`/report/subscriptions/${id}`, data);
  },

  deleteSubscription: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.report.delete<boolean>(`/report/subscriptions/${id}`);
  },

  toggleSubscription: async (id: string): Promise<ApiResponse<ReportSubscription>> => {
    return apiClient.report.post<ReportSubscription>(`/report/subscriptions/${id}/toggle`);
  },

  getUserSubscriptions: async (user_id: string): Promise<ApiResponse<ReportSubscription[]>> => {
    return apiClient.report.get<ReportSubscription[]>(`/report/subscriptions/user/${user_id}`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.report.get<string>('/health');
  },

  getReportsCenterStats: async (): Promise<ApiResponse<ReportsCenterStats>> => {
    return apiClient.report.get<ReportsCenterStats>('/reports-center/stats');
  },

  exportStatsReport: async (
    reportType: 'users' | 'permissions' | 'activities',
    format: ExportFormat
  ): Promise<ApiResponse<ExportResult>> => {
    return apiClient.report.post<ExportResult>(`/reports-center/export/${reportType}`, {
      format,
    });
  },
};
