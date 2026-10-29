import apiClient from '../client';
import type { ApiResponse } from '../client';

interface PdmSettingsResponse {
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

  // ── v74 to_bind 补绑（2026-10-29）──
  async createConfiguration(
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return apiClient.pdm.post('/configurations', data);
  },
};
