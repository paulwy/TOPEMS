import apiClient from './client';
import type { ApiResponse } from './client';

export interface DashboardLayout {
  [key: string]: unknown;
}

export interface WidgetConfig {
  [key: string]: unknown;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ReportConfig {
  [key: string]: unknown;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout?: DashboardLayout;
  owner_id?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  preview_image?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: string;
  dashboard_id?: string;
  name: string;
  widget_type: string;
  config?: WidgetConfig;
  position?: WidgetPosition;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  config: ReportConfig;
  data_source?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface KeyMetric {
  title: string;
  value: number;
  unit: string;
  change: number;
  change_type: 'increase' | 'decrease';
  icon: string;
}

export interface RecentActivity {
  id: number;
  type: string;
  title: string;
  time: string;
}

export interface SummaryDashboard {
  key_metrics: KeyMetric[];
  recent_activities: RecentActivity[];
  generated_at: string;
}

export interface DevelopmentAnalytics {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  project_status_distribution: {
    in_progress: number;
    pending_approval: number;
    completed: number;
    cancelled: number;
  };
  monthly_new_projects: Array<{ month: string; count: number }>;
  project_type_distribution: {
    research: number;
    development: number;
    improvement: number;
  };
  generated_at: string;
}

export interface QualityAnalytics {
  total_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  pass_rate: number;
  quality_trend: Array<{ month: string; pass_rate: number }>;
  defect_types: {
    material: number;
    process: number;
    equipment: number;
    other: number;
  };
  generated_at: string;
}

export interface ProductionAnalytics {
  total_production_batches: number;
  completed_batches: number;
  in_progress_batches: number;
  production_efficiency: number;
  daily_output: Array<{ date: string; output: number }>;
  product_line_usage: {
    line_a: number;
    line_b: number;
    line_c: number;
  };
  generated_at: string;
}

export interface LaboratoryAnalytics {
  total_samples: number;
  completed_tests: number;
  pending_tests: number;
  instrument_usage_rate: number;
  test_type_distribution: {
    chemical: number;
    physical: number;
    microbiological: number;
    other: number;
  };
  turnaround_time: {
    avg_hours: number;
    max_hours: number;
    min_hours: number;
  };
  generated_at: string;
}

export interface ModuleAnalyticsData {
  [key: string]: unknown;
}

export interface ModuleAnalytics {
  rs?: ModuleAnalyticsData;
  lims?: ModuleAnalyticsData;
  qms?: ModuleAnalyticsData;
  ehs?: ModuleAnalyticsData;
  srm?: ModuleAnalyticsData;
  pdm?: ModuleAnalyticsData;
  [key: string]: ModuleAnalyticsData | undefined;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  host: string;
  database: string;
  port?: number;
  username?: string;
  connection_string?: string;
  last_sync?: string;
  data_volume?: number;
  sync_frequency?: string;
  description?: string;
  is_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComparisonAnalysisFilters {
  [key: string]: string | number | boolean | undefined;
}

export interface ComparisonAnalysis {
  id: string;
  name: string;
  description?: string;
  comparison_type: string;
  dimension_a: string;
  dimension_b: string;
  indicators: string[];
  filters?: ComparisonAnalysisFilters;
  status: 'draft' | 'running' | 'completed' | 'failed';
  last_run_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonResultSummary {
  [key: string]: unknown;
}

export interface ComparisonResult {
  id: string;
  comparison_id: string;
  status: 'success' | 'failed';
  data: Array<{
    indicator: string;
    value_a: number;
    value_b: number;
    difference: number;
    change_rate: number;
  }>;
  summary?: ComparisonResultSummary;
  generated_at: string;
}

export interface SyncRecord {
  id: string;
  data_source_id: string;
  data_source_name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  sync_type: string;
  records_count?: number;
  affected_records?: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export async function fetchDashboards() {
  return await apiClient.bi.get('/api/bi/dashboard');
}

export async function fetchDashboard(id: string) {
  return await apiClient.bi.get(`/api/bi/dashboard/${id}`);
}

export async function createDashboard(data: Partial<Dashboard>) {
  return await apiClient.bi.post('/api/bi/dashboard', data);
}

export async function updateDashboard(id: string, data: Partial<Dashboard>) {
  return await apiClient.bi.put(`/api/bi/dashboard/${id}`, data);
}

export async function deleteDashboard(id: string) {
  return await apiClient.bi.delete(`/api/bi/dashboard/${id}`);
}

export async function cloneDashboard(id: string) {
  return await apiClient.bi.post(`/api/bi/dashboard/${id}/clone`);
}

export async function fetchPublicDashboards() {
  return await apiClient.bi.get('/api/bi/dashboard/public');
}

export async function fetchUserDashboards(ownerId: string) {
  return await apiClient.bi.get(`/api/bi/dashboard/user/${ownerId}`);
}

export async function fetchDashboardTemplates() {
  return await apiClient.bi.get('/api/bi/dashboard/template');
}

export async function fetchDashboardTemplate(id: string) {
  return await apiClient.bi.get(`/api/bi/dashboard/template/${id}`);
}

export async function createDashboardTemplate(data: Partial<DashboardTemplate>) {
  return await apiClient.bi.post('/api/bi/dashboard/template', data);
}

export async function updateDashboardTemplate(id: string, data: Partial<DashboardTemplate>) {
  return await apiClient.bi.put(`/api/bi/dashboard/template/${id}`, data);
}

export async function deleteDashboardTemplate(id: string) {
  return await apiClient.bi.delete(`/api/bi/dashboard/template/${id}`);
}

export async function createDashboardFromTemplate(templateId: string, data: Partial<Dashboard>) {
  return await apiClient.bi.post(`/api/bi/dashboard/template/${templateId}/create`, data);
}

export async function fetchWidgets() {
  return await apiClient.bi.get('/api/bi/widget');
}

export async function fetchWidgetsByDashboard(dashboardId: string) {
  return await apiClient.bi.get(`/api/bi/widget/dashboard/${dashboardId}`);
}

export async function fetchWidget(id: string) {
  return await apiClient.bi.get(`/api/bi/widget/${id}`);
}

export async function createWidget(data: Partial<Widget>) {
  return await apiClient.bi.post('/api/bi/widget', data);
}

export async function updateWidget(id: string, data: Partial<Widget>) {
  return await apiClient.bi.put(`/api/bi/widget/${id}`, data);
}

export async function deleteWidget(id: string) {
  return await apiClient.bi.delete(`/api/bi/widget/${id}`);
}

export async function fetchWidgetData(id: string) {
  return await apiClient.bi.get(`/api/bi/widget/${id}/data`);
}

export async function fetchReports() {
  return await apiClient.bi.get('/api/analytics/report');
}

export async function fetchReport(id: string) {
  return await apiClient.bi.get(`/api/analytics/report/${id}`);
}

export async function createReport(data: Partial<Report>) {
  return await apiClient.bi.post('/api/analytics/report', data);
}

export async function updateReport(id: string, data: Partial<Report>) {
  return await apiClient.bi.put(`/api/analytics/report/${id}`, data);
}

export async function deleteReport(id: string) {
  return await apiClient.bi.delete(`/api/analytics/report/${id}`);
}

export async function fetchSummaryDashboard() {
  return await apiClient.bi.get('/api/bi/analytics/summary');
}

export async function fetchDevelopmentAnalytics() {
  return await apiClient.bi.get('/api/bi/analytics/development');
}

export async function fetchQualityAnalytics() {
  return await apiClient.bi.get('/api/bi/analytics/quality');
}

export async function fetchProductionAnalytics() {
  return await apiClient.bi.get('/api/bi/analytics/production');
}

export async function fetchLaboratoryAnalytics() {
  return await apiClient.bi.get('/api/bi/analytics/laboratory');
}

export async function fetchAnalyticsOverview() {
  return await apiClient.bi.get('/api/bi/analytics/overview');
}

export async function fetchModuleAnalytics(moduleId: string) {
  return await apiClient.bi.get(`/api/bi/analytics/${moduleId}`);
}

export async function fetchModuleData(moduleId: string) {
  const endpoints: Record<string, string> = {
    development: '/api/bi/rs/summary',
    quality: '/api/bi/qms/summary',
    production: '/api/bi/pdm/summary',
    laboratory: '/api/bi/lims/summary',
    ehs: '/api/bi/ehs/summary',
    srm: '/api/bi/srm/summary',
  };
  const endpoint = endpoints[moduleId] || `/api/bi/analytics/${moduleId}`;
  return await apiClient.bi.get(endpoint);
}

// 模块详细数据API
export async function fetchRsSummary() {
  return await apiClient.bi.get('/api/bi/rs/summary');
}

export async function fetchRsProjectTimeline() {
  return await apiClient.bi.get('/api/bi/rs/project-timeline');
}

export async function fetchRsExperimentSuccessRate() {
  return await apiClient.bi.get('/api/bi/rs/experiment-success-rate');
}

export async function fetchRsMaterialUsage() {
  return await apiClient.bi.get('/api/bi/rs/material-usage');
}

export async function fetchRsProjectRanking() {
  return await apiClient.bi.get('/api/bi/rs/project-ranking');
}

export async function fetchLimsSummary() {
  return await apiClient.bi.get('/api/bi/lims/summary');
}

export async function fetchLimsSampleTimeline() {
  return await apiClient.bi.get('/api/bi/lims/sample-timeline');
}

export async function fetchLimsTestPassRate() {
  return await apiClient.bi.get('/api/bi/lims/test-pass-rate');
}

export async function fetchLimsInstrumentUsage() {
  return await apiClient.bi.get('/api/bi/lims/instrument-usage');
}

export async function fetchLimsSampleStatusDistribution() {
  return await apiClient.bi.get('/api/bi/lims/sample-status-distribution');
}

export async function fetchQmsSummary() {
  return await apiClient.bi.get('/api/bi/qms/summary');
}

export async function fetchQmsQualityTrend() {
  return await apiClient.bi.get('/api/bi/qms/quality-trend');
}

export async function fetchQmsIssueDistribution() {
  return await apiClient.bi.get('/api/bi/qms/issue-distribution');
}

export async function fetchEhsSummary() {
  return await apiClient.bi.get('/api/bi/ehs/summary');
}

export async function fetchEhsRiskDistribution() {
  return await apiClient.bi.get('/api/bi/ehs/risk-distribution');
}

export async function fetchEhsIncidentTrend() {
  return await apiClient.bi.get('/api/bi/ehs/incident-trend');
}

export async function fetchSrmSummary() {
  return await apiClient.bi.get('/api/bi/srm/summary');
}

export async function fetchSrmSupplierRanking() {
  return await apiClient.bi.get('/api/bi/srm/supplier-ranking');
}

export async function fetchSrmOrderTimeline() {
  return await apiClient.bi.get('/api/bi/srm/order-timeline');
}

export async function fetchPdmSummary() {
  return await apiClient.bi.get('/api/bi/pdm/summary');
}

export async function fetchPdmProductionTrend() {
  return await apiClient.bi.get('/api/bi/pdm/production-trend');
}

export async function fetchPdmBatchStatusDistribution() {
  return await apiClient.bi.get('/api/bi/pdm/batch-status-distribution');
}

// 模块详细数据API
export async function fetchModuleDetailData(moduleId: string) {
  return await apiClient.bi.get(`/api/bi/${moduleId}`);
}

// 数据源管理API
export async function listDataSources(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
}) {
  return await apiClient.bi.get('/api/bi/data-sources', { params });
}

export async function getDataSource(id: string) {
  return await apiClient.bi.get(`/api/bi/data-sources/${id}`);
}

export async function createDataSource(data: Partial<DataSource>) {
  return await apiClient.bi.post('/api/bi/data-sources', data);
}

export async function updateDataSource(id: string, data: Partial<DataSource>) {
  return await apiClient.bi.put(`/api/bi/data-sources/${id}`, data);
}

export async function deleteDataSource(id: string) {
  return await apiClient.bi.delete(`/api/bi/data-sources/${id}`);
}

export async function testDataSource(id: string) {
  return await apiClient.bi.post(`/api/bi/data-sources/${id}/test`);
}

export async function refreshDataSource(id: string) {
  return await apiClient.bi.post(`/api/bi/data-sources/${id}/refresh`);
}

// 对比分析API
export async function listComparisons(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}) {
  return await apiClient.bi.get('/api/bi/comparison-analysis', { params });
}

export async function getComparison(id: string) {
  return await apiClient.bi.get(`/api/bi/comparison-analysis/${id}`);
}

export async function createComparison(data: Partial<ComparisonAnalysis>) {
  return await apiClient.bi.post('/api/bi/comparison-analysis', data);
}

export async function updateComparison(id: string, data: Partial<ComparisonAnalysis>) {
  return await apiClient.bi.put(`/api/bi/comparison-analysis/${id}`, data);
}

export async function deleteComparison(id: string) {
  return await apiClient.bi.delete(`/api/bi/comparison-analysis/${id}`);
}

export async function runComparison(id: string) {
  return await apiClient.bi.post(`/api/bi/comparison-analysis/${id}/run`);
}

export async function getComparisonResult(id: string) {
  return await apiClient.bi.get(`/api/bi/comparison-analysis/${id}/result`);
}

// 数据同步API
export async function listSyncRecords(params?: {
  page?: number;
  pageSize?: number;
  dataSourceId?: string;
  status?: string;
}) {
  return await apiClient.bi.get('/api/bi/sync-records', { params });
}

export async function getSyncRecord(id: string) {
  return await apiClient.bi.get(`/api/bi/sync-records/${id}`);
}

export async function deleteSyncRecord(id: string) {
  return await apiClient.bi.delete(`/api/bi/sync-records/${id}`);
}

export async function retrySync(id: string) {
  return await apiClient.bi.post(`/api/bi/sync-records/${id}/retry`);
}

export const biApi = {
  // Dashboard API
  fetchDashboards,
  fetchDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  cloneDashboard,
  fetchPublicDashboards,
  fetchUserDashboards,
  fetchDashboardTemplates,
  fetchDashboardTemplate,
  createDashboardTemplate,
  updateDashboardTemplate,
  deleteDashboardTemplate,
  createDashboardFromTemplate,
  // Widget API
  fetchWidgets,
  fetchWidgetsByDashboard,
  fetchWidget,
  createWidget,
  updateWidget,
  deleteWidget,
  fetchWidgetData,
  // Report API
  fetchReports,
  fetchReport,
  createReport,
  updateReport,
  deleteReport,
  // Analytics API
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
  fetchAnalyticsOverview,
  fetchModuleAnalytics,
  fetchModuleData,
  fetchModuleDetailData,
  // Module Detail API
  fetchRsSummary,
  fetchRsProjectTimeline,
  fetchRsExperimentSuccessRate,
  fetchRsMaterialUsage,
  fetchRsProjectRanking,
  fetchLimsSummary,
  fetchLimsSampleTimeline,
  fetchLimsTestPassRate,
  fetchLimsInstrumentUsage,
  fetchLimsSampleStatusDistribution,
  fetchQmsSummary,
  fetchQmsQualityTrend,
  fetchQmsIssueDistribution,
  fetchEhsSummary,
  fetchEhsRiskDistribution,
  fetchEhsIncidentTrend,
  fetchSrmSummary,
  fetchSrmSupplierRanking,
  fetchSrmOrderTimeline,
  fetchPdmSummary,
  fetchPdmProductionTrend,
  fetchPdmBatchStatusDistribution,
  // Data Source API
  listDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSource,
  refreshDataSource,
  // Comparison Analysis API
  listComparisons,
  getComparison,
  createComparison,
  updateComparison,
  deleteComparison,
  runComparison,
  getComparisonResult,
  // Sync Records API
  listSyncRecords,
  getSyncRecord,
  deleteSyncRecord,
  retrySync,
};

export default apiClient.bi;
