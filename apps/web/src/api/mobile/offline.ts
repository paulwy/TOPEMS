/**
 * Mobile · 离线同步 API 绑定
 *
 * 后端: svc/mobile/src/modules/offline_sync.rs + offline_records.rs
 * 路由（已注册 main.rs）:
 *   POST   /offline/sync-data
 *   GET    /offline/sync-status
 *   GET    /offline/sync-history
 *   GET    /offline/sync-policy
 *   PUT    /offline/sync-policy
 *   POST   /offline/retry-failed
 *   POST   /offline/records
 *   GET    /offline/records/pending
 *   POST   /offline/records/{id}/synced
 *   DELETE /offline/records/synced/clear
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed';
export type OperationType = 'create' | 'update' | 'delete';

export interface OfflineOperation {
  id: string;
  entity_type: string;
  entity_id?: string;
  operation_type: OperationType;
  data?: Record<string, unknown>;
  sync_status: SyncStatus;
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

export interface SyncPolicy {
  auto_sync: boolean;
  sync_interval_minutes: number;
  max_batch_size: number;
  retry_attempts: number;
  conflict_resolution: 'client_wins' | 'server_wins' | 'manual';
}

export interface SyncRequest {
  operations: OfflineOperation[];
  last_sync_time?: string;
}

export interface FailedOperation {
  operation_id: string;
  entity_type: string;
  entity_id?: string;
  error: string;
}

export interface SyncResponse {
  synced_count: number;
  failed_count: number;
  failed_operations: FailedOperation[];
  server_time: string;
  next_sync_time?: string;
}

export interface OfflineStatus {
  pending_count: number;
  syncing_count: number;
  synced_count: number;
  failed_count: number;
  last_sync_time?: string;
  sync_policy?: SyncPolicy;
}

export const offlineApi = {
  syncData: async (data: SyncRequest): Promise<ApiResponse<SyncResponse>> => {
    return apiClient.mobile.post('/offline/sync-data', data);
  },

  getSyncStatus: async (): Promise<ApiResponse<OfflineStatus>> => {
    return apiClient.mobile.get('/offline/sync-status');
  },

  getSyncHistory: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: OfflineOperation[]; total: number }>> => {
    return apiClient.mobile.get('/offline/sync-history', { params });
  },

  getSyncPolicy: async (): Promise<ApiResponse<SyncPolicy>> => {
    return apiClient.mobile.get('/offline/sync-policy');
  },

  updateSyncPolicy: async (data: Partial<SyncPolicy>): Promise<ApiResponse<SyncPolicy>> => {
    return apiClient.mobile.put('/offline/sync-policy', data);
  },

  retryFailedSync: async (): Promise<ApiResponse<SyncResponse>> => {
    return apiClient.mobile.post('/offline/retry-failed');
  },

  syncRecords: async (data: {
    operations: OfflineOperation[];
  }): Promise<ApiResponse<SyncResponse>> => {
    return apiClient.mobile.post('/offline/records', data);
  },

  getPendingRecords: async (): Promise<ApiResponse<OfflineOperation[]>> => {
    return apiClient.mobile.get('/offline/records/pending');
  },

  markRecordSynced: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.mobile.post(`/offline/records/${id}/synced`);
  },

  clearSynced: async (): Promise<ApiResponse<number>> => {
    return apiClient.mobile.delete('/offline/records/synced/clear');
  },
};

export default offlineApi;
