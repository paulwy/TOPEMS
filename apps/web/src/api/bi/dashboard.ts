import apiClient from '../client';
import type { Dashboard, DashboardTemplate } from './types';

export async function fetchDashboards() {
  return await apiClient.bi.get('/dashboard');
}

export async function fetchDashboard(id: string) {
  return await apiClient.bi.get(`/dashboard/${id}`);
}

export async function createDashboard(data: Partial<Dashboard>) {
  return await apiClient.bi.post('/dashboard', data);
}

export async function updateDashboard(id: string, data: Partial<Dashboard>) {
  return await apiClient.bi.put(`/dashboard/${id}`, data);
}

export async function deleteDashboard(id: string) {
  return await apiClient.bi.delete(`/dashboard/${id}`);
}

export async function cloneDashboard(id: string) {
  return await apiClient.bi.post(`/dashboard/${id}/clone`);
}

export async function fetchPublicDashboards() {
  return await apiClient.bi.get('/dashboard/public');
}

export async function fetchUserDashboards(ownerId: string) {
  return await apiClient.bi.get(`/dashboard/user/${ownerId}`);
}

export async function fetchDashboardTemplates() {
  return await apiClient.bi.get('/dashboard/template');
}

export async function fetchDashboardTemplate(id: string) {
  return await apiClient.bi.get(`/dashboard/template/${id}`);
}

export async function createDashboardTemplate(data: Partial<DashboardTemplate>) {
  return await apiClient.bi.post('/dashboard/template', data);
}

export async function updateDashboardTemplate(id: string, data: Partial<DashboardTemplate>) {
  return await apiClient.bi.put(`/dashboard/template/${id}`, data);
}

export async function deleteDashboardTemplate(id: string) {
  return await apiClient.bi.delete(`/dashboard/template/${id}`);
}

export async function createDashboardFromTemplate(templateId: string, data: Partial<Dashboard>) {
  return await apiClient.bi.post(`/dashboard/template/${templateId}/create`, data);
}
