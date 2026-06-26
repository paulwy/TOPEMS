import apiClient from '../client';

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

export async function fetchModuleDetailData(moduleId: string) {
  return await apiClient.bi.get(`/api/bi/${moduleId}`);
}
