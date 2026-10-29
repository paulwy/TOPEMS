import { apiClient } from '../client';
import type { ApiResponse } from '../client';

interface HrmSettingsResponse {
  category: string;
  settings: Record<string, string>;
}

export const hrmSettingsApi = {
  get: async (category: string): Promise<ApiResponse<HrmSettingsResponse>> => {
    return apiClient.hrm.get(`/settings/${category}`);
  },
  update: async (
    category: string,
    settings: Record<string, string>
  ): Promise<ApiResponse<HrmSettingsResponse>> => {
    return apiClient.hrm.put(`/settings/${category}`, { settings });
  },

  // ── v74 to_bind 补绑（2026-10-29）──
  createPosition: async (
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.hrm.post('/positions', data);
  },
};
