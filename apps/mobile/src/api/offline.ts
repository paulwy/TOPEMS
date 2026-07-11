import { apiClient } from './client';
import type { ApiResponse, OfflineSyncRecord } from '@/types';

export const offlineApi = {
  getSyncRecords: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ApiResponse<{ items: OfflineSyncRecord[]; total: number }>> => {
    return apiClient.get('/offline/sync-records', { params });
  },

  syncAll: async (): Promise<ApiResponse<{ success: number; failed: number }>> => {
    return apiClient.post('/offline/sync');
  },

  syncRecord: async (id: string): Promise<ApiResponse<OfflineSyncRecord>> => {
    return apiClient.post(`/offline/sync-records/${id}/sync`);
  },

  deleteRecord: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/offline/sync-records/${id}`);
  },

  clearFailed: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete('/offline/sync-records/failed');
  },

  getSyncStatus: async (): Promise<ApiResponse<{ isSyncing: boolean; lastSyncTime?: string }>> => {
    return apiClient.get('/offline/status');
  },
};