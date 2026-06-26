import apiClient from '../client';
import type { Dashboard, DashboardTemplate } from './types';

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
