import apiClient from '../client';
import type { Dataset, DatasetQueryParams, DatasetQueryResult } from './types';

export async function listDatasets(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dataSourceId?: string;
}) {
  return await apiClient.bi.get('/api/bi/datasets', { params });
}

export async function getDataset(id: string) {
  return await apiClient.bi.get(`/api/bi/datasets/${id}`);
}

export async function createDataset(data: Partial<Dataset>) {
  return await apiClient.bi.post('/api/bi/datasets', data);
}

export async function updateDataset(id: string, data: Partial<Dataset>) {
  return await apiClient.bi.put(`/api/bi/datasets/${id}`, data);
}

export async function deleteDataset(id: string) {
  return await apiClient.bi.delete(`/api/bi/datasets/${id}`);
}

export async function queryDataset(params: DatasetQueryParams): Promise<DatasetQueryResult> {
  return await apiClient.bi.post('/api/bi/datasets/query', params);
}

export async function testSqlQuery(dataSourceId: string, sql: string) {
  return await apiClient.bi.post(`/api/bi/datasets/test-sql`, {
    data_source_id: dataSourceId,
    sql,
  });
}

export async function publishDataset(id: string) {
  return await apiClient.bi.post(`/api/bi/datasets/${id}/publish`);
}

export async function refreshDataset(id: string) {
  return await apiClient.bi.post(`/api/bi/datasets/${id}/refresh`);
}

export async function getDatasetPreview(id: string, limit?: number) {
  return await apiClient.bi.get(`/api/bi/datasets/${id}/preview`, {
    params: { limit },
  });
}
