import apiClient from '../client';
import type { Widget } from './types';

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
