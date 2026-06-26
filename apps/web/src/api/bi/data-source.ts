import apiClient from '../client';
import type { DataSource } from './types';

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
