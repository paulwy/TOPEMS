import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../client';
import type {
  SyncRecord,
  CreateSyncRecordRequest,
  SyncRecordQueryParams,
  SyncResult,
  SyncDetailRecord,
} from './types';

export const syncRecordApi = {
  list: async (
    params?: SyncRecordQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SyncRecord>>> => {
    return apiClient.scm.get('/sync-records', { params });
  },

  create: async (data: CreateSyncRecordRequest): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.scm.post('/sync-records', data);
  },

  get: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.scm.get(`/sync-records/${id}`);
  },

  retry: async (id: string): Promise<ApiResponse<SyncResult>> => {
    return apiClient.scm.post(`/sync-records/${id}/retry`);
  },

  syncWithWms: async (syncType: string): Promise<ApiResponse<SyncResult>> => {
    return apiClient.scm.post(`/sync/wms/${syncType}`);
  },

  syncWithSrm: async (syncType: string): Promise<ApiResponse<SyncResult>> => {
    return apiClient.scm.post(`/sync/srm/${syncType}`);
  },

  details: async (
    syncId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<SyncDetailRecord>>> => {
    return apiClient.scm.get(`/sync-records/${syncId}/details`, { params });
  },
};
