import apiClient from '../client';

export async function fetchSummaryDashboard() {
  return await apiClient.bi.get('/analytics/summary');
}

export async function fetchDevelopmentAnalytics() {
  return await apiClient.bi.get('/analytics/development');
}

export async function fetchQualityAnalytics() {
  return await apiClient.bi.get('/analytics/quality');
}

export async function fetchProductionAnalytics() {
  return await apiClient.bi.get('/analytics/production');
}

export async function fetchLaboratoryAnalytics() {
  return await apiClient.bi.get('/analytics/laboratory');
}

export async function fetchAnalyticsOverview() {
  return await apiClient.bi.get('/analytics/overview');
}

export async function fetchModuleAnalytics(moduleId: string) {
  return await apiClient.bi.get(`/analytics/${moduleId}`);
}

export async function fetchModuleData(moduleId: string) {
  const endpoints: Record<string, string> = {
    development: '/rs/summary',
    quality: '/qms/summary',
    production: '/pdm/summary',
    laboratory: '/lims/summary',
    ehs: '/ehs/summary',
    srm: '/srm/summary',
  };
  const endpoint = endpoints[moduleId] || `/analytics/${moduleId}`;
  return await apiClient.bi.get(endpoint);
}

export async function fetchRsSummary() {
  return await apiClient.bi.get('/rs/summary');
}

export async function fetchRsProjectTimeline() {
  return await apiClient.bi.get('/rs/project-timeline');
}

export async function fetchRsExperimentSuccessRate() {
  return await apiClient.bi.get('/rs/experiment-success-rate');
}

export async function fetchRsMaterialUsage() {
  return await apiClient.bi.get('/rs/material-usage');
}

export async function fetchRsProjectRanking() {
  return await apiClient.bi.get('/rs/project-ranking');
}

export async function fetchLimsSummary() {
  return await apiClient.bi.get('/lims/summary');
}

export async function fetchLimsSampleTimeline() {
  return await apiClient.bi.get('/lims/sample-timeline');
}

export async function fetchLimsTestPassRate() {
  return await apiClient.bi.get('/lims/test-pass-rate');
}

export async function fetchLimsInstrumentUsage() {
  return await apiClient.bi.get('/lims/instrument-usage');
}

export async function fetchLimsSampleStatusDistribution() {
  return await apiClient.bi.get('/lims/sample-status-distribution');
}

export async function fetchQmsSummary() {
  return await apiClient.bi.get('/qms/summary');
}

export async function fetchQmsQualityTrend() {
  return await apiClient.bi.get('/qms/quality-trend');
}

export async function fetchQmsIssueDistribution() {
  return await apiClient.bi.get('/qms/issue-distribution');
}

export async function fetchEhsSummary() {
  return await apiClient.bi.get('/ehs/summary');
}

export async function fetchEhsRiskDistribution() {
  return await apiClient.bi.get('/ehs/risk-distribution');
}

export async function fetchEhsIncidentTrend() {
  return await apiClient.bi.get('/ehs/incident-trend');
}

export async function fetchSrmSummary() {
  return await apiClient.bi.get('/srm/summary');
}

export async function fetchSrmSupplierRanking() {
  return await apiClient.bi.get('/srm/supplier-ranking');
}

export async function fetchSrmOrderTimeline() {
  return await apiClient.bi.get('/srm/order-timeline');
}

export async function fetchPdmSummary() {
  return await apiClient.bi.get('/pdm/summary');
}

export async function fetchPdmProductionTrend() {
  return await apiClient.bi.get('/pdm/production-trend');
}

export async function fetchPdmBatchStatusDistribution() {
  return await apiClient.bi.get('/pdm/batch-status-distribution');
}

export async function fetchModuleDetailData(moduleId: string) {
  return await apiClient.bi.get(`/${moduleId}`);
}
