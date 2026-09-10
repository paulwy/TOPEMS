import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface MesSettingsResponse {
  category: string;
  settings: Record<string, string>;
}

export const mesSettingsApi = {
  async getSettings(category: string): Promise<ApiResponse<MesSettingsResponse>> {
    return apiClient.mes.get<MesSettingsResponse>(`/settings/${category}`);
  },

  async updateSettings(
    category: string,
    settings: Record<string, string>
  ): Promise<ApiResponse<MesSettingsResponse>> {
    return apiClient.mes.put<MesSettingsResponse>(`/settings/${category}`, { settings });
  },
};
