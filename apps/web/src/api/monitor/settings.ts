import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 to_bind 补绑（2026-10-29）──
export const monitorSettingsApi = {
  listSettings: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.get('/settings');
  },

  batchUpdateSettings: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.put('/settings', data);
  },
};
