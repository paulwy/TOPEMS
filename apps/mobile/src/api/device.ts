import { apiClient } from './client';
import type { ApiResponse, DeviceInfo } from '@/types';

export const deviceApi = {
  getDevices: async (params: {
    page?: number;
    pageSize?: number;
    platform?: string;
    status?: string;
  }): Promise<ApiResponse<{ items: DeviceInfo[]; total: number }>> => {
    const response = await apiClient.get('/device', { params });
    return response.data;
  },

  getDeviceById: async (id: string): Promise<ApiResponse<DeviceInfo>> => {
    const response = await apiClient.get(`/device/${id}`);
    return response.data;
  },

  registerDevice: async (data: {
    deviceToken: string;
    platform: string;
    deviceModel?: string;
    appVersion?: string;
    osVersion?: string;
  }): Promise<ApiResponse<DeviceInfo>> => {
    const response = await apiClient.post('/device/register', data);
    return response.data;
  },

  updateDevice: async (
    id: string,
    data: {
      deviceToken?: string;
      appVersion?: string;
      osVersion?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<DeviceInfo>> => {
    const response = await apiClient.put(`/device/${id}`, data);
    return response.data;
  },

  unregisterDevice: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/device/${id}`);
    return response.data;
  },

  getMyDevices: async (): Promise<ApiResponse<DeviceInfo[]>> => {
    const response = await apiClient.get('/device/my');
    return response.data;
  },

  setActiveDevice: async (id: string): Promise<ApiResponse<DeviceInfo>> => {
    const response = await apiClient.post(`/device/${id}/activate`);
    return response.data;
  },

  disableDevice: async (id: string): Promise<ApiResponse<DeviceInfo>> => {
    const response = await apiClient.post(`/device/${id}/disable`);
    return response.data;
  },

  sendPushTest: async (id: string, message: string): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await apiClient.post(`/device/${id}/test-push`, { message });
    return response.data;
  },

  getDeviceStats: async (): Promise<ApiResponse<{
    total: number;
    active: number;
    ios: number;
    android: number;
  }>> => {
    const response = await apiClient.get('/device/stats');
    return response.data;
  },
};