import { apiClient } from './client';
import type { ApiResponse, OfflineSyncRecord } from '@/types';

export interface MobileSyncRecord {
  id: string;
  module: string;
  action: string;
  data: Record<string, unknown>;
  createdAt: number;
}

export interface MobileSyncResponse {
  success: string[];
  failed: Array<{ id: string; error: string }>;
}

export const offlineApi = {
  getSyncRecords: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ApiResponse<{ items: OfflineSyncRecord[]; total: number }>> => {
    return apiClient.get('/api/core/sync/mobile/pending', { params });
  },

  syncRecords: async (records: MobileSyncRecord[]): Promise<ApiResponse<MobileSyncResponse>> => {
    return apiClient.post('/api/core/sync/mobile/sync', { records });
  },

  syncAll: async (): Promise<ApiResponse<{ success: number; failed: number }>> => {
    return apiClient.post('/api/core/sync/mobile/sync');
  },

  markAsSynced: async (recordId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/api/core/sync/mobile/records/${recordId}/synced`);
  },

  clearSynced: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete('/api/core/sync/mobile/records/synced/clear');
  },

  getSyncStatus: async (): Promise<ApiResponse<{ isSyncing: boolean; lastSyncTime?: string }>> => {
    return apiClient.get('/api/core/sync/statistics');
  },
};
