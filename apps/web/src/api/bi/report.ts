import apiClient from '../client';
import type { Report } from './types';

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
