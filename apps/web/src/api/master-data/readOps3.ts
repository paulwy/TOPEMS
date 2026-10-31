import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待甄别二次收窄 master-data 4 条（2026-10-29）──
export const masterdataReadOps3 = {
  diffVersions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v54/version/diff'),
  diffVersions2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v54/version/diff'),
  createMetadata: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.post('/mdm-v60/metadata', data ?? {}),
  searchMetadata: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.master.get('/mdm-v60/metadata/search'),
};
