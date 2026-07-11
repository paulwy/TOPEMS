import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { SyncRecord, SyncRecordBackend } from './types';
import { adaptSyncRecordToFrontend } from './adapters';

export const syncApi = {
  listSyncRecords: async (params?: {
    syncType?: string;
    status?: string;
    sourceSystem?: string;
    targetSystem?: string;
  }): Promise<ApiResponse<SyncRecord[]>> => {
    const response = await apiClient.qms.get<{ records?: SyncRecordBackend[] }>('/sync-records', {
      params: {
        sync_type: params?.syncType,
        status: params?.status,
        source_system: params?.sourceSystem,
        target_system: params?.targetSystem,
      },
    });
    const adaptedData = (response.data?.records || []).map(adaptSyncRecordToFrontend);
    return { ...response, data: adaptedData };
  },

  getSyncRecord: async (id: string): Promise<ApiResponse<SyncRecord | undefined>> => {
    const response = await apiClient.qms.get<SyncRecordBackend>(`/sync-records/${id}`);
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },

  deleteSyncRecord: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/sync-records/${id}`);
  },

  retrySync: async (id: string): Promise<ApiResponse<SyncRecord | undefined>> => {
    const response = await apiClient.qms.post<SyncRecordBackend>(`/sync-records/${id}/retry`, {});
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },

  syncInspectionToLims: async (
    inspectionId: string
  ): Promise<ApiResponse<SyncRecord | undefined>> => {
    const response = await apiClient.qms.post<SyncRecordBackend>('/sync/inspection-to-lims', {
      inspection_id: inspectionId,
    });
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },

  syncIssueToEhs: async (issueId: string): Promise<ApiResponse<SyncRecord | undefined>> => {
    const response = await apiClient.qms.post<SyncRecordBackend>('/sync/issue-to-ehs', {
      issue_id: issueId,
    });
    return {
      ...response,
      data: response.data ? adaptSyncRecordToFrontend(response.data) : undefined,
    };
  },
};
