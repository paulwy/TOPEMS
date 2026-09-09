import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface HrmSettingsResponse {
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
};
