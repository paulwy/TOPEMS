import apiClient from '../client';
import type { Dataset, DatasetQueryParams, DatasetQueryResult } from './types';
import type { CrudOperations } from '@/hooks/useCrudQueries';

export async function listDatasets(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dataSourceId?: string;
}) {
  return await apiClient.bi.get('/datasets', { params });
}

export async function getDataset(id: string) {
  return await apiClient.bi.get(`/datasets/${id}`);
}

export async function createDataset(data: Partial<Dataset>) {
  return await apiClient.bi.post('/datasets', data);
}

export async function updateDataset(id: string, data: Partial<Dataset>) {
  return await apiClient.bi.put(`/datasets/${id}`, data);
}

export async function deleteDataset(id: string) {
  return await apiClient.bi.delete(`/datasets/${id}`);
}

export const datasetCrudApi: CrudOperations<Dataset> = {
  list: (params?) =>
    listDatasets({
      page: params?.page,
      pageSize: params?.pagesize,
      ...(params as any),
    }),
  get: getDataset,
  create: createDataset,
  update: updateDataset,
  delete: deleteDataset,
};

export async function queryDataset(params: DatasetQueryParams): Promise<DatasetQueryResult> {
  return await apiClient.bi.post('/datasets/query', params);
}

export async function testSqlQuery(dataSourceId: string, sql: string) {
  return await apiClient.bi.post(`/datasets/test-sql`, {
    data_source_id: dataSourceId,
    sql,
  });
}

export async function publishDataset(id: string) {
  return await apiClient.bi.post(`/datasets/${id}/publish`);
}

export async function refreshDataset(id: string) {
  return await apiClient.bi.post(`/datasets/${id}/refresh`);
}

export async function getDatasetPreview(id: string, limit?: number) {
  return await apiClient.bi.get(`/datasets/${id}/preview`, {
    params: { limit },
  });
}
