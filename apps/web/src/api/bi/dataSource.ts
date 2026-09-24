import apiClient from '../client';
import type { DataSource } from './types';
import type { CrudOperations } from '@/hooks/useCrudQueries';

export async function listDataSources(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
}) {
  return await apiClient.bi.get('/data-sources', { params });
}

export async function getDataSource(id: string) {
  return await apiClient.bi.get(`/data-sources/${id}`);
}

export async function createDataSource(data: Partial<DataSource>) {
  return await apiClient.bi.post('/data-sources', data);
}

export async function updateDataSource(id: string, data: Partial<DataSource>) {
  return await apiClient.bi.put(`/data-sources/${id}`, data);
}

export async function deleteDataSource(id: string) {
  return await apiClient.bi.delete(`/data-sources/${id}`);
}

export async function testDataSource(id: string) {
  return await apiClient.bi.post(`/data-sources/${id}/test`);
}

export async function refreshDataSource(id: string) {
  return await apiClient.bi.post(`/data-sources/${id}/refresh`);
}

export const dataSourceCrudApi: CrudOperations<DataSource> = {
  list: (params?) =>
    listDataSources({
      page: params?.page as number,
      pageSize: params?.page_size as number,
      ...(params as unknown as Record<string, unknown>),
    }),
  get: getDataSource,
  create: createDataSource,
  update: updateDataSource,
  delete: deleteDataSource,
};
