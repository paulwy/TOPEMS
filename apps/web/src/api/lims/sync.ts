import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { SyncRecord, SyncRecordQueryParams, PaginatedResult } from './types';

export const syncRecordApi = {
  listSyncRecords: async (
    params?: SyncRecordQueryParams
  ): Promise<ApiResponse<PaginatedResult<SyncRecord>>> => {
    return apiClient.lims.get('/sync-records', { params });
  },

  getSyncRecord: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.get(`/sync-records/${id}`);
  },

  deleteSyncRecord: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.lims.delete(`/sync-records/${id}`);
  },

  retrySync: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post(`/sync-records/${id}/retry`);
  },

  syncRecordToQms: async (recordId: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post('/sync/record-to-qms', { record_id: recordId });
  },

  syncReagentToEhs: async (reagentId: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post('/sync/reagent-to-ehs', { reagent_id: reagentId });
  },

  // ── v74 to_bind 补绑（2026-10-29）──
  createIntegrationSample: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.lims.post('/api/internal/lims/samples/integration', data);
  },

  createIntegrationTask: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.lims.post('/api/internal/lims/tasks/integration', data);
  },
};
