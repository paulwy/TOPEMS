import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface RdSettingsResponse {
  category: string;
  settings: Record<string, string>;
}

export const rdSettingsApi = {
  async getSettings(category: string): Promise<ApiResponse<RdSettingsResponse>> {
    return apiClient.rd.get<RdSettingsResponse>(`/settings/${category}`);
  },

  async updateSettings(
    category: string,
    settings: Record<string, string>
  ): Promise<ApiResponse<RdSettingsResponse>> {
    return apiClient.rd.put<RdSettingsResponse>(`/settings/${category}`, { settings });
  },
};
