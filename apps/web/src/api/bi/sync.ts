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
  return await apiClient.bi.get('/api/bi/sync-records', { params });
}

export async function getSyncRecord(id: string) {
  return await apiClient.bi.get(`/api/bi/sync-records/${id}`);
}

export async function createSyncRecord(data: Partial<SyncRecord>) {
  return await apiClient.bi.post('/api/bi/sync-records', data);
}

export async function updateSyncRecord(id: string, data: Partial<SyncRecord>) {
  return await apiClient.bi.put(`/api/bi/sync-records/${id}`, data);
}

export async function deleteSyncRecord(id: string) {
  return await apiClient.bi.delete(`/api/bi/sync-records/${id}`);
}

export async function retrySync(id: string, note?: string) {
  return await apiClient.bi.post(`/api/bi/sync-records/${id}/retry`, note ? { note } : {});
}
