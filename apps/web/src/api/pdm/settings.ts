import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface PdmSettingsResponse {
  category: string;
  settings: Record<string, string>;
}

export const pdmSettingsApi = {
  async getSettings(category: string): Promise<ApiResponse<PdmSettingsResponse>> {
    return apiClient.pdm.get<PdmSettingsResponse>(`/settings/${category}`);
  },

  async updateSettings(
    category: string,
    settings: Record<string, string>
  ): Promise<ApiResponse<PdmSettingsResponse>> {
    return apiClient.pdm.put<PdmSettingsResponse>(`/settings/${category}`, { settings });
  },
};
