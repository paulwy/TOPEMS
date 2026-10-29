import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 communication 2 条（2026-10-29）──
export const communicationReadApi = {
  listProjectGroups: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/im/project-groups'),
  unifiedSearchPois: async (data?: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.post('/pois/search', data ?? {}),
};