import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface ScmSettingsResponse {
  category: string;
  settings: Record<string, string>;
}

export const scmSettingsApi = {
  get: async (category: string): Promise<ApiResponse<ScmSettingsResponse>> => {
    return apiClient.scm.get(`/settings/${category}`);
  },

  update: async (
    category: string,
    settings: Record<string, string>
  ): Promise<ApiResponse<ScmSettingsResponse>> => {
    return apiClient.scm.put(`/settings/${category}`, { settings });
  },
};
