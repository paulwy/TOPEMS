import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateSyncRequest,
  ListQueryParams,
  PaginatedResponse,
  SyncConfig,
  SyncErrorDetail,
  SyncFieldMapping,
  SyncFilter,
  SyncRecord,
  SyncRecordDetail,
  SyncRecordListQueryParams,
  SyncRetryRequest,
} from './types';

export const syncApi = {
  listSyncRecords: async (
    params?: SyncRecordListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SyncRecord>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sync_type) queryParams.append('sync_type', params.sync_type);
    if (params?.source_system) queryParams.append('source_system', params.source_system);
    if (params?.target_system) queryParams.append('target_system', params.target_system);
    if (params?.entity_type) queryParams.append('entity_type', params.entity_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
  
    return apiClient.ehs.get<PaginatedResponse<SyncRecord>>(
      `/api/ehs/sync-records?${queryParams.toString()}`
    );
  },

  getSyncRecord: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.get<SyncRecord>(`/api/ehs/sync-records/${id}`);
  },

  createSync: async (data: CreateSyncRequest): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync', data);
  },

  retrySync: async (data: SyncRetryRequest): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync/retry', data);
  },

  syncToQMS: async (
    entityType: string,
    entityIds?: string[]
  ): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync/to-qms', {
      entity_type: entityType,
      entity_ids: entityIds,
    });
  },

  syncToLIMS: async (
    entityType: string,
    entityIds?: string[]
  ): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.ehs.post<SyncRecord>('/api/ehs/sync/to-lims', {
      entity_type: entityType,
      entity_ids: entityIds,
    });
  },

  listSyncRecordDetails: async (
    syncId: string,
    params?: ListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<SyncRecordDetail>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.status) queryParams.append('status', params.status);
  
    return apiClient.ehs.get<PaginatedResponse<SyncRecordDetail>>(
      `/api/ehs/sync-records/${syncId}/details?${queryParams.toString()}`
    );
  },

  listSyncConfigs: async (): Promise<ApiResponse<SyncConfig[]>> => {
    return apiClient.ehs.get<SyncConfig[]>('/api/ehs/sync/configs');
  },

  getSyncConfig: async (id: string): Promise<ApiResponse<SyncConfig>> => {
    return apiClient.ehs.get<SyncConfig>(`/api/ehs/sync/configs/${id}`);
  },
};

export default syncApi;
