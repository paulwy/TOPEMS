import apiClient from '../client';
import type { SyncRecord } from './types';

export async function listSyncRecords(params?: {
  page?: number;
  pageSize?: number;
  dataSourceId?: string;
  status?: string;
  syncType?: string;
  search?: string;
}) {
  return await apiClient.bi.get('/sync-records', { params });
}

export async function getSyncRecord(id: string) {
  return await apiClient.bi.get(`/sync-records/${id}`);
}

export async function createSyncRecord(data: Partial<SyncRecord>) {
  return await apiClient.bi.post('/sync-records', data);
}

export async function updateSyncRecord(id: string, data: Partial<SyncRecord>) {
  return await apiClient.bi.put(`/sync-records/${id}`, data);
}

export async function deleteSyncRecord(id: string) {
  return await apiClient.bi.delete(`/sync-records/${id}`);
}

export async function retrySync(id: string, note?: string) {
  return await apiClient.bi.post(`/sync-records/${id}/retry`, note ? { note } : {});
}
