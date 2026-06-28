import apiClient from '../client';
import type { RowLevelPermission, DataPermissionRule } from './types';

export async function listRowLevelPermissions(params?: {
  page?: number;
  pageSize?: number;
  dataSourceId?: string;
}) {
  return await apiClient.bi.get('/api/bi/permissions/row-level', { params });
}

export async function getRowLevelPermission(id: string) {
  return await apiClient.bi.get(`/api/bi/permissions/row-level/${id}`);
}

export async function createRowLevelPermission(data: Partial<RowLevelPermission>) {
  return await apiClient.bi.post('/api/bi/permissions/row-level', data);
}

export async function updateRowLevelPermission(id: string, data: Partial<RowLevelPermission>) {
  return await apiClient.bi.put(`/api/bi/permissions/row-level/${id}`, data);
}

export async function deleteRowLevelPermission(id: string) {
  return await apiClient.bi.delete(`/api/bi/permissions/row-level/${id}`);
}

export async function testRowLevelPermission(id: string) {
  return await apiClient.bi.post(`/api/bi/permissions/row-level/${id}/test`);
}

export async function listDataPermissions(params?: {
  resourceType?: string;
  resourceId?: string;
}) {
  return await apiClient.bi.get('/api/bi/permissions/data', { params });
}

export async function createDataPermission(data: Partial<DataPermissionRule>) {
  return await apiClient.bi.post('/api/bi/permissions/data', data);
}

export async function updateDataPermission(id: string, data: Partial<DataPermissionRule>) {
  return await apiClient.bi.put(`/api/bi/permissions/data/${id}`, data);
}

export async function deleteDataPermission(id: string) {
  return await apiClient.bi.delete(`/api/bi/permissions/data/${id}`);
}

export async function checkPermission(resourceType: string, resourceId: string, permission: string) {
  return await apiClient.bi.get('/api/bi/permissions/check', {
    params: { resourceType, resourceId, permission },
  });
}
