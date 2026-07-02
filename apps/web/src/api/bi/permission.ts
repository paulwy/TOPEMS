import apiClient from '../client';
import type { RowLevelPermission, DataPermissionRule } from './types';

export async function listRowLevelPermissions(params?: {
  page?: number;
  pageSize?: number;
  dataSourceId?: string;
}) {
  return await apiClient.bi.get('/permissions/row-level', { params });
}

export async function getRowLevelPermission(id: string) {
  return await apiClient.bi.get(`/permissions/row-level/${id}`);
}

export async function createRowLevelPermission(data: Partial<RowLevelPermission>) {
  return await apiClient.bi.post('/permissions/row-level', data);
}

export async function updateRowLevelPermission(id: string, data: Partial<RowLevelPermission>) {
  return await apiClient.bi.put(`/permissions/row-level/${id}`, data);
}

export async function deleteRowLevelPermission(id: string) {
  return await apiClient.bi.delete(`/permissions/row-level/${id}`);
}

export async function testRowLevelPermission(id: string) {
  return await apiClient.bi.post(`/permissions/row-level/${id}/test`);
}

export async function listDataPermissions(params?: { resourceType?: string; resourceId?: string }) {
  return await apiClient.bi.get('/permissions/data', { params });
}

export async function createDataPermission(data: Partial<DataPermissionRule>) {
  return await apiClient.bi.post('/permissions/data', data);
}

export async function updateDataPermission(id: string, data: Partial<DataPermissionRule>) {
  return await apiClient.bi.put(`/permissions/data/${id}`, data);
}

export async function deleteDataPermission(id: string) {
  return await apiClient.bi.delete(`/permissions/data/${id}`);
}

export async function checkPermission(
  resourceType: string,
  resourceId: string,
  permission: string
) {
  return await apiClient.bi.get('/permissions/check', {
    params: { resourceType, resourceId, permission },
  });
}
