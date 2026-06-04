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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8052/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchDashboards(): Promise<ApiResponse<{ dashboards: Dashboard[] }>> {
  const response = await client.get('/dashboards');
  return response.data;
}

export async function fetchDashboard(id: string): Promise<ApiResponse<Dashboard>> {
  const response = await client.get(`/dashboards/${id}`);
  return response.data;
}

export async function createDashboard(data: Partial<Dashboard>): Promise<ApiResponse<Dashboard>> {
  const response = await client.post('/dashboards', data);
  return response.data;
}

export async function updateDashboard(id: string, data: Partial<Dashboard>): Promise<ApiResponse<Dashboard>> {
  const response = await client.put(`/dashboards/${id}`, data);
  return response.data;
}

export async function deleteDashboard(id: string): Promise<ApiResponse<string>> {
  const response = await client.delete(`/dashboards/${id}`);
  return response.data;
}

export async function fetchReports(): Promise<ApiResponse<{ reports: Report[] }>> {
  const response = await client.get('/reports');
  return response.data;
}

export async function fetchReport(id: string): Promise<ApiResponse<Report>> {
  const response = await client.get(`/reports/${id}`);
  return response.data;
}

export async function createReport(data: Partial<Report>): Promise<ApiResponse<Report>> {
  const response = await client.post('/reports', data);
  return response.data;
}

export async function updateReport(id: string, data: Partial<Report>): Promise<ApiResponse<Report>> {
  const response = await client.put(`/reports/${id}`, data);
  return response.data;
}

export async function deleteReport(id: string): Promise<ApiResponse<string>> {
  const response = await client.delete(`/reports/${id}`);
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

export async function fetchAnalyticsOverview(): Promise<ApiResponse<any>> {
  const response = await client.get('/analytics/overview');
  return response.data;
}

export default client;