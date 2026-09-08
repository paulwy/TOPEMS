import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'web' | 'iot';
export type DeviceStatus = 'online' | 'offline' | 'dnd';
export type DevicePlatform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';

export interface DeviceInfo {
  id: string;
  user_id: string;
  device_name: string;
  device_type: DeviceType;
  platform: DevicePlatform;
  os_version: string;
  app_version: string;
  model?: string;
  manufacturer?: string;
  device_id?: string;
  push_token?: string;
  last_active_at?: string;
  status: DeviceStatus;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterDeviceRequest {
  device_name: string;
  device_type: DeviceType;
  platform: DevicePlatform;
  os_version: string;
  app_version: string;
  model?: string;
  manufacturer?: string;
  device_id?: string;
  push_token?: string;
}

export interface UpdateDeviceRequest {
  device_name?: string;
  push_token?: string;
  status?: DeviceStatus;
  is_primary?: boolean;
}

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  country?: string;
  timestamp: string;
}

export interface DeviceStats {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  by_type: Record<DeviceType, number>;
  by_platform: Record<DevicePlatform, number>;
}

export const imDeviceApi = {
  registerDevice: async (data: RegisterDeviceRequest): Promise<ApiResponse<DeviceInfo>> => {
    return apiClient.im.post('/im/devices', data);
  },

  listMyDevices: async (params?: {
    type?: DeviceType;
    status?: DeviceStatus;
  }): Promise<ApiResponse<PaginatedResponse<DeviceInfo>>> => {
    return apiClient.im.get('/im/devices', { params });
  },

  getDevice: async (deviceId: string): Promise<ApiResponse<DeviceInfo>> => {
    return apiClient.im.get(`/im/devices/${deviceId}`);
  },

  updateDevice: async (
    deviceId: string,
    data: UpdateDeviceRequest
  ): Promise<ApiResponse<DeviceInfo>> => {
    return apiClient.im.put(`/im/devices/${deviceId}`, data);
  },

  deleteDevice: async (deviceId: string): Promise<ApiResponse<null>> => {
    return apiClient.im.delete(`/im/devices/${deviceId}`);
  },

  setPrimaryDevice: async (deviceId: string): Promise<ApiResponse<DeviceInfo>> => {
    return apiClient.im.put(`/im/devices/${deviceId}/primary`);
  },

  getDeviceLocation: async (deviceId: string): Promise<ApiResponse<DeviceLocation>> => {
    return apiClient.im.get(`/im/devices/${deviceId}/location`);
  },

  updateDeviceLocation: async (
    deviceId: string,
    data: DeviceLocation
  ): Promise<ApiResponse<DeviceLocation>> => {
    return apiClient.im.put(`/im/devices/${deviceId}/location`, data);
  },

  getDeviceStats: async (): Promise<ApiResponse<DeviceStats>> => {
    return apiClient.im.get('/im/devices/stats');
  },

  listUserDevices: async (userId: string): Promise<ApiResponse<PaginatedResponse<DeviceInfo>>> => {
    return apiClient.im.get(`/im/users/${userId}/devices`);
  },

  syncDeviceContacts: async (deviceId: string): Promise<ApiResponse<{ synced_count: number }>> => {
    return apiClient.im.post(`/im/devices/${deviceId}/sync-contacts`);
  },

  getDevicePushToken: async (deviceId: string): Promise<ApiResponse<{ push_token: string }>> => {
    return apiClient.im.get(`/im/devices/${deviceId}/push-token`);
  },

  rotateDevicePushToken: async (deviceId: string): Promise<ApiResponse<{ new_token: string }>> => {
    return apiClient.im.post(`/im/devices/${deviceId}/rotate-push-token`);
  },

  listDeviceSessions: async (
    deviceId: string
  ): Promise<
    ApiResponse<
      Array<{
        id: string;
        session_id: string;
        started_at: string;
        last_activity: string;
        ip_address: string;
        user_agent: string;
      }>
    >
  > => {
    return apiClient.im.get(`/im/devices/${deviceId}/sessions`);
  },

  revokeDeviceSessions: async (
    deviceId: string
  ): Promise<ApiResponse<{ revoked_count: number }>> => {
    return apiClient.im.post(`/im/devices/${deviceId}/revoke-sessions`);
  },
};
