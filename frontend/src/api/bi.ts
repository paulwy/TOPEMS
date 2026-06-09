import apiClient from './client';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout?: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  config: any;
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

export interface ModuleAnalytics {
  rs?: any;
  lims?: any;
  qms?: any;
  ehs?: any;
  srm?: any;
  pdm?: any;
  [key: string]: any;
}

export async function fetchDashboards() {
  return await apiClient.bi.get('/api/v1/dashboards');
}

export async function fetchDashboard(id: string) {
  return await apiClient.bi.get(`/api/v1/dashboards/${id}`);
}

export async function createDashboard(data: Partial<Dashboard>) {
  return await apiClient.bi.post('/api/v1/dashboards', data);
}

export async function updateDashboard(id: string, data: Partial<Dashboard>) {
  return await apiClient.bi.put(`/api/v1/dashboards/${id}`, data);
}

export async function deleteDashboard(id: string) {
  return await apiClient.bi.delete(`/api/v1/dashboards/${id}`);
}

export async function fetchReports() {
  return await apiClient.bi.get('/api/v1/reports');
}

export async function fetchReport(id: string) {
  return await apiClient.bi.get(`/api/v1/reports/${id}`);
}

export async function createReport(data: Partial<Report>) {
  return await apiClient.bi.post('/api/v1/reports', data);
}

export async function updateReport(id: string, data: Partial<Report>) {
  return await apiClient.bi.put(`/api/v1/reports/${id}`, data);
}

export async function deleteReport(id: string) {
  return await apiClient.bi.delete(`/api/v1/reports/${id}`);
}

export async function fetchSummaryDashboard() {
  return await apiClient.bi.get('/api/v1/analytics/summary');
}

export async function fetchDevelopmentAnalytics() {
  return await apiClient.bi.get('/api/v1/analytics/development');
}

export async function fetchQualityAnalytics() {
  return await apiClient.bi.get('/api/v1/analytics/quality');
}

export async function fetchProductionAnalytics() {
  return await apiClient.bi.get('/api/v1/analytics/production');
}

export async function fetchLaboratoryAnalytics() {
  return await apiClient.bi.get('/api/v1/analytics/laboratory');
}

export async function fetchAnalyticsOverview() {
  return await apiClient.bi.get('/api/v1/analytics/overview');
}

export async function fetchModuleAnalytics(moduleId: string) {
  return await apiClient.bi.get(`/api/v1/analytics/${moduleId}`);
}

export async function fetchModuleData(moduleId: string, type: string) {
  const endpoints: Record<string, string> = {
    development: '/api/v1/bi/rs/summary',
    quality: '/api/v1/bi/qms/summary',
    production: '/api/v1/bi/pdm/summary',
    laboratory: '/api/v1/bi/lims/summary',
    ehs: '/api/v1/bi/ehs/summary',
    srm: '/api/v1/bi/srm/summary',
  };
  const endpoint = endpoints[moduleId] || `/api/v1/analytics/${moduleId}`;
  return await apiClient.bi.get(endpoint);
}

// 模块详细数据API
export async function fetchRsSummary() {
  return await apiClient.bi.get('/api/v1/bi/rs/summary');
}

export async function fetchRsProjectTimeline() {
  return await apiClient.bi.get('/api/v1/bi/rs/project-timeline');
}

export async function fetchRsExperimentSuccessRate() {
  return await apiClient.bi.get('/api/v1/bi/rs/experiment-success-rate');
}

export async function fetchRsMaterialUsage() {
  return await apiClient.bi.get('/api/v1/bi/rs/material-usage');
}

export async function fetchRsProjectRanking() {
  return await apiClient.bi.get('/api/v1/bi/rs/project-ranking');
}

export async function fetchLimsSummary() {
  return await apiClient.bi.get('/api/v1/bi/lims/summary');
}

export async function fetchLimsSampleTimeline() {
  return await apiClient.bi.get('/api/v1/bi/lims/sample-timeline');
}

export async function fetchLimsTestPassRate() {
  return await apiClient.bi.get('/api/v1/bi/lims/test-pass-rate');
}

export async function fetchLimsInstrumentUsage() {
  return await apiClient.bi.get('/api/v1/bi/lims/instrument-usage');
}

export async function fetchLimsSampleStatusDistribution() {
  return await apiClient.bi.get('/api/v1/bi/lims/sample-status-distribution');
}

export async function fetchQmsSummary() {
  return await apiClient.bi.get('/api/v1/bi/qms/summary');
}

export async function fetchQmsQualityTrend() {
  return await apiClient.bi.get('/api/v1/bi/qms/quality-trend');
}

export async function fetchQmsIssueDistribution() {
  return await apiClient.bi.get('/api/v1/bi/qms/issue-distribution');
}

export async function fetchEhsSummary() {
  return await apiClient.bi.get('/api/v1/bi/ehs/summary');
}

export async function fetchEhsRiskDistribution() {
  return await apiClient.bi.get('/api/v1/bi/ehs/risk-distribution');
}

export async function fetchEhsIncidentTrend() {
  return await apiClient.bi.get('/api/v1/bi/ehs/incident-trend');
}

export async function fetchSrmSummary() {
  return await apiClient.bi.get('/api/v1/bi/srm/summary');
}

export async function fetchSrmSupplierRanking() {
  return await apiClient.bi.get('/api/v1/bi/srm/supplier-ranking');
}

export async function fetchSrmOrderTimeline() {
  return await apiClient.bi.get('/api/v1/bi/srm/order-timeline');
}

export async function fetchPdmSummary() {
  return await apiClient.bi.get('/api/v1/bi/pdm/summary');
}

export async function fetchPdmProductionTrend() {
  return await apiClient.bi.get('/api/v1/bi/pdm/production-trend');
}

export async function fetchPdmBatchStatusDistribution() {
  return await apiClient.bi.get('/api/v1/bi/pdm/batch-status-distribution');
}

// 模块详细数据API
export async function fetchModuleDetailData(moduleId: string) {
  return await apiClient.bi.get(`/api/v1/bi/${moduleId}`);
}

export default apiClient.bi;
