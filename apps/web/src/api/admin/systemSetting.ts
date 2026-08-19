import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { SystemSetting, SystemConfig } from './types';

export const systemSettingApi = {
  listSettings: async (params?: {
    category?: string;
    search?: string;
  }): Promise<ApiResponse<SystemSetting[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    return apiClient.erp.get<SystemSetting[]>(`/system/settings?${queryParams.toString()}`);
  },

  getSetting: async (key: string): Promise<ApiResponse<SystemSetting>> => {
    return apiClient.erp.get<SystemSetting>(`/system/settings/${key}`);
  },

  createSetting: async (data: {
    key: string;
    value: string;
    description?: string;
    category: string;
  }): Promise<ApiResponse<SystemSetting>> => {
    return apiClient.erp.post<SystemSetting>('/system/settings', data);
  },

  updateSetting: async (
    key: string,
    data: {
      value?: string;
      description?: string;
      category?: string;
    }
  ): Promise<ApiResponse<SystemSetting>> => {
    return apiClient.erp.put<SystemSetting>(`/system/settings/${key}`, data);
  },

  deleteSetting: async (key: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete<string>(`/system/settings/${key}`);
  },

  batchUpdateSettings: async (
    settings: Record<string, string>
  ): Promise<ApiResponse<SystemSetting[]>> => {
    return apiClient.erp.put<SystemSetting[]>('/system/settings/batch', { settings });
  },

  getSystemConfig: async (): Promise<ApiResponse<SystemConfig>> => {
    return apiClient.core.get<SystemConfig>('/system/v1/config');
  },

  updateSystemConfig: async (data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> => {
    return apiClient.core.put<SystemConfig>('/system/v1/config', data);
  },
};

export default systemSettingApi;
