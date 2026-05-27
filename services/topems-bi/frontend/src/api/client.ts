import axios from 'axios';
import type {
  Dashboard,
  Report,
  ApiResponse,
  SummaryDashboard,
  DevelopmentAnalytics,
  QualityAnalytics,
  ProductionAnalytics,
  LaboratoryAnalytics,
} from '../types';

const API_BASE = 'http://localhost:8012/api/v1';

const client = axios.create({
  baseURL: API_BASE,
});

export async function fetchDashboards(): Promise<ApiResponse<{ dashboards: Dashboard[] }>> {
  const response = await client.get('/dashboards');
  return response.data;
}

export async function fetchReports(): Promise<ApiResponse<{ reports: Report[] }>> {
  const response = await client.get('/reports');
  return response.data;
}

export async function fetchSummaryDashboard(): Promise<ApiResponse<SummaryDashboard>> {
  const response = await client.get('/analytics/summary');
  return response.data;
}

export async function fetchDevelopmentAnalytics(): Promise<ApiResponse<DevelopmentAnalytics>> {
  const response = await client.get('/analytics/development');
  return response.data;
}

export async function fetchQualityAnalytics(): Promise<ApiResponse<QualityAnalytics>> {
  const response = await client.get('/analytics/quality');
  return response.data;
}

export async function fetchProductionAnalytics(): Promise<ApiResponse<ProductionAnalytics>> {
  const response = await client.get('/analytics/production');
  return response.data;
}

export async function fetchLaboratoryAnalytics(): Promise<ApiResponse<LaboratoryAnalytics>> {
  const response = await client.get('/analytics/laboratory');
  return response.data;
}
