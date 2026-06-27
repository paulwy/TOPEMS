import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { SyncRecord, SyncRecordQueryParams, PaginatedResult } from './types';

export const syncRecordApi = {
  listSyncRecords: async (
    params?: SyncRecordQueryParams
  ): Promise<ApiResponse<PaginatedResult<SyncRecord>>> => {
    return apiClient.lims.get('/api/lims/sync-records', { params });
  },

  getSyncRecord: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.get(`/api/lims/sync-records/${id}`);
  },

  deleteSyncRecord: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.lims.delete(`/api/lims/sync-records/${id}`);
  },

  retrySync: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post(`/api/lims/sync-records/${id}/retry`);
  },

  syncRecordToQms: async (recordId: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post('/api/lims/sync/record-to-qms', { record_id: recordId });
  },

  syncReagentToEhs: async (reagentId: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.lims.post('/api/lims/sync/reagent-to-ehs', { reagent_id: reagentId });
  },
};
